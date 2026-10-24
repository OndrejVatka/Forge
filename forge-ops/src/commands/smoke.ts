import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { requireValue, type OpsConfig } from '../config.js';
import { OpsError } from '../errors.js';

/** Tools an agent can't work without. A deploy missing any of them is broken. */
const REQUIRED_TOOLS = ['list_projects', 'list_tickets', 'get_ticket', 'create_ticket'];

const HEALTH_INTERVAL_MS = 5_000;

/**
 * Poll `/health` until it answers `{ status: 'ok' }`.
 *
 * @throws {OpsError} if it hasn't within `timeoutMs`.
 */
export async function waitForHealth(config: OpsConfig, timeoutMs = 120_000): Promise<void> {
  const url = `${requireValue(config.mcpUrl, 'FORGE_MCP_URL')}/health`;
  const deadline = Date.now() + timeoutMs;
  let lastProblem = 'no response';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const body = (await response.json()) as { status?: unknown };
      if (response.ok && body.status === 'ok') {
        console.log(`Health check passed: ${url}`);
        return;
      }
      lastProblem = `HTTP ${response.status}`;
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_INTERVAL_MS));
  }
  throw new OpsError(`Health check did not pass within ${timeoutMs / 1000}s (${lastProblem}).`);
}

/**
 * End-to-end check of the deployed MCP server, read-only so it leaves no
 * trace on the board:
 *  1. a request without a key is rejected (auth is still enforced);
 *  2. an authenticated client lists the tools and finds the required ones;
 *  3. `list_projects` succeeds, which exercises the server's database path.
 *
 * @throws {OpsError} naming the step that failed.
 */
export async function runSmoke(config: OpsConfig): Promise<void> {
  const base = requireValue(config.mcpUrl, 'FORGE_MCP_URL');
  const apiKey = requireValue(config.smokeApiKey, 'FORGE_SMOKE_API_KEY');
  const mcpUrl = new URL(`${base}/mcp`);

  const anonymous = await fetch(mcpUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  if (anonymous.status !== 401) {
    throw new OpsError(
      `Smoke: unauthenticated request got HTTP ${anonymous.status}, expected 401.`,
    );
  }

  const client = new Client({ name: 'forge-ops-smoke', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(mcpUrl, {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });
  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    const names = new Set(tools.map((tool) => tool.name));
    const missing = REQUIRED_TOOLS.filter((tool) => !names.has(tool));
    if (missing.length > 0) {
      throw new OpsError(`Smoke: deployed server is missing tools: ${missing.join(', ')}`);
    }

    const result = await client.callTool({ name: 'list_projects', arguments: {} });
    if (result.isError) {
      throw new OpsError('Smoke: list_projects returned an error.');
    }
    console.log(`Smoke test passed: ${tools.length} tools, list_projects OK.`);
  } catch (error) {
    if (error instanceof OpsError) throw error;
    const reason = error instanceof Error ? error.message : String(error);
    throw new OpsError(`Smoke: MCP call failed: ${reason}`);
  } finally {
    await client.close();
  }
}
