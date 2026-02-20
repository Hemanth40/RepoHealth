# RepoSentinelX 2.0

RepoSentinelX 2.0 is a modern GitHub repository health analyzer built with free resources.
It combines:

- GitHub API repository sampling
- Deterministic local quality heuristics (always available)
- Optional AI enhancement via Gemini free tier and/or Groq free tier

## Why this is v2

Compared to the earlier v1 build, v2 adds:

- New brand identity: **RepoSentinelX 2.0**
- Stronger backend pipeline with structured snapshot + report contract
- AI hybrid + fallback modes:
  - `hybrid`: Gemini + Groq in parallel with consensus merge
  - `auto`: Gemini -> Groq -> local heuristics fallback
- Expanded report sections:
  - category scores
  - risk posture
  - file complexity heatmap
  - priority fixes
  - quick wins and milestones
- New professional, responsive UI with improved information hierarchy

## Tech Stack

- Next.js (App Router)
- React
- Octokit (GitHub API)
- Groq SDK (optional provider)
- Native fetch to Gemini API (optional provider)

## Free Resource Model

The project is designed to run fully with free options:

- GitHub public API (token optional but recommended for better limits)
- Gemini free API key (optional)
- Groq free API key (optional)
- Local heuristic analyzer works even with zero AI credits

## Environment Variables

Create `.env.local`:

```bash
GITHUB_TOKEN=your_github_token_optional

# AI provider config
AI_PROVIDER=hybrid
SCORE_BASE_WEIGHT=0.8

# Gemini (optional)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3-flash-preview

# Groq (optional)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

`AI_PROVIDER` supported values:

- `hybrid`: run Gemini + Groq together and merge both outputs
- `auto`: Gemini first, then Groq, then local fallback
- `gemini`
- `groq`

`SCORE_BASE_WEIGHT` (optional): controls score stability by anchoring AI output to deterministic local analysis.

- Range: `0.5` to `0.95`
- Higher value = more stable score (recommended `0.8`)

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Use either:

- Full GitHub URL (`https://github.com/vercel/next.js`)
- Short format (`vercel/next.js`)

## API

### `POST /api/analyze`

Request:

```json
{
  "repoUrl": "vercel/next.js"
}
```

Response includes:

- `overallScore`, `grade`, `confidence`
- `categories` (maintainability/reliability/security/documentation/architecture)
- `risk` object
- `heatmap`, `topIssues`, `priorityFixes`, `quickWins`, `nextMilestones`
- `analysisMeta` provider/runtime details

## Project Structure

```text
src/
  app/
    api/analyze/route.js
    globals.css
    layout.js
    page.js
  components/
    Dashboard.js
    Heatmap.js
    IssueList.js
  lib/
    aiEnhancer.js
    github.js
    localAnalyzer.js
    reportBuilder.js
```

## Notes

- If AI keys are missing or rate-limited, RepoSentinelX still returns a complete local report.
- For large repositories, sampling is intentionally bounded to keep response time stable.
