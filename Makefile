# Entry points for checking and shipping Forge. Operational commands are
# documented in docs/operations.md; they read forge-ops/.env.

.PHONY: verify backup restore-test restore-production migrate-status migrate migrate-baseline smoke deploy deploy-dry-run

## Everything CI checks, plus the build. Must pass before a PR is deployed.
verify:
	npm run typecheck
	npm run lint
	npm test
	npm run format:check
	npm run build

## Back up production now.
backup:
	npm run ops -- backup

## Restore a backup (FILE=..., default newest) into the scratch DB and verify it.
restore-test:
	npm run ops -- restore-test $(FILE)

## Restore FILE=... over PRODUCTION. Backs up first and asks you to type the project ref.
restore-production:
	@test -n "$(FILE)" || (echo "Usage: make restore-production FILE=<backup.dump>" && exit 1)
	npm run ops -- restore-production $(FILE)

## List pending migrations.
migrate-status:
	npm run ops -- migrate status

## Back up, then apply pending migrations. Prefer `make deploy`, which does this too.
migrate:
	npm run ops -- migrate apply

## One-off: record migrations up to THROUGH (e.g. 0003) as already applied.
migrate-baseline:
	@test -n "$(THROUGH)" || (echo "Usage: make migrate-baseline THROUGH=0003" && exit 1)
	npm run ops -- migrate baseline $(THROUGH)

## /health poll and authenticated MCP smoke test against production.
smoke:
	npm run ops -- smoke

## Ship a PR: preflight, backup, migrate, merge, wait for hosts, health, smoke.
deploy:
	@test -n "$(PR)" || (echo "Usage: make deploy PR=<number>" && exit 1)
	npm run ops -- deploy $(PR)

## Preflight and backup only; applies and merges nothing.
deploy-dry-run:
	@test -n "$(PR)" || (echo "Usage: make deploy-dry-run PR=<number>" && exit 1)
	npm run ops -- deploy $(PR) --dry-run
