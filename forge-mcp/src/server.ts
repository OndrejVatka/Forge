import { McpServer, type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { z, ZodObject, ZodRawShape } from 'zod';
import type { ForgeRepository } from './db/repository.js';
import { AppError } from './errors.js';
import { addCommentTool } from './tools/add-comment.js';
import { createTicketTool } from './tools/create-ticket.js';
import { getTicketTool } from './tools/get-ticket.js';
import { listProjectsTool } from './tools/list-projects.js';
import { listTicketsTool } from './tools/list-tickets.js';
import type { ForgeTool } from './tools/types.js';
import { updateTicketStatusTool } from './tools/update-ticket-status.js';
import { updateTicketTool } from './tools/update-ticket.js';

export const SERVER_NAME = 'forge';
export const SERVER_VERSION = '0.1.0';

/**
 * Build a fully-configured MCP server with all Forge tools registered and
 * wired to the given repository. A fresh instance is created per request in
 * the stateless HTTP transport.
 */
export function buildMcpServer(repo: ForgeRepository): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  registerTool(server, listProjectsTool(repo));
  registerTool(server, createTicketTool(repo));
  registerTool(server, listTicketsTool(repo));
  registerTool(server, getTicketTool(repo));
  registerTool(server, updateTicketTool(repo));
  registerTool(server, updateTicketStatusTool(repo));
  registerTool(server, addCommentTool(repo));

  return server;
}

/**
 * Register one tool, translating thrown errors into MCP tool errors. Known
 * `AppError`s surface their message; anything else is logged server-side and
 * returned as a generic message so internals never leak to the caller.
 */
function registerTool<Shape extends ZodRawShape>(server: McpServer, tool: ForgeTool<Shape>): void {
  // The SDK validates `args` against the same shape before invoking us, so we
  // cast it to our inferred input type. The callback cast bridges to the SDK's
  // `ToolCallback<Shape>`, a conditional type TS can't resolve over a generic
  // shape parameter — this boundary is the one place that needs it.
  const callback = async (args: unknown): Promise<CallToolResult> => {
    try {
      return await tool.handler(args as z.infer<ZodObject<Shape>>);
    } catch (error) {
      // Surface meaningful client errors (not-found, validation) to the agent;
      // mask server/infra errors behind a generic message and log the detail.
      if (error instanceof AppError && error.statusCode < 500) {
        return { isError: true, content: [{ type: 'text', text: error.message }] };
      }
      console.error(`[forge-mcp] tool ${tool.name} failed:`, error);
      return {
        isError: true,
        content: [{ type: 'text', text: 'Internal error processing the request.' }],
      };
    }
  };

  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: tool.schema.shape },
    callback as unknown as ToolCallback<Shape>,
  );
}
