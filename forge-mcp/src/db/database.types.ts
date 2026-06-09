/**
 * Minimal hand-written Supabase `Database` type for the typed client.
 *
 * Mirrors `db/schema.sql`. We only model the tables/functions the MCP server
 * actually touches, and rely on flat queries (no typed nested joins) so this
 * stays maintainable without the generated `Relationships` machinery. Once a
 * Supabase project exists this can be replaced by `supabase gen types`.
 */
import type { Project, Tag, Ticket, Comment } from '@forge/shared';

/**
 * Supabase's `GenericTable.Row` must be assignable to `Record<string, unknown>`.
 * A named `interface` is NOT (it lacks an implicit index signature), so we map
 * each domain interface through this homomorphic alias to get an equivalent
 * anonymous object type that satisfies the constraint without duplicating fields.
 */
type Tabular<T> = { [K in keyof T]: T[K] };

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Tabular<Project>;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          prefix: string;
          color?: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
        Relationships: [];
      };
      tags: {
        Row: Tabular<Tag>;
        Insert: { id?: string; name: string; color?: string };
        Update: Partial<Database['public']['Tables']['tags']['Insert']>;
        Relationships: [];
      };
      tickets: {
        Row: Tabular<Ticket>;
        Insert: {
          id?: string;
          project_id: string;
          ticket_number: number;
          ticket_ref: string;
          title: string;
          description?: string | null;
          acceptance_criteria?: string | null;
          status?: Ticket['status'];
          priority?: Ticket['priority'];
          created_by?: Ticket['created_by'];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>;
        Relationships: [];
      };
      ticket_tags: {
        Row: { ticket_id: string; tag_id: string };
        Insert: { ticket_id: string; tag_id: string };
        Update: Partial<{ ticket_id: string; tag_id: string }>;
        Relationships: [];
      };
      comments: {
        Row: Tabular<Comment>;
        Insert: {
          id?: string;
          ticket_id: string;
          body: string;
          author?: Comment['author'];
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['comments']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      next_ticket_number: {
        Args: { p_project_id: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
