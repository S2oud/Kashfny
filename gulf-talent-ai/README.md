# Gulf Talent AI
Arabic-first recruiting research. Deploy from this directory with `npx wrangler deploy`; public app is `/app/`.

Runtime secrets: APP_TOKEN, TAVILY_API_KEY, OPENAI_API_KEY, GETPROSPECT_API_KEY, FULLENRICH_API_KEY, LUSHA_API_KEY, HUNTER_API_KEY. ALLOWED_ORIGIN is a comma-separated list of exact origins. Never commit credentials.

People search combines the four directory providers with Tavily and grounded OpenAI web search. Subscription permissions, provider credits and bounded pagination apply. Hunter Free permits ten results per domain. Duplicate LinkedIn profiles retain all contributing providers. No profile URL is invented. Contact reveals are separate and field-specific.

Posts support five comma-separated phrases, any/all matching, up to eight Tavily queries and two actual OpenAI web searches. Up to 200 relevant public LinkedIn posts, source labels, local pagination and filtering. Up to 96 AI summaries. Known source dates sort first; missing dates are never guessed. Full LinkedIn coverage and full text are not guaranteed.

Last ten people and post searches with result snapshots are stored in IndexedDB. Atomic Durable Objects enforce ten uses per signed device/trusted network, resetting at Dubai midnight. Connection checks, history, local sorting and pagination are free. Browser resets cannot reset the network quota. No anonymous device system prevents every network/identity change.

Tests: `node --test gulf-talent-ai/*.test.mjs` from repository root. `/health` reports configuration flags; authenticated `/provider-check` checks connectivity without contact reveals.
