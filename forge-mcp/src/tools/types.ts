import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { z, ZodObject, ZodRawShape } from 'zod';

/**
 * A Forge MCP tool: its name, agent-facing description, Zod input schema, and a
 * handler that receives already-parsed input. Keeping the schema as a
 * `ZodObject` lets us pass `.shape` to the SDK and reuse `z.infer` for the
 * handler signature and tests.
 */
export interface ForgeTool<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  schema: ZodObject<Shape>;
  handler: (input: z.infer<ZodObject<Shape>>) => Promise<CallToolResult>;
}
