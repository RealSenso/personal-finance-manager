# Personal Finance Manager

Envelope-budgeting dashboard: recurring expense buckets, savings goals with ETA,
a safe daily-spend allowance, "money you owe" tracking, bank CSV auto-categorization,
and rule-based insights. All data is stored locally in the browser (no backend).

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build     # outputs to dist/
```

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via
[.github/workflows/deploy.yml](.github/workflows/deploy.yml).
The Pages build sets `GITHUB_PAGES=true` so Vite uses the `/personal-finance-manager/` base path.
