# Mirai · 未来

A quiet **kakeibo** — a calm, single-screen household ledger.
Local-first (works fully offline in the browser); optional Google sign-in for
active multi-device sync.

Light "washi paper" theme, one matcha accent, no page scrolling — only the
panels scroll.

## What it does

- **Income & savings rate** — your income and the % reserved for goals (default 25%).
- **Budget model** — `income − savings reserve − scheduled goal deposits − fixed bills`,
  spread over the days left in the month = a safe daily allowance. Spend under the
  pace and the surplus is offered back to your goals ("sweep to goals").
- **Fixed bills** — mark recurring envelopes (subscriptions, rent, recharge) as *fixed*:
  excluded from the daily budget, and only flagged if they overrun.
- **Envelopes & savings goals** with live pacing and goal ETAs.
- **Debts** — log an expense someone else paid for; it sits under "Money you owe"
  until you settle.
- **Where it went** — this month's spending, envelope by envelope.
- **Backdated entries**, month history, weekly digest, undo on delete, `N` to log.

## Run locally

```bash
npm install
npm run dev
```

## Multi-device sync (optional)

Set the six `VITE_FIREBASE_*` vars (`.env.local` for dev, repo **secrets** for the
deploy) and publish this Firestore rule so each user owns one document:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Then `firebase deploy --only firestore:rules` (config is in `firebase.json` /
`.firebaserc`), or paste it in the Firebase console. Without these vars the header
shows "Local only" and everything still works.

## Deploy

Push to `main` → GitHub Actions builds and publishes to GitHub Pages
([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).
