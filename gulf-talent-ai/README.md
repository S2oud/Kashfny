# Gulf Talent AI — GCC people research

A responsive, Arabic/English personal research dashboard. The UI provides company, professional role and country filters; source-based results; saving and search history in this browser; CSV export; and optional AI briefs via a separately billed OpenAI API.

## Live URL
When this folder is published from the repository root via GitHub Pages, browse:
`https://s2oud.github.io/Kashfny/gulf-talent-ai/`

**Important:** GitHub Pages serves only the static website. Live research will not work until you deploy the separately provided Cloudflare Worker and configure your own search provider account and secrets. No real-person contact results are hardcoded or fabricated. Do not interpret search excerpts as verified identity or verified direct contact details.

## Free deployment — static site
This website lives in `gulf-talent-ai/index.html` within the existing public S2oud/Kashfny repository. It does not replace or modify the existing Kashfny website. GitHub Pages must be enabled and publishing the main branch **root** for this folder to resolve. If Pages is configured for a different branch or `/docs`, change deployment settings in GitHub.

## Cloudflare Worker setup
1. Create or log into [Cloudflare](https://dash.cloudflare.com/) and create a Worker.
2. Paste `worker.js` into that Worker (or run Wrangler from the `gulf-talent-ai` folder).
3. Set the environment variable `ALLOWED_ORIGIN` to exactly `https://s2oud.github.io` (this is the **origin**, not the full path), and optionally `http://localhost:8000` for local testing; **do not** set wildcard `*`.
4. In Cloudflare Workers → Settings → Variables/Secrets, add `EXA_API_KEY` from your Exa account and optionally `TAVILY_API_KEY` from Tavily.
5. Add `APP_TOKEN` as a long random secret (at least 32 random bytes). It must match what you enter in the website's API Settings. The token is saved in browser localStorage in this MVP — safe enough only for a trusted personal browser; upgrade to Cloudflare Access for stronger authentication before broader use.
6. Optional: add `OPENAI_API_KEY` for AI briefs (separately billed by OpenAI; your ChatGPT subscription is **not** an API key) and optional `OPENAI_MODEL` to choose a currently supported model.
7. Deploy the Worker. Open the site, select API settings and enter your Worker URL and APP_TOKEN. Click Test connection. Then run searches.

Example `wrangler.toml`:
```toml
name = "gulf-talent-ai-api"
main = "worker.js"
compatibility_date = "2026-11-01"

[vars]
ALLOWED_ORIGIN = "https://s2oud.github.io"
```
Command examples for secrets:
```sh
npx wrangler secret put EXA_API_KEY
npx wrangler secret put APP_TOKEN
npx wrangler secret put TAVILY_API_KEY
npx wrangler secret put OPENAI_API_KEY
```
Use only the ones relevant to your accounts.

## Accuracy and safety
- Search uses Exa's person/company category and optional Tavily web search. It returns potential leads rather than a verified employee database.
- Contact emails are extracted from public search result snippets, and personal free-mail providers are excluded; a detected email is **not** independently verified.
- Phone detection is limited to numbers labeled as company/office on an apparent official-domain result; these are **not** direct employee phone numbers. No guessed emails, personal numbers or LinkedIn scraping.
- Some sources forbid scraping or storing personal contact information. Follow each provider's terms and applicable privacy law even for private use.
- Search API free credits are limited and may be exhausted. A paid data provider is usually needed for Lusha-level verified direct work emails and phones.
- No scheduled crawler or automated email sending in this MVP.

## Technical notes
The static interface stores history, saved cards, Worker URL and APP_TOKEN on your own device. Its backend is `worker.js` and requires deployment on Cloudflare Workers. API keys must **never** be committed to GitHub or exposed in frontend JavaScript.
