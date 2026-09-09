# FINNRI Web

FINNRI's big-screen dashboard for explainable spending insights, transaction
management, accounts, shared-expense ledgers, budgets, recurring payments, and
financial calculators.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The frontend reads `NEXT_PUBLIC_API_URL` and defaults to
`http://localhost:8080`. Start the Go API from `../finnri-api` and allow the
web origin through the backend CORS configuration.

## Current API coverage

- Authentication: guest, identify, OTP, registration, and PIN login.
- Overview and insights: `GET /v1/dashboard` with date ranges and timezone.
- Transactions: list/search/filter/paginate, create, edit, parse, duplicate, delete,
  account linking, and CSV export of the current result page.
- Accounts: list, create, update, set default, and guarded delete.
- Splits: friends, groups, shared bills, inline transaction splits, balances,
  settlements, and activity history.
- Notifications: list, unread count, mark one/all read.
- Planning: budgets, recurring-payment schedules, and mark-paid actions.
- Tools: backend-powered EMI calculation and amortization schedule.
- Profile: username update.

Bank sync, statement imports, bulk editing, open-ended AI advice, and generated
financial forecasts are intentionally not claimed by the web product.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
