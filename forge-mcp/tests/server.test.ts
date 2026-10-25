import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildMcpServer } from '../src/server.js';
import { FakeForgeRepository } from './fake-repository.js';

// Unlike tools.test.ts, these go through the real McpServer, so they cover the
// SDK's own argument validation and JSON Schema generation. Both depend on the
// SDK and the app agreeing on a zod major version (FO-23).

let client: Client;

beforeEach(async () => {
  const server = buildMcpServer(new FakeForgeRepository(), 'claude-code');
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'test', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterEach(async () => {
  await client.close();
});

function text(result: CallToolResult): string {
  return result.content.map((part) => (part.type === 'text' ? part.text : '')).join('\n');
}

describe('MCP server', () => {
  it('should advertise JSON Schemas generated from the zod shapes', async () => {
    const { tools } = await client.listTools();
    const createTicket = tools.find((tool) => tool.name === 'create_ticket');

    expect(createTicket?.inputSchema.required).toEqual(['project_id', 'title']);
    expect(createTicket?.inputSchema.properties?.project_id).toMatchObject({
      type: 'string',
      format: 'uuid',
    });
  });

  describe('when a tool is called with invalid arguments', () => {
    it('should return a validation error naming the field, and keep serving', async () => {
      const result = (await client.callTool({
        name: 'create_ticket',
        arguments: { project_id: 'not-a-uuid', title: 'x' },
      })) as CallToolResult;

      expect(result.isError).toBe(true);
      expect(text(result)).toMatch(/project_id/);

      const next = (await client.callTool({
        name: 'list_projects',
        arguments: {},
      })) as CallToolResult;
      expect(next.isError).toBeFalsy();
    });

    it('should reject an oversized limit rather than clamping it', async () => {
      const result = (await client.callTool({
        name: 'list_tickets',
        arguments: { limit: 100_000 },
      })) as CallToolResult;

      expect(result.isError).toBe(true);
      expect(text(result)).toMatch(/limit/);
    });
  });
});
