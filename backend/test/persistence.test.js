/** B1/B6：存储层写队列与原子写测试（互斥顺序、失败不阻塞、并发落盘完整性） */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
process.env.SCIENCEX_SKIP_ENV_FILE = 'true';
const { createPersistence } = require('../src/lib/persistence');

function memoryIo() {
  const files = new Map();
  let openCalls = 0;
  let renameCalls = 0;
  const io = {
    files,
    hooks: {},
    async mkdir() {},
    async open(file, flags, mode) {
      openCalls += 1;
      if (io.hooks.beforeOpen) io.hooks.beforeOpen(file);
      const chunks = [];
      return {
        async writeFile(data) { chunks.push(Buffer.from(data, 'utf8')); },
        async sync() {},
        async close() { if (chunks.length) files.set(file, Buffer.concat(chunks).toString('utf8')); },
      };
    },
    async rename(from, to) { renameCalls += 1; files.set(to, files.get(from)); files.delete(from); },
    async unlink(file) { files.delete(file); },
  };
  io.openCalls = () => openCalls;
  io.renameCalls = () => renameCalls;
  return io;
}

test('并发 persist 按入队次序串行写入，最终内容为最后一次快照', async () => {
  const io = memoryIo();
  const state = { items: [] };
  const { persist, flush } = createPersistence('/tmp/store.json', () => state, io);
  const writes = [];
  for (let i = 0; i < 20; i += 1) {
    state.items = Array.from({ length: i + 1 }, (_, n) => n);
    writes.push(persist().catch(() => {}));
  }
  await Promise.all(writes);
  await flush();
  const saved = JSON.parse(io.files.get('/tmp/store.json'));
  assert.deepEqual(saved.items, Array.from({ length: 20 }, (_, n) => n));
  assert.equal(io.renameCalls(), 20, '每次写入都应经过一次原子 rename');
  assert.equal([...io.files.keys()].filter((name) => name.endsWith('.tmp')).length, 0, '临时文件应全部清理');
});

test('单次写入失败会向调用者 reject，但不阻塞队列后续写入', async () => {
  const io = memoryIo();
  let attempt = 0;
  io.hooks.beforeOpen = () => { attempt += 1; if (attempt === 1) throw new Error('disk full'); };
  const state = { v: 1 };
  const { persist } = createPersistence('/tmp/store2.json', () => state, io);
  state.v = 2;
  await assert.rejects(persist(), /disk full/);
  state.v = 3;
  await persist();
  assert.equal(JSON.parse(io.files.get('/tmp/store2.json')).v, 3);
});

test('快照序列化异常直接 reject，不污染队列', async () => {
  const circular = {};
  circular.self = circular;
  const { persist } = createPersistence('/tmp/store3.json', () => circular, memoryIo());
  await assert.rejects(persist(), TypeError);
});

test('真实磁盘并发写：文件始终为完整 JSON，无半写损坏', async () => {
  const dir = path.join(os.tmpdir(), `sciencex-persist-${process.pid}`);
  const file = path.join(dir, 'store.json');
  const state = { seq: [] };
  const { persist, flush } = createPersistence(file, () => state, fsp);
  const writes = [];
  for (let i = 0; i < 15; i += 1) {
    state.seq = Array.from({ length: 200 }, (_, n) => `${i}-${n}`);
    writes.push(persist().catch(() => {}));
  }
  await Promise.all(writes);
  await flush();
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(file, 'utf8')), '落盘文件必须可解析');
  const final = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(final.seq[0].split('-')[0], '14', '最后写入应覆盖前面所有写入');
  assert.equal(fs.readdirSync(dir).filter((name) => name.endsWith('.tmp')).length, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('store.persist 并发调用共享同一队列且全部成功', async () => {
  const dir = path.join(os.tmpdir(), `sciencex-store-persist-${process.pid}`);
  process.env.SCIENCEX_DATA_DIR = dir;
  const store = require('../src/lib/store');
  store.projects.push({ id: 'p-concurrent', name: '并发测试', owner_ids: [store.users[0]?.id || 'u1'], type: 'test', description: '', created_at: store.now() });
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => store.persist()));
  assert.ok(results.every((r) => r.status === 'fulfilled'), '并发 persist 不应有失败');
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'store.json'), 'utf8'));
  assert.ok(saved.projects.some((p) => p.id === 'p-concurrent'), '最终文件应包含最新写入');
  store.projects.splice(store.projects.findIndex((p) => p.id === 'p-concurrent'), 1);
  fs.rmSync(dir, { recursive: true, force: true });
});
