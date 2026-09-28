# Genesys Cloud Toolkit

Read-only data extraction from Genesys Cloud CX orgs using:

| Tool | What it is used for |
|---|---|
| `gc` (Genesys Cloud CLI) | Any Platform API resource from the shell, with `--autopaginate` and Go-template transforms |
| `archy` (Architect CLI) | Exporting Architect flows as YAML / `.i3*` files |
| `gcx` (this repo) | Spec-driven query builder: find endpoints, inspect request schemas, validate query bodies offline, run queries and async analytics jobs |
| `PureCloudPlatformClientV2` | Python SDK, for longer scripts |
| `spec/swagger.json` | Full Platform API OpenAPI spec (downloaded by setup, not committed) |

## Setup

```bash
./scripts/setup.sh
export PATH="$PWD/bin:$PWD/scripts:$PATH"
```

## Credentials

One OAuth **Client Credentials** client per Genesys Cloud org. The same env vars drive `gc`, `gcx` and `archy-gc`:

```
GENESYSCLOUD_REGION=us-east-1            # AWS region or domain, e.g. mypurecloud.ie, euw2.pure.cloud
GENESYSCLOUD_OAUTHCLIENT_ID=...
GENESYSCLOUD_OAUTHCLIENT_SECRET=...
```

For several orgs, prefix with the org name and pass `--org NAME`:
`GENESYSCLOUD_ACME_REGION`, `GENESYSCLOUD_ACME_OAUTHCLIENT_ID`, `GENESYSCLOUD_ACME_OAUTHCLIENT_SECRET` -> `gcx whoami --org acme`.
(`gc` itself only reads the unprefixed vars; use `gc --clientid/--clientsecret/--environment` or `gc profiles new` for other orgs.)

### Creating the OAuth client (Genesys Cloud admin)

1. Admin > Roles/Permissions > Add Role, e.g. `API Read-Only Extract`, with view permissions only
   (use `gcx perms <operationId>...` to list exactly what a set of endpoints needs). Typical set:
   `analytics:conversationDetail:view`, `analytics:conversationAggregate:view`, `analytics:queueObservation:view`,
   `analytics:userAggregate:view`, `analytics:userDetail:view`, `analytics:flowAggregate:view`, `analytics:flowObservation:view`,
   `architect:flow:view`, `architect:flowOutcome:view`, `architect:datatable:view`, `architect:datatableRow:view`,
   `routing:queue:view`, `routing:skill:view`, `routing:wrapupCode:view`, `authorization:role:view`.
2. Admin > Integrations > OAuth > Add Client > Grant type **Client Credentials** > Roles tab: assign the role
   **to every division** you need data from (analytics results are filtered by the role's divisions).
3. Copy the Client ID / Secret; note the org's region (from the login URL, e.g. `apps.mypurecloud.ie`).

## Usage

```bash
gcx whoami                                              # verify credentials
gcx find queue observation                              # search 3,200+ operations
gcx field abandon --definition ConversationAggregationQuery   # find metric / dimension names
gcx show postAnalyticsConversationsAggregatesQuery      # params, permissions, body schema
gcx skeleton postAnalyticsConversationsDetailsQuery     # minimal valid body
gcx validate postAnalyticsConversationsAggregatesQuery queries/conversation_aggregates_queue_kpis.json --last 7d

gcx query postAnalyticsConversationsAggregatesQuery queries/conversation_aggregates_queue_kpis.json --last 7d --out out/kpis.json
gcx query postAnalyticsConversationsDetailsQuery queries/conversation_details_voice_inbound.json --last 24h --out out/details.json
gcx job conversations/details queries/conversation_details_job_all_media.json --interval 2026-08-01T00:00:00Z/2026-09-01T00:00:00Z --out out/aug.json
gcx call GET /api/v2/routing/queues --paginate --out out/queues.json

gc routing queues list --autopaginate | jq -r '.[] | [.id,.name] | @tsv'
export-flows.sh --type inboundcall --name 'LSG_NACC'    # flow list + Archy YAML per flow
archy-gc export --flowName "Main IVR" --flowType inboundcall --exportType yaml --outputDir out/flows
```

Templates in `queries/` use `{{interval}}` (filled from `--last` / `--interval`) and other `{{vars}}` (`--var queueId=...`).
`gcx query` / `gcx job` validate the body against the spec (unknown fields, bad metric/dimension names) before sending.

## Limits worth knowing

- Details query (`/analytics/conversations/details/query`): interval max 31 days, paged 100/page; use `gcx job` for bulk.
- Async jobs lag real time; check `GET /api/v2/analytics/conversations/details/jobs/availability`.
- API rate limits apply per OAuth client/token; `gcx` retries 429 using `Retry-After`.
- Refresh the spec when Genesys ships new endpoints: `gcx refresh-spec`.
