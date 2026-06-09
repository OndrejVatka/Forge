import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Wrap a serializable payload as an MCP tool result. Data is returned as
 * pretty-printed JSON text — the format agents reliably parse.
 */
export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}
