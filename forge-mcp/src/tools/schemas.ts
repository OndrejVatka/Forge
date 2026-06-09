import {
  commentAuthorSchema,
  prioritySchema,
  ticketCreatorSchema,
  ticketStatusSchema,
} from '@forge/shared';
import { z } from 'zod';

export const listProjectsSchema = z.object({});

export const createTicketSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  acceptance_criteria: z.string().optional(),
  priority: prioritySchema.default('medium'),
  tags: z.array(z.string()).optional(),
  created_by: ticketCreatorSchema.default('claude-code'),
});

export const listTicketsSchema = z.object({
  project_id: z.string().uuid().optional(),
  status: ticketStatusSchema.optional(),
  priority: prioritySchema.optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(200).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export const getTicketSchema = z.object({
  ticket_ref: z.string().min(1),
});

export const updateTicketSchema = z.object({
  ticket_ref: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  acceptance_criteria: z.string().optional(),
  priority: prioritySchema.optional(),
  tags: z.array(z.string()).optional(),
});

export const updateTicketStatusSchema = z.object({
  ticket_ref: z.string().min(1),
  status: ticketStatusSchema,
  comment: z.string().optional(),
});

export const addCommentSchema = z.object({
  ticket_ref: z.string().min(1),
  body: z.string().min(1),
  author: commentAuthorSchema.default('claude-code'),
});
