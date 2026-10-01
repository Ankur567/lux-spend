# Luxe Fund

A private luxury fund and shared wishlist for a couple. Two people save into one virtual wallet, keep a prioritised wishlist (theirs, their partner's, and shared goals), and let the app decide which wish gets funded next. Every rupee is tracked in an immutable ledger.

Mobile-first, installable as a PWA, and works completely without any bank or payment integration.

---

## Features

- **Couple Space**: exactly two members. Invite by link or code (single use, expires in 14 days). Six-step onboarding, skippable once the space exists.
- **Wishlist**: wishes owned by *Me*, *Partner*, or *Us*; High, Medium or Low priority; target dates; product links; search, tabs, filters and sorting; manual reordering; archive and restore. Items can only be hard-deleted if no money has ever moved for them.
- **Virtual wallet**: contributions, expenses, allocations and refunds live in an append-only ledger. Balances are always derived from it, never stored.
- **Smart auto-allocation**: after adding money the app asks *"How should we use this money?"* (Auto, Keep unallocated, or Manual). Auto funds goals by priority, then target date, then manual rank, then age. Every allocation batch can be undone.
- **Purchase flow**: the actual price can differ from the estimate. Leftover allocation returns to the unallocated balance; a pricier purchase takes the difference from the fund or is marked as paid outside it.
- **Quick expenses**: warns when an expense would dip into goal money and shows exactly which goals would give money back (lowest priority first) before asking you to confirm.
- **Rebalance**: re-allocates everything from scratch using current priorities.
- **Monthly budget and savings goal**, with an optional strict mode that blocks quick expenses over budget.
- **Insights**: saved vs spent, contributions "built together", spending by category, and a funding forecast per goal.
- **Activity feed and in-app notifications**: deposits, funded wishes, near-goal and target-date progress, budget warnings, and partner joined.
- **Export**: transactions and wishlist as CSV (guarded against formula injection), plus a full JSON backup.
- **Integrations with honest fallbacks**: Razorpay online payments, Account Aggregator bank data, and UPI "Pay to Fund" QR. All optional and all off by default.
- **PWA**: manifest, generated icons, offline page, safe-area aware layout, dark mode.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, Server Actions), React 19, TypeScript |
| Database | MongoDB Atlas via Mongoose 9 (multi-document transactions) |
| Auth | Auth.js v5 (Credentials, JWT sessions), bcrypt (cost 12) |
| UI | Tailwind CSS 4, shadcn/ui (Base UI), Lucide, Framer Motion, Recharts |
| Forms and validation | React Hook Form, Zod 4 (validated again on the server) |
| Dates | date-fns, @date-fns/tz (month boundaries computed in the space's timezone) |
| Tests | Vitest |

## Getting started

Requirements: Node.js 20.9 or newer, and a MongoDB Atlas cluster (the free M0 tier works).

```bash
npm install
cp .env.example .env.local     # then fill in MONGODB_URI and AUTH_SECRET
npm run dev                    # http://localhost:3000
```

Generate `AUTH_SECRET` with `npx auth secret` or `openssl rand -base64 32`.

Optional demo data (development only):

```bash
npm run seed
```

This creates `joyee@example.com` and `partner@example.com` (password `luxefund123`, or `SEED_PASSWORD` if you set it), ₹35,000 of contributions and five wishes, then runs auto-allocation. It refuses to run when `NODE_ENV` or `VERCEL_ENV` is `production`, and re-running only replaces the seed accounts' own space.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | Generates route types and runs `tsc` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (money, allocation engine, ledger maths, forecast) |
| `npm run seed` | Development seed data |

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Atlas connection string. Must be a replica set (all Atlas clusters are), because ledger writes use transactions. |
| `AUTH_SECRET` | Yes | Signs session tokens. |
| `NEXTAUTH_URL` | Recommended | Public URL of the deployment. |
| `AUTH_TRUST_HOST` | Recommended | `true` behind Vercel or another proxy. |
| `NEXT_PUBLIC_APP_NAME` | No | Display name (default "Luxe Fund"). |
| `NEXT_PUBLIC_APP_URL` | No | Used in password reset links. |
| `OPTIONAL_PAYMENT_PROVIDER` | No | `razorpay` to enable online payments. |
| `PAYMENT_PROVIDER_CLIENT_ID` / `_CLIENT_SECRET` / `_WEBHOOK_SECRET` | No | Razorpay key id, key secret and webhook secret. All three are required to activate it. |
| `OPTIONAL_AA_PROVIDER`, `AA_CLIENT_ID`, `AA_CLIENT_SECRET` | No | Account Aggregator credentials (see below). |
| `NEXT_PUBLIC_FUND_UPI_ID`, `NEXT_PUBLIC_FUND_UPI_NAME` | No | Shows a UPI QR code and deep link for the fund account. |

**The app works fully when every optional variable is empty.** Contributions are then recorded manually, and each integration screen explains what is and isn't configured.

## How the money works

All amounts are stored as **integer paise**. Floats only appear at the input and display edges (`toPaise`, `formatCurrency`).

### Ledger

`Transaction` documents are immutable. Mongoose middleware blocks every update and delete, and fields are marked `immutable`. Types:

| Type | Direction | Effect |
| --- | --- | --- |
| `CONTRIBUTION` | IN | Money added to the fund |
| `EXPENSE` | OUT | Money spent (quick expense or wishlist purchase) |
| `REFUND` | IN | Money returned |
| `ADJUSTMENT` | IN or OUT | Manual correction |
| `ALLOCATION` | INTERNAL | Unallocated money moved to a goal |
| `DEALLOCATION` | INTERNAL | Goal money moved back to unallocated |

Balances are derived in one place (`computeWalletTotals`):

```text
available   = contributions − expenses + refunds ± adjustments
allocated   = allocations − deallocations
unallocated = available − allocated
```

Mistakes are fixed by **reversal entries**: the same type with the opposite direction and `reversalOf` pointing at the original. A unique index guarantees an entry can be reversed only once. Purchased and archived items always end with zero net allocation.

### Concurrency and idempotency

Every ledger write runs inside a MongoDB transaction that first increments `CoupleSpace.ledgerVersion`. Two partners writing at the same moment therefore conflict, and the transaction is retried. Balance checks are never made on stale data. Provider payments carry an idempotency key (`razorpay:<paymentId>`) with a unique index, so webhook retries and client callbacks can never double-credit.

### Allocation engine

`src/lib/finance/allocation-engine.ts` is pure and unit-tested:

- **Funding order**: High, then Medium, then Low. Within a priority, *Smart* mode uses target date, then manual rank, then creation date. *Manual* mode (switched on automatically when you reorder) uses rank before date.
- **Auto-allocation** greedily fills goals in that order. The spec example (₹10,000 across Funko ₹4,000 High, Watch ₹8,000 High, Shoes ₹5,000 Medium) yields Funko funded, Watch +₹6,000, Shoes waiting.
- **Shortfall release** for expenses takes from the *end* of the funding order, so your most important goals are protected.
- **Forecast** assumes unallocated money is used first, then future contributions arrive at a steady daily rate (your expected monthly contribution, or your recent average) and keep flowing by priority.

### Purchase

Marking a wish purchased writes a `DEALLOCATION` of its whole allocation, followed by an `EXPENSE` of the actual price. Buying the ₹8,000-funded Funko for ₹7,899 returns ₹101 to the unallocated balance. Undoing a purchase reverses the expense and puts the item back on the wishlist.

## Security

- Auth.js sessions are JWTs in HttpOnly, Secure (in production), SameSite cookies. Passwords are hashed with bcrypt at cost 12, and login timing is equalised for unknown emails.
- **Every page, server action and route handler re-verifies the session and couple-space membership against the database.** The space is always derived from the signed-in user and never taken from the URL or the request body. Changing an id in a URL returns *Not found* for anything outside your space.
- A password change increments `sessionVersion`, which invalidates sessions on other devices.
- All input is validated with Zod on the server. Client validation is only for convenience.
- Rate limiting covers login, registration, password reset, invite joins and webhooks. The limiter is an in-memory implementation behind a `RateLimiter` interface; swap in Redis or Upstash for multi-instance deployments.
- Provider secrets are only read on the server. Webhooks verify the HMAC signature of the raw body before parsing anything.
- Financial history is never deleted: reversal entries instead of deletes, and archive instead of delete once an item has history.
- CSV exports neutralise spreadsheet formula injection.

## Integrations

### Payments (Razorpay)

Disabled unless `OPTIONAL_PAYMENT_PROVIDER=razorpay` and all three secrets are set. When enabled:

1. The server creates a Razorpay order whose notes carry the space and user ids.
2. Checkout runs in the browser.
3. The client sends back `order_id`, `payment_id` and `signature`. The server verifies the HMAC with the key secret, fetches the payment, and credits it **only if its status is `captured`**.
4. `POST /api/webhooks/payments/razorpay` independently verifies the webhook signature and credits captured payments idempotently.

Point the Razorpay webhook at `https://<your-domain>/api/webhooks/payments/razorpay` with the `payment.captured` event.

### UPI Pay to Fund

With `NEXT_PUBLIC_FUND_UPI_ID` set, the app shows a QR code, a `upi://pay` deep link, and a copy button for the fund's UPI ID. **Opening a UPI app does not record anything.** After paying, the user taps *"I've paid, record contribution"* and confirms manually.

### Bank data (Account Aggregator)

The `BankDataProvider` interface and an `AccountAggregatorProvider` skeleton exist. Without credentials, the manual provider is used and settings show *"Bank sync is not configured."* With credentials, the provider reports itself as configured, but the provider-specific consent and FI-fetch flow must still be implemented for your AA partner (Setu, Finvu, OneMoney…). Until then its methods throw a clear `NOT_CONFIGURED` error rather than pretending to sync. Bank data is read-only and is never auto-credited to the ledger.

### Email

Password reset links go through an `EmailSender` interface. No provider is bundled. In development, unconfigured email logs the reset link to the server console. In production, wire up a provider (Resend, SES, Postmark…) in `src/lib/integrations/email`.

## Deployment (Vercel + Atlas)

1. Create an Atlas cluster and a database user. Under *Network Access*, allow `0.0.0.0/0` (Vercel uses dynamic IPs) or use the Atlas Vercel integration.
2. Import the repository into Vercel.
3. Set `MONGODB_URI`, `AUTH_SECRET`, `NEXTAUTH_URL` (your production URL), `AUTH_TRUST_HOST=true`, and `NEXT_PUBLIC_APP_URL`. Add optional variables only for the integrations you actually use.
4. Deploy. Indexes are created by Mongoose on first use. For large datasets, create them ahead of time with `syncIndexes()`.

The connection is cached on `globalThis`, so warm serverless invocations reuse it.

## Project structure

```text
scripts/seed.ts                  Development seed
src/app/(app)/                   Authenticated app: home, wishlist, wallet, insights, notifications, profile, settings
src/app/(auth)/                  Login, register, forgot and reset password
src/app/onboarding, invite/      Couple space setup and invite acceptance
src/app/actions/                 Server actions (validated, membership-checked)
src/app/api/                     Auth.js, CSV/JSON export, payment webhooks
src/components/                  UI: sheets, wishlist, wallet, insights, settings, shadcn primitives
src/lib/finance/                 Pure money logic (ledger maths, allocation engine, forecast) + tests
src/lib/services/                Domain services (ledger, transactions, allocation, wishlist, …)
src/lib/integrations/            Payment, bank, email and notification adapters
src/models/                      Mongoose schemas and indexes
src/proxy.ts                     Optimistic route protection (Next.js 16 proxy)
public/sw.js                     Service worker (never caches financial data)
```

## Testing

```bash
npm test
```

The tests cover paise conversion and formatting, the spec's ₹10,000 allocation example, funding order in both modes, shortfall release, wallet maths including purchase leftovers and reversals, and the funding forecast.

## Known limitations

- The rate limiter is in-memory per instance. Use a shared store in multi-region production.
- Push and email notifications plug into the `NotificationChannel` and `EmailSender` interfaces, but only the in-app channel ships.
- Changing the space currency relabels amounts; it does not convert them.
- Bank sync needs a provider-specific Account Aggregator implementation before it can fetch data.
