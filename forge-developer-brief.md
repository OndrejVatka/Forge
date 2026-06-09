# Forge — Developer Brief
### AI-Native Project Management for Claude Code & Codex
**Version:** 1.0  
**Author:** Ondřej (via Claude)  
**Date:** June 2026

---

## 1. Project Overview

Forge is a lightweight, hosted Kanban-style project management tool designed specifically for developers working with AI coding agents (Claude Code, Codex). It exposes an MCP (Model Context Protocol) server so AI agents can natively read and write tickets — creating stories, moving them through the board, and logging activity — without any manual intervention. A mobile-friendly React PWA provides the human-facing interface.

**The core workflow:**
1. Developer discusses a new feature with Claude Code
2. Claude Code creates a ticket in the backlog via MCP tools
3. Developer picks the next ticket from the board (web UI or mobile)
4. Claude Code moves it to "In Development" and starts work
5. Claude Code logs progress via comments on the ticket
6. Developer reviews and closes the ticket

---

## 2. Tech Stack

| Layer | Technology | Hosting | Cost |
|---|---|---|---|
| Database + Auth | Supabase (Postgres) | Supabase cloud | Free tier |
| MCP Server | Node.js + Express | Railway | ~$5/mo (Hobby) |
| Web UI | React + Vite (PWA) | Vercel | Free tier |
| Auth provider | Supabase Auth (Google OAuth) | — | Free |

---

## 3. Database Schema

Run the following SQL in Supabase SQL Editor to set up the full schema.

```sql
-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,           -- e.g. "proofindex", "second-brain"
  prefix TEXT NOT NULL UNIQUE,         -- e.g. "PI", "SB" — used in ticket IDs
  color TEXT NOT NULL DEFAULT '#6366f1', -- hex color for UI badge
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket sequence counter per project (for PI-42 style IDs)
CREATE TABLE project_ticket_sequences (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Tags (global, not per-project)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- e.g. "feature", "bug", "chore"
  color TEXT NOT NULL DEFAULT '#94a3b8' -- hex color for UI chip
);

-- Seed default tags
INSERT INTO tags (name, color) VALUES
  ('feature',     '#6366f1'),
  ('bug',         '#ef4444'),
  ('chore',       '#f59e0b'),
  ('improvement', '#10b981'),
  ('research',    '#3b82f6'),
  ('urgent',      '#dc2626');

-- Tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ticket_number INTEGER NOT NULL,       -- auto-incremented per project
  ticket_ref TEXT NOT NULL UNIQUE,      -- e.g. "PI-42" — computed on insert
  title TEXT NOT NULL,
  description TEXT,                     -- markdown supported
  acceptance_criteria TEXT,             -- markdown supported
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'in_dev', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  created_by TEXT NOT NULL DEFAULT 'human'
    CHECK (created_by IN ('human', 'claude-code', 'codex')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique ticket number per project
ALTER TABLE tickets ADD CONSTRAINT tickets_project_number_unique
  UNIQUE (project_id, ticket_number);

-- Ticket <-> Tag join table
CREATE TABLE ticket_tags (
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

-- Comments / Activity log
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  body TEXT NOT NULL,                   -- markdown supported
  author TEXT NOT NULL DEFAULT 'human'
    CHECK (author IN ('human', 'claude-code', 'codex', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on tickets
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to get next ticket number for a project (atomic)
CREATE OR REPLACE FUNCTION next_ticket_number(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  INSERT INTO project_ticket_sequences (project_id, last_number)
    VALUES (p_project_id, 1)
    ON CONFLICT (project_id)
    DO UPDATE SET last_number = project_ticket_sequences.last_number + 1
    RETURNING last_number INTO next_num;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;
```

### Row Level Security (RLS)

Enable RLS on all tables. The MCP server uses a service role key (bypasses RLS). The web UI uses the anon key with the following policies:

```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Authenticated users (logged-in via Google) can read/write everything
CREATE POLICY "auth_full_access" ON projects FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_full_access" ON tickets FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_full_access" ON tags FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_full_access" ON ticket_tags FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_full_access" ON comments FOR ALL TO authenticated USING (true);
```

---

## 4. MCP Server

### Overview

A Node.js + Express server that implements the MCP protocol, exposing tools for Claude Code and Codex to interact with FlowBoard. Secured with an API key passed as a Bearer token.

### Environment Variables

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MCP_API_KEY=your-secret-api-key          # Claude Code sets this as env var
```

### Project Structure

```
flowboard-mcp/
├── src/
│   ├── index.js           # Express entry point + MCP handler
│   ├── auth.js            # API key middleware
│   ├── supabase.js        # Supabase client (service role)
│   └── tools/
│       ├── list_projects.js
│       ├── create_ticket.js
│       ├── list_tickets.js
│       ├── get_ticket.js
│       ├── update_ticket.js
│       ├── update_ticket_status.js
│       └── add_comment.js
├── package.json
└── railway.json
```

### MCP Tools Specification

The server exposes the following 7 tools via the MCP protocol:

---

#### `list_projects`
Returns all projects.

**Input schema:** none

**Returns:**
```json
[
  {
    "id": "uuid",
    "name": "ProofIndex",
    "slug": "proofindex",
    "prefix": "PI",
    "color": "#6366f1",
    "description": "AI-powered geographic income displacement risk scoring"
  }
]
```

---

#### `create_ticket`
Creates a new ticket in the backlog of a given project.

**Input schema:**
```json
{
  "project_id": "string (UUID) — required",
  "title": "string — required",
  "description": "string (markdown) — optional",
  "acceptance_criteria": "string (markdown) — optional",
  "priority": "low | medium | high — default: medium",
  "tags": ["string (tag name, e.g. 'feature', 'bug') — optional array"],
  "created_by": "human | claude-code | codex — default: claude-code"
}
```

**Behaviour:**
1. Call `next_ticket_number(project_id)` to get the next sequential number
2. Compute `ticket_ref` as `{project.prefix}-{number}` (e.g. `PI-42`)
3. Insert ticket with `status = 'backlog'`
4. Resolve tag names to IDs and insert into `ticket_tags`
5. Insert a `system` comment: `"Ticket created by {created_by}"`

**Returns:** Full ticket object including `ticket_ref`

---

#### `list_tickets`
Returns tickets with optional filters.

**Input schema:**
```json
{
  "project_id": "string (UUID) — optional",
  "status": "backlog | in_dev | review | done — optional",
  "priority": "low | medium | high — optional",
  "tags": ["string (tag name) — optional, filter by ANY of these tags"],
  "limit": "integer — default: 50",
  "offset": "integer — default: 0"
}
```

**Returns:** Array of ticket objects with tags array included. Ordered by `created_at DESC`.

---

#### `get_ticket`
Returns a single ticket with full details including all comments.

**Input schema:**
```json
{
  "ticket_ref": "string — e.g. 'PI-42'"
}
```

**Returns:** Full ticket object + `comments` array (ordered by `created_at ASC`) + `tags` array

---

#### `update_ticket`
Updates ticket fields (title, description, acceptance criteria, priority, tags).

**Input schema:**
```json
{
  "ticket_ref": "string — required",
  "title": "string — optional",
  "description": "string — optional",
  "acceptance_criteria": "string — optional",
  "priority": "low | medium | high — optional",
  "tags": ["string — optional, replaces existing tags entirely"]
}
```

**Behaviour:** On any update, insert a `system` comment summarising what changed (e.g. `"Priority changed from medium to high by claude-code"`).

**Returns:** Updated ticket object

---

#### `update_ticket_status`
Moves a ticket to a different status column.

**Input schema:**
```json
{
  "ticket_ref": "string — required",
  "status": "backlog | in_dev | review | done — required",
  "comment": "string — optional, adds a comment alongside the status change"
}
```

**Behaviour:**
1. Update ticket status
2. Insert a `system` comment: `"Status changed to {status}"` (append user comment if provided)

**Returns:** Updated ticket object

---

#### `add_comment`
Adds a comment to a ticket's activity log.

**Input schema:**
```json
{
  "ticket_ref": "string — required",
  "body": "string (markdown) — required",
  "author": "human | claude-code | codex | system — default: claude-code"
}
```

**Returns:** Created comment object

---

### Authentication

All requests must include:
```
Authorization: Bearer {MCP_API_KEY}
```

Return `401 Unauthorized` if missing or invalid.

### Railway Deployment

`railway.json`:
```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "node src/index.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

Add all environment variables in Railway dashboard under Variables.

---

## 5. Web UI (React PWA)

### Overview

A mobile-first React PWA deployed on Vercel. Login via Google (Supabase Auth). Primary view is a Kanban board per project with drag-and-drop columns.

### Project Structure

```
flowboard-ui/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/                 # App icons (192, 512px)
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── lib/
│   │   └── supabase.js        # Supabase anon client
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Board.jsx          # Main Kanban view
│   │   ├── TicketDetail.jsx
│   │   └── Settings.jsx       # Manage projects + tags
│   ├── components/
│   │   ├── Column.jsx
│   │   ├── TicketCard.jsx
│   │   ├── TicketModal.jsx    # Create / edit ticket
│   │   ├── TagChip.jsx
│   │   ├── PriorityBadge.jsx
│   │   └── ActivityLog.jsx
│   └── hooks/
│       ├── useProjects.js
│       ├── useTickets.js
│       └── useRealtime.js     # Supabase realtime subscriptions
├── vite.config.js
└── vercel.json
```

### Design Direction

**Aesthetic:** Dark-mode first, minimal and focused — this is a tool for deep work, not a marketing page. Clean signal-to-noise ratio, every pixel earns its place.

**Palette:**
- Background: `#0f1117` (near-black)
- Surface: `#1a1d27` (card backgrounds, columns)
- Border: `#2a2d3a` (subtle separators)
- Primary accent: `#6366f1` (indigo — actions, active states)
- Text primary: `#e2e8f0`
- Text muted: `#64748b`
- Status colours: Backlog `#475569`, In Dev `#3b82f6`, Review `#f59e0b`, Done `#10b981`

**Typography:**
- UI font: `Inter` (system stack fallback)
- Monospace (ticket refs, code): `JetBrains Mono`
- Ticket refs (e.g. PI-42) always rendered in monospace with muted color — they feel like commit hashes, not labels

**Signature element:** Ticket cards created by Claude Code or Codex show a small `⚡` indicator in the corner — a subtle signal that the backlog was built by AI. This is the one memorable touch that makes Forge feel AI-native rather than a generic Jira clone.

### Key UI Behaviours

**Board view (`/board`):**
- Project selector (top bar) — switches between projects
- 4 columns side by side on desktop, swipeable on mobile
- Ticket count badge per column
- Filter bar: status (all / specific), priority, tags (multi-select chips)
- "+ New ticket" button (top right) — opens TicketModal
- Drag and drop between columns (updates status via Supabase directly)
- Supabase Realtime subscription — board updates instantly when Claude Code creates or moves a ticket

**Ticket cards:**
- `ticket_ref` in monospace (top-left)
- Title (main text)
- Tag chips (colored)
- Priority badge (colored dot + label)
- `⚡` badge if `created_by` is `claude-code` or `codex`
- Click opens TicketDetail

**Ticket detail (`/ticket/:ref`):**
- Full title + edit in-place
- Description and acceptance criteria rendered as markdown (use `react-markdown`)
- Status selector (dropdown)
- Priority selector
- Tags (add/remove chips)
- Activity log below — comments rendered in chronological order, `system` comments styled differently (italic, muted) from human/AI comments
- "Add comment" text area at bottom

**Settings (`/settings`):**
- Create / edit projects (name, slug, prefix, color)
- Manage tags (create with name + color, delete)

### PWA Config

`manifest.json`:
```json
{
  "name": "Forge",
  "short_name": "Forge",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f1117",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Register a service worker for offline support (show cached board when offline, queue writes).

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 6. CLAUDE.md Integration

Add this snippet to the global `~/.claude/CLAUDE.md` (and to each project's local `CLAUDE.md`) so every Claude Code session automatically knows about FlowBoard:

```markdown
## Project Management (Forge)

You have access to Forge via MCP — a Kanban board for tracking all development work.
MCP server: $FLOWBOARD_MCP_URL
API key: set as FLOWBOARD_API_KEY env var

**Workflow expectations:**
- When we agree on a new feature, bug fix, or improvement → create a ticket in the backlog
- When you start working on something → move ticket to "in_dev"
- When you finish and it's ready for review → move ticket to "review"  
- Add a comment when you make significant progress or hit a blocker
- Tag tickets correctly: use "feature", "bug", "chore", "improvement", "research", or "urgent"

**Always include acceptance criteria when creating tickets** — describe what "done" looks like.
```

---

## 7. Build Order

Build in this sequence to avoid blocked dependencies:

1. **Supabase setup** — create project, run schema SQL, enable Google OAuth, configure RLS
2. **MCP server** — implement all 7 tools, test locally with `curl`, deploy to Railway
3. **Web UI** — scaffold with Vite, implement auth flow, then Board → TicketDetail → Settings
4. **PWA** — add manifest + service worker last, after core UI is stable
5. **CLAUDE.md** — add snippet to global config once MCP server URL is known

---

## 8. Key Dependencies

**MCP Server (`package.json`):**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "express": "^4",
    "@modelcontextprotocol/sdk": "latest",
    "dotenv": "^16",
    "cors": "^2"
  }
}
```

**Web UI (`package.json`):**
```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "@supabase/supabase-js": "^2",
    "@supabase/auth-helpers-react": "^0",
    "react-markdown": "^9",
    "@hello-pangea/dnd": "^16",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "vite": "^5",
    "vite-plugin-pwa": "^0.19"
  }
}
```

---

## 9. Out of Scope (v1)

The following are intentionally excluded from v1 to keep it lean:

- Sprints / milestones
- Story points / estimation
- Due dates
- Assignees (it's a solo tool)
- Attachments / file uploads
- Email notifications
- GitHub integration (future: link commits to tickets)
- Multi-user support (future)

---

## 10. Success Criteria

FlowBoard v1 is complete when:

- [ ] Claude Code can create a ticket with `create_ticket` and it appears on the board immediately
- [ ] Claude Code can move a ticket to "In Development" with `update_ticket_status`
- [ ] The board is accessible and fully usable on a mobile phone
- [ ] Google login works and protects the UI
- [ ] The MCP server requires and validates the API key
- [ ] Ticket refs are correctly sequential per project (PI-1, PI-2, PI-3...)
- [ ] Tags filter correctly on the board
- [ ] Activity log shows system events + manual comments in order
- [ ] PWA installs on iPhone home screen
