import 'dotenv/config';
import type { AgentIdentity } from '@forge/shared';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import cors from 'cors';
import express from 'express';
import { createAgentResolver } from './auth.js';
import { createSupabaseRepository } from './db/repository.js';
import { loadEnv } from './env.js';
import { buildMcpServer } from './server.js';
import { createSupabaseClient } from './supabase.js';

const env = loadEnv();
const repository = createSupabaseRepository(createSupabaseClient(env));
const resolveAgent = createAgentResolver(env.agentKeys);

const app = express();
app.use(cors());
app.use(express.json());

// Unauthenticated health check for Railway.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// MCP endpoint (stateless Streamable HTTP). A fresh server + transport is
// created per request; `enableJsonResponse` returns plain JSON rather than SSE,
// which suits a request/response tool server. Building per request is also what
// lets the authenticated identity be baked into the tools.
async function handleMcpRequest(
  req: express.Request,
  res: express.Response,
  agent: AgentIdentity,
): Promise<void> {
  const server = buildMcpServer(repository, agent);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on('close', () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

app.post('/mcp', (req, res) => {
  const agent = resolveAgent(req.header('authorization'));
  if (!agent) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  void handleMcpRequest(req, res, agent).catch((error: unknown) => {
    console.error('[forge-mcp] request handling failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
});

// Stateless mode has no server-initiated streams or sessions to manage.
const methodNotAllowed = (_req: express.Request, res: express.Response): void => {
  res.status(405).json({ error: 'Method Not Allowed' });
};
app.get('/mcp', methodNotAllowed);
app.delete('/mcp', methodNotAllowed);

app.listen(env.PORT, () => {
  console.log(`[forge-mcp] listening on :${env.PORT}`);
});
