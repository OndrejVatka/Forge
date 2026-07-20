# Security Policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems — that discloses the flaw to everyone before there's a fix.

Instead, use GitHub's private reporting: go to the [Security tab](https://github.com/OndrejVatka/Forge/security/advisories/new) and open a draft advisory. It's visible only to you and the maintainer.

Forge is maintained by one person as a side project, so please expect a best-effort response rather than a guaranteed timeline. Reports are taken seriously and you'll get an acknowledgement as soon as it's seen.

## Scope

Forge is self-hosted — every install is a separate deployment owned by whoever runs it. There is no shared service to compromise.

**In scope:** anything in this repository — the MCP server, the web UI, and especially `db/schema.sql`, since the RLS policies are what protect every user's data.

**Out of scope:** an individual operator's own deployment, hosting configuration, or leaked credentials. If you've found an exposed Forge instance, please contact its operator rather than reporting it here.

## Notes for operators

If you run Forge, these are the things that matter most:

- **The service-role key bypasses RLS entirely.** It belongs only in the MCP server's environment — never in the web UI, never in a `VITE_` variable, never committed.
- **`FORGE_API_KEY` is the only thing protecting your MCP endpoint.** There's no user identity in that layer, so anyone holding the key can do anything the tools allow. Generate it with `openssl rand -hex 32` and rotate it if it leaks.
- **Access is an email allowlist.** Everyone in `allowed_users` has full read/write on the entire board — there's no read-only tier and no per-project scoping. Only add people you'd trust with delete rights on everything.
- **Disable signups** in the Supabase dashboard once you've created your account. The allowlist already denies strangers everything, but there's no reason to let them create accounts.

If your database predates the allowlist, its policies still grant every authenticated user full access. Run [`db/migrations/0001_restrict_access_to_allowlist.sql`](db/migrations/0001_restrict_access_to_allowlist.sql).
