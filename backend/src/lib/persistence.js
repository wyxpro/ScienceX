const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

// 同一实例按快照入队次序写入；失败不阻塞后续重试，调用者必须处理失败。
function createPersistence(file, snapshot, io = fs) {
  let queue = Promise.resolve();
  function persist() {
    let serialized;
    try { serialized = JSON.stringify(snapshot()); } catch (error) { return Promise.reject(error); }
    const write = queue.then(async () => {
      await io.mkdir(path.dirname(file), { recursive: true });
      const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
      let handle;
      try {
        handle = await io.open(temporary, 'wx', 0o600);
        await handle.writeFile(serialized, 'utf8');
        await handle.sync();
        await handle.close();
        handle = null;
        await io.rename(temporary, file);
      } finally {
        if (handle) await handle.close().catch(() => {});
        await io.unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; });
      }
    });
    queue = write.catch(() => {});
    return write;
  }
  return { persist, flush: () => queue };
}

module.exports = { createPersistence };
