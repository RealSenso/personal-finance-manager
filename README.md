# Personal Finance Manager

Envelope-budgeting dashboard. Local-first (everything works offline in the browser),
with optional Firebase sign-in for active multi-device sync.

## What it does

- **Income & savings rate** — enter income and the % you want reserved for goals (default 25%).
- **Fixed bills vs day-to-day** — mark recurring buckets (Claude, recharge, rent) as *fixed*.
  They're paid in full each month and are excluded from the daily budget and pace warnings.
- **Safe daily allowance** — `income − savings reserve − fixed bills`, spread over the days
  left in the month. Spend less than the pace and the surplus is offered back to your goals
  ("sweep to goals").
- **Debt tracking** — log an expense someone else paid for; it shows under "Money You Owe"
  until you settle.
- **Backdated entries** — add expenses for any date; every number recalculates and the view
  jumps to that month.
- Savings-goal ETAs, bank-CSV import with keyword rules, weekly digest, monthly history.

## Run locally

```bash
npm install
npm run dev
```

## Multi-device sync (optional)

1. Create a free [Firebase](https://console.firebase.google.com) project.
2. Add a **Web App**, enable **Authentication → Google**, create a **Firestore** database.
3. Firestore rules — each user owns one document:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

4. Local: copy `.env.example` to `.env.local` and fill in the Firebase web config.
5. Deployed: add the same values as **repo secrets** (`VITE_FIREBASE_*`) — the deploy
   workflow passes them into the build.

Without these vars the app runs fully local; the header shows "Local only".

## Deploy

Push to `main` → GitHub Actions builds and publishes to GitHub Pages
([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).
