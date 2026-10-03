// Real SDK handshake and tools/list + tools/call, scoped to one request.
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');
const { z } = require('zod');
const literature = require('./literature');
const catalog = [
  { id: 'arxiv-live', name: 'arXiv 学术检索', category: '文献检索', desc: '通过官方 MCP SDK 调用真实 arXiv API', status: 'available', source: 'live', transport: 'in-memory' },
  { id: 'openalex-live', name: 'OpenAlex 学术检索', category: '文献检索', desc: '通过官方 MCP SDK 调用真实 OpenAlex API', status: 'available', source: 'live', transport: 'in-memory' },
];
async function session(id, action) {
  const descriptor = catalog.find((s) => s.id === id);
  if (!descriptor) throw new Error('MCP 服务未配置');
  const server = new McpServer({ name: id, version: '1.0.0' });
  server.registerTool('search_papers', { description: descriptor.desc, inputSchema: { query: z.string().min(1).max(500), limit: z.number().int().min(1).max(20).default(5) } }, async ({ query, limit }) => {
    const result = await literature.search({ query, limit, sources: [id === 'arxiv-live' ? 'arXiv' : 'OpenAlex'] });
    return { content: [{ type: 'text', text: JSON.stringify(result) }], isError: result.degraded && !result.items.length };
  });
  const client = new Client({ name: 'sciencex', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return await action(client);
  } finally { await client.close(); await server.close(); }
}
async function connect(id) {
  return session(id, async (client) => ({ ...catalog.find((s) => s.id === id), status: 'connected', tools: (await client.listTools()).tools, connection_scope: 'request' }));
}
async function call(id, name, args) {
  if (name !== 'search_papers') throw new Error('仅支持只读文献检索工具');
  return session(id, (client) => client.callTool({ name, arguments: args }, undefined, { timeout: 45000 }));
}
module.exports = { catalog, connect, call };
