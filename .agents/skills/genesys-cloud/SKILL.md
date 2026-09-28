---
name: genesys-cloud
description: Extract data from Genesys Cloud CX orgs (analytics, conversations, queues, users, Architect flows) using gc CLI, Archy and the gcx spec-driven query builder in `genesys-toolkit/`.
---

# Genesys Cloud data extraction

1. Setup (skip if `genesys-toolkit/bin/gc` and `genesys-toolkit/spec/swagger.json` exist): `genesys-toolkit/scripts/setup.sh`, then `export PATH="$PWD/genesys-toolkit/bin:$PWD/genesys-toolkit/scripts:$PATH"`.
2. Confirm credentials: `gcx whoami [--org NAME]`. Needs `GENESYSCLOUD_[ORG_]REGION`, `..._OAUTHCLIENT_ID`, `..._OAUTHCLIENT_SECRET`.
   Never print or write the secret.
3. Build the query from the spec, do not guess field names:
   - `gcx find <words>` -> pick the operationId (prefer non-deprecated, `/analytics/...` for reporting data).
   - `gcx show <operationId>` -> required fields, enums, permissions.
   - `gcx field <term> --definition <QueryType>` -> exact metric / dimension names.
   - Start from a template in `genesys-toolkit/queries/` or `gcx skeleton <operationId>`; write the body to `genesys-toolkit/out/`.
   - `gcx validate <operationId> <file> --last 7d` until OK.
4. Run: `gcx query` for synchronous queries (details queries auto-page), `gcx job <kind>` for > 31 days or bulk,
   `gcx call GET <path> --paginate` for config lists, `gc ...` when a CLI command is simpler, `export-flows.sh` / `archy-gc export` for flows.
5. If a call returns 403, run `gcx perms <operationId>` and tell the user which permission / division the OAuth role is missing.
6. Treat orgs as read-only: do not call POST/PUT/PATCH/DELETE endpoints other than `.../query` and `.../jobs` unless the user explicitly asks.
7. Summarise results (CSV/Excel/Power BI-ready) and keep raw JSON in `genesys-toolkit/out/` (git-ignored; may contain PII such as ANI).
