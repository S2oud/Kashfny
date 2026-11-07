# Gulf Talent AI
Arabic-first recruiting research. Deploy from this directory with `npx wrangler deploy`; public app is `/app/`.

Runtime secrets: APP_TOKEN, TAVILY_API_KEY, OPENAI_API_KEY, GETPROSPECT_API_KEY, FULLENRICH_API_KEY, LUSHA_API_KEY, HUNTER_API_KEY. ALLOWED_ORIGIN is a comma-separated list of exact origins. Never commit credentials.

People search combines the four directory providers with Tavily and grounded OpenAI web search. Subscription permissions, provider credits and bounded pagination apply. Hunter Free permits ten results per domain. Duplicate LinkedIn profiles retain all contributing providers. No profile URL is invented. Contact reveals are separate and field-specific.

Posts support five comma-separated phrases, any/all matching, up to eight Tavily queries and two actual OpenAI web searches. Up to 200 relevant public LinkedIn posts, source labels, local pagination and filtering. Up to 96 AI summaries. Known source dates sort first; missing dates are never guessed. Full LinkedIn coverage and full text are not guaranteed.

Last ten people and post searches with result snapshots are stored in IndexedDB. Atomic Durable Objects enforce ten uses per signed device/trusted network, resetting at Dubai midnight. Connection checks, history, local sorting and pagination are free. Browser resets cannot reset the network quota. No anonymous device system prevents every network/identity change.

Tests: `node --test gulf-talent-ai/*.test.mjs` from repository root. `/health` reports configuration flags; authenticated `/provider-check` checks connectivity without contact reveals.

## Expanded recruiting discovery (November 2026)

The people search now uses staged Tavily discovery with a bounded broader fallback when fewer than 12 matching people are found. Recruiting job-title aliases are applied to structured provider searches. Profiles with explicit recruiting-role evidence are listed as high relevance; adjacent HR roles remain visible as **potential** rather than being deleted. Optional OpenAI role review can upgrade potential matches, but never removes leads or asserts current employment.

Person records are merged conservatively: the same canonical public LinkedIn profile merges; unlinked structured records may merge on exact full name, company and role. Distinct LinkedIn profile IDs do not merge just because people share a name. GetProspect records lacking a LinkedIn URL may still appear, labeled as provider-sourced records with no claim of a verified profile URL. Later provider-page failures preserve already collected pages and show a partial-warning state.

Request-level API call ceilings (environment overrides; defaults shown):

| Variable | Default calls/search | Maximum allowed |
| --- | ---: | ---: |
| `SEARCH_MAX_TAVILY_CALLS` | 4 for 1 company, up to 12 for batch | 30 |
| `SEARCH_MAX_OPENAI_CALLS` | 1 for 1 company, up to 3 for batch | 5 |
| `SEARCH_MAX_AI_ROLE_CALLS` | 1 if ambiguous records exist | 2 |
| `SEARCH_MAX_GETPROSPECT_CALLS` | 5 | 12 |
| `SEARCH_MAX_LUSHA_CALLS` | 3 | 8 |
| `SEARCH_MAX_FULLENRICH_CALLS` | 3 | 8 |
| `SEARCH_MAX_HUNTER_CALLS` | 1 per company, up to 10 | 20 |

Set a call limit to `0` to disable a provider for people search; these settings do **not** disable explicit contact reveals or post searches. Provider page count caps (defaults: GetProspect 5, Lusha 3, FullEnrich 3) can be set with `SEARCH_GETPROSPECT_PAGES`, `SEARCH_LUSHA_PAGES`, `SEARCH_FULLENRICH_PAGES`. Actual call volume may be lower when providers return fewer results or a plan is exhausted.

**These are call-count guards, not monetary spending limits.** Provider requests may carry different charges or credits; review individual provider plan rates and usage dashboards before high-volume searches. No contact-reveal calls are made automatically. LinkedIn API and any new central database are intentionally absent.

The frontend displays unique people, high/potential relevance filters, provider completion/partial states and approximate API request counts. Local browser history remains capped at ten result snapshots. Test coverage includes search budgets, conditional fallback, partial provider pages, source identity matching and the AI role-review behavior. CI validates frontend module syntax and runs mock-only tests on pull requests.
