# Current post-search policy —7November2026

The owner requested a precision-first return to expanded job keywords after unrelated posts appeared. Posts now use Tavily only: **no OpenAI discovery, classification or summaries**, regardless of legacy POST_MAX_*AI* overrides. People search AI is unchanged. Every candidate requires both user-keyword matching and explicit job-intent evidence (vacancies, CV invitations, application windows or employment-related training). Nationality, HR, generic opportunity/career/training words alone do not qualify. Missing text with no job evidence is excluded. Source excerpts replace AI summaries, and old local result snapshots are filtered on display without deleting history. See POST-KEYWORDS-2026-11-07.md.

--- Earlier audit history; the contextual AI post policy below is superseded ---

# Gulf Talent AI
Arabic-first recruiting research. Deploy from this directory with `npx wrangler deploy`; public app is `/app/`.

Runtime secrets: APP_TOKEN, TAVILY_API_KEY, OPENAI_API_KEY, GETPROSPECT_API_KEY, FULLENRICH_API_KEY, LUSHA_API_KEY, HUNTER_API_KEY. ALLOWED_ORIGIN is a comma-separated list of exact origins. Never commit credentials.

People search combines three automatic directory providers (GetProspect, Lusha, FullEnrich) with Tavily and grounded OpenAI web search. Subscription permissions, provider credits and bounded pagination apply. Hunter contact-returning Domain Search is excluded from automatic discovery; explicit contact requests remain separate. Duplicate LinkedIn profiles retain all contributing providers. No profile URL is invented. Contact reveals are separate and field-specific.

Posts support five comma-separated phrases, any/all matching, bounded hybrid broad/legacy queries with contextual AI review (defaults below). Up to 200 relevant public LinkedIn posts, source labels, local pagination and filtering. Up to 96 AI summaries. Known source dates sort first; missing dates are never guessed. Full LinkedIn coverage and full text are not guaranteed.

Last ten people and post searches with result snapshots are stored in IndexedDB. Atomic Durable Objects enforce ten uses per signed device/trusted network, resetting at Dubai midnight. Connection checks, history, local sorting and pagination are free. Browser resets cannot reset the network quota. No anonymous device system prevents every network/identity change.

Tests: `node --test gulf-talent-ai/*.test.mjs` from repository root. `/health` reports configuration flags; authenticated `/provider-check` checks connectivity without contact reveals.

## Expanded recruiting discovery (November 2026)

The people search now uses staged Tavily discovery with a bounded broader fallback when fewer than 30 matching people are found. Recruiting job-title aliases are applied to structured provider searches. Profiles with explicit recruiting-role evidence are listed as high relevance; adjacent HR roles remain visible as **potential** rather than being deleted. Optional OpenAI role review can upgrade potential matches, but never removes leads or asserts current employment.

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


## Contextual hybrid post search and audit — 7 November 2026

Broad LinkedIn post/feed queries alternate with older recruiting terms, CV invitations and graduate/internship queries. Hiring, salary, employer, job title and application link are not mandatory admission fields. Keyword intent/any-all and UAE National aliases remain. People fallback now expands below30 (SEARCH_EXPAND_BELOW clamps12–100) within the existing provider budgets; HR business partners/human-capital roles remain potential. No current employment is verified by AI.

Candidate posts are deduplicated BEFORE AI. Batches of25 supplied posts receive job-related/potential/not-job-related assessments with exact ID and verbatim source evidence. Unknown IDs, fabricated quotes, duplicate assessments and failed reviews cannot remove candidates. Confident negatives on retrieved text may be excluded; negative excerpts remain potential. Clear standalone national-day greetings are filtered, but a CV invitation overrides that shortcut. Unreviewed candidates retain their disclosed keyword/potential status. The UI exposes job relevance, AI-review status and call accounting. Full text, exhaustiveness and model accuracy are not guaranteed.

Post-search controls, per request (all accept0):

| Environment variable | Default | Hard maximum |
|---|---:|---:|
| POST_MAX_TAVILY_CALLS |6|8|
| POST_MAX_OPENAI_CALLS (aggregate Responses requests)|6|12|
| POST_MAX_WEB_CALLS|1|2|
| POST_MAX_REVIEW_CALLS|4|8|
| POST_MAX_SUMMARY_CALLS|1|8|

The aggregate OpenAI guard covers web discovery, review and summaries. Each web Responses request can additionally invoke up to3 web tools; billed tool calls and tokens are not identical to HTTP request count. Default review covers at most100 unique posts; remaining candidates stay visible. These controls do not regulate explicit contact-reveal actions or produce a guaranteed USD budget. Provider ceilings trigger a coverage warning. Invalid search fields and bodies over14000UTF8 bytes are rejected before a daily-use charge. Pagination values are floored.

No automatic Hunter Domain Search: official billing documents show this returns chargeable contact data. This intentionally changes old automatic discovery, rather than describing it as free. Other search plans also need account-specific review. No database or LinkedIn API was added.

Validation:62/62mock-only Node tests, syntax for everyJSmodule/frontend inline script, Worker dry-run bundle plus8frontend assets.16localChrome screens:360/390/834/1280 × AR/EN × dark/light; relevance filter and two retained results exercised with synthetic data. Source and generation are separate: build-assets.mjs then wrangler deploy from THIS directory. Optional nonsecret RELEASE_COMMIT is exposed in health to help operators prove future deployment provenance; absent value is null, not an invented version.

Live authenticated search was explicitly deferred by the owner. Paid provider calls/reveals during this audit:0. Live health/app200 and protected endpoints401 were checked without credentials; these are not provider connectivity or search QA. An initial missing Cloudflare session was resolved through owner-completed OAuth. Runtime release15f1d3980fdaf2cfc0ad43be660bbe34c0ce8e95 was then deployed with --keep-vars; livehealth reported thisSHA and /app/ matched the frontend exactly. See audit release record. See [full audit and limitations](AUDIT-2026-11-07.md).
