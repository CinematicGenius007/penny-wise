# penny-wise — Personal Finance Manager

## Project Overview

**penny-wise** is a personal finance manager that does the thinking for you. It silently tracks your money — expenses, investments, taxes — and surfaces only what matters. Think: *"Your financially-savvy best friend who never forgets a rupee."*

**Core Philosophy**: Dumb the app, smart the backend. Users shouldn't have to think about their finances.

---

## Vision Statement

A minimal, intelligent personal finance app that:
- Automatically organizes expenses without user effort
- Provides plain-English insights about spending habits
- Simplifies tax compliance for Indian users
- Eventually integrates investment tracking with market data
- Uses AI to answer any finance question in natural language

---

## Author

Ayush Saini — SDE-1 at Optmyzr, Founding Engineer at Oddmind Innovations

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|----------|
| **Frontend** | Next.js 16 + TypeScript | App Router, Server Components, fullstack capability |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Minimal, customizable, dark mode ready |
| **Backend** | Convex | Reactive queries, real-time sync, serverless functions, built-in auth integration |
| **Auth** | Clerk | Drop-in auth UI, JWT-based Convex integration, social login, middleware protection |
| **AI** | OpenAI (via `openai` SDK) | Categorization, chat, insights |
| **Charts** | Recharts | Lightweight, customizable |
| **Validation** | Zod | Schema validation for all API inputs |
| **Mobile** | Kotlin Android (future) | SMS parsing for auto-transaction capture |

> **Note**: The original plan used Supabase + Zustand. The project has been migrated to **Convex + Clerk**. There is no Supabase client, no SQL migrations, no Zustand store, and no REST API layer for data — all data access goes through Convex queries/mutations. Only the two AI endpoints (`/api/categorize`, `/api/chat`) remain as Next.js Route Handlers.

---

## Convex Schema

Defined in `convex/schema.ts`. All tables use Convex `Id` references (not UUIDs). Auth is enforced inside each handler via `ctx.auth.getUserIdentity()` — there is no RLS layer.

### Tables

```typescript
// profiles — one per Clerk user; created lazily via ensureProfile mutation
profiles: {
  userId: string,           // Clerk tokenIdentifier
  fullName?: string,
  avatarUrl?: string,
  currency: string,         // default 'INR'
}
// index: by_userId

// accounts — bank/cash/card/wallet accounts
accounts: {
  userId: string,
  name: string,
  type: 'bank' | 'cash' | 'card' | 'wallet',
  balance: number,          // kept in sync manually in mutations (no trigger)
  currency: string,         // default 'INR'
  color: string,            // default '#10B981'
  isDeleted: boolean,       // soft-delete; preserves transaction history
}
// index: by_userId

// categories — system categories (userId=undefined) + user custom
categories: {
  userId?: string,          // undefined = system category
  name: string,
  icon: string,
  color: string,
  isSystem: boolean,
}
// indexes: by_userId, by_system

// transactions
transactions: {
  userId: string,
  accountId: Id<"accounts">,
  amount: number,           // always positive; type determines direction
  type: 'income' | 'expense' | 'transfer',
  categoryId?: Id<"categories">,
  description?: string,
  notes?: string,
  date: string,             // ISO 'YYYY-MM-DD'
  transferPairId?: string,  // links the two rows of a transfer (debit + credit)
  toAccountId?: Id<"accounts">, // set only on the debit row of transfers
  aiCategorized: boolean,
}
// indexes: by_userId_date, by_userId_account, by_userId_category, by_transferPairId

// budgets — overall or per-category budget limits
budgets: {
  userId: string,
  categoryId?: Id<"categories">,  // undefined = overall budget
  amount: number,
  period: 'monthly' | 'weekly',
}
// index: by_userId

// investments — manual tracking (Phase 2)
investments: {
  userId: string,
  name: string,
  type: 'stock' | 'mutual_fund' | 'fd' | 'nps' | 'ppf' | 'other',
  investedAmount: number,
  currentValue?: number,
  purchaseDate?: string,
}
// index: by_userId

// chatMessages
chatMessages: {
  userId: string,
  role: 'user' | 'assistant',
  content: string,
}
// index: by_userId
```

### Balance Sync

Account balances are updated **manually inside mutations** — there are no database triggers. Pattern:

- `transactions.create` → patches `accounts.balance` by ±amount
- `transactions.update` → reverses old delta, applies new delta
- `transactions.remove` → reverses the delta (for transfers, both paired rows are reversed and deleted)

### Convex Modules

| File | Exports |
|------|---------|
| `convex/profiles.ts` | `get`, `ensureProfile`, `update` |
| `convex/accounts.ts` | `list`, `create`, `update`, `remove` (soft-delete) |
| `convex/categories.ts` | `list`, `create`, `update`, `remove`, `seedSystemCategories` |
| `convex/transactions.ts` | `list`, `getById`, `create`, `update`, `remove` |
| `convex/budgets.ts` | `list`, `upsert`, `remove` |
| `convex/dashboard.ts` | `getSummary` (all dashboard data in one round-trip) |
| `convex/chat.ts` | `list`, `save`, `clearHistory` |
| `convex/lib/auth.ts` | `getAuthUserIds(identity)`, `ownsUserData(userId, identity)` |
| `convex/auth.config.ts` | Clerk JWT config (`CLERK_JWT_ISSUER_DOMAIN`) |

### Auth Helper Notes

Clerk tokens can have a `subject` that differs from `tokenIdentifier` during token migration. `getAuthUserIds` returns both; list queries loop over both IDs. Write mutations always use `identity.tokenIdentifier` as `userId`.

### Known Tech Debt

`transactions.list` and `dashboard.getSummary` call `.collect()` on the full user transaction history and filter/paginate in memory. This works at small scale but will hit Convex read limits as data grows. Fix: use `paginationOpts` + range bounds on `by_userId_date` index.

---

## System Categories (seeded via `categories.seedSystemCategories`)

| Name | Icon | Color |
|------|------|-------|
| Food & Dining | 🍽️ | #F59E0B |
| Transport | 🚗 | #3B82F6 |
| Shopping | 🛍️ | #8B5CF6 |
| Utilities | ⚡ | #10B981 |
| Healthcare | 🏥 | #EF4444 |
| Entertainment | 🎬 | #EC4899 |
| Education | 📚 | #14B8A6 |
| Housing & Rent | 🏠 | #F97316 |
| Subscriptions | 🔄 | #6366F1 |
| Salary | 💼 | #10B981 |
| Freelance | 💻 | #0EA5E9 |
| Investment Returns | 📈 | #22C55E |
| Other | 💰 | #71717A |

---

## UI/UX Specification

### Design System

**Color Palette**:
| Name | Hex | Usage |
|------|-----|-------|
| Background | `#0A0A0A` | Page background |
| Surface | `#1A1A1A` | Cards, modals |
| Surface Hover | `#262626` | Hover states |
| Border | `#27272A` | Dividers, borders |
| Primary | `#10B981` | Positive values, income |
| Danger | `#EF4444` | Negative values, overspend |
| Warning | `#F59E0B` | Alerts, cautions |
| Accent | `#3B82F6` | Interactive elements |
| Text Primary | `#FAFAFA` | Main text |
| Text Secondary | `#71717A` | Muted text |
| Text Tertiary | `#52525B` | Disabled text |

**Typography**:
- Font Family: `Inter` (headings + body), `JetBrains Mono` (numbers/amounts)
- Scale: 12px / 14px / 16px / 18px / 24px / 32px

**Spacing**: 4px base unit (4, 8, 12, 16, 20, 24, 32, 48, 64)

**Border Radius**: 8px (cards), 6px (buttons), 4px (inputs)

### Layout Structure

**Mobile-First** (320px - 768px primary, desktop secondary)

```
┌────────────────────────────────────────┐
│  penny-wise              [⚙️] [Avatar] │  ← Header (sticky)
├────────────────────────────────────────┤
│                                        │
│         [Page Content Area]            │  ← Scrollable
│                                        │
├────────────────────────────────────────┤
│  🏠    💳    📈    💬                   │  ← Bottom Nav
│  Home  Expenses Investments  Chat      │  ← (fixed)
└────────────────────────────────────────┘
```

**Avatar**: Initials fallback (first letter of `fullName` from Clerk), colored circle. Tapping opens settings.

### Navigation

| Tab | Icon | Route | Description |
|-----|------|-------|-------------|
| Home | `home` | `/` | Dashboard overview |
| Expenses | `credit-card` | `/expenses` | Transaction list + add |
| Investments | `trending-up` | `/investments` | Portfolio placeholder (Phase 2) |
| Chat | `message-circle` | `/chat` | AI assistant |

### Pages

#### 0. Onboarding — `/onboarding`

**Trigger**: Shown once after signup if the user has 0 accounts.

**Steps**:
1. **Welcome**: "Let's set up your first account" — brief pitch, skip option
2. **Add Account**: Name (e.g., "HDFC Savings"), type (bank/cash/card/wallet), initial balance, currency
3. **Done**: Redirect to Dashboard

**Rules**:
- Cannot add a transaction until at least one account exists (enforced in Add Transaction form)
- If user skips onboarding, the Dashboard empty state CTA leads back to this flow
- On first load, call `profiles.ensureProfile` to create the Convex profile row

#### 1. Dashboard (Home) — `/`

**Purpose**: "What do I need to know right now?"

**Data source**: `dashboard.getSummary` (single Convex query; returns all fields below)

**Components**:
- **Balance Card**: Total balance across all non-deleted accounts, trend indicator vs. last month
- **This Month Summary**: Total income vs. total expenses for current month, net savings (income − expenses)
- **Spending Chart**: Bar chart grouped by category for current month (top 6 categories)
- **Recent Transactions**: Last 5 transactions (non-transfer), quick add button
- **Quick Actions**: Add expense, Add income, Transfer

**Empty State**: "Start by adding your first account" → triggers onboarding flow

#### 2. Expenses — `/expenses`

**Data source**: `transactions.list` (Convex query with filters and cursor pagination)

**Components**:
- **Filter Bar**: Date range (preset: today/week/month/custom), category, account, type
- **Search**: Full-text search on description (debounced, 300ms; filtered in-memory in Convex handler)
- **Transaction List**: Grouped by date, cursor-based infinite scroll (page size: 20)
- **Floating Add Button**: "+" FAB for quick add
- **Monthly Summary Strip**: Sticky mini-summary (total in/out) while scrolling

**Empty States**:
- No transactions at all: "No transactions yet — tap + to add your first one"
- Active filter returns nothing: "No transactions match your filters" + "Clear filters" button

**Add/Edit Transaction Modal** (bottom sheet on mobile):
- Amount (required; numpad keyboard on mobile; formats as ₹1,00,000 on blur)
- Type toggle: Income / Expense / Transfer
- If Transfer: "From account" + "To account" dropdowns replace single "Account" field
- Category (auto-suggested via AI; shows spinner inline while AI is running; falls back to "Other" on error)
- Account (dropdown; required; shows "Add account" option if none exist)
- Description (text; triggers AI categorization on blur after ≥3 chars)
- Date (date picker; defaults to today)
- Notes (optional)
- Submit → AI categorizes (if description provided) → optimistic insert → calls `transactions.create`

**Edit flow**: Tap a transaction row to open the same modal pre-populated. Long-press shows context menu (Edit / Delete).

**Delete flow**: Confirmation dialog — "Delete this transaction? This cannot be undone." For transfers, `transactions.remove` deletes both paired rows atomically.

**Transfer edit**: Not supported via edit modal — transfers must be deleted and re-created (enforced in `transactions.update`).

#### 3. Investments — `/investments`

**Purpose**: Track investment portfolio (Phase 2)

**MVP**: Show a placeholder card — "Investment tracking coming soon. You can still add investments manually." with an "Add Investment" button that calls a Convex mutation to insert into `investments`.

#### 4. Chat — `/chat`

**MVP**: Basic chat interface. Sends last 20 messages (from `chat.list`) + user's financial snapshot (from `dashboard.getSummary`) as context. Responses streamed via SSE from `/api/chat`.

**Phase 2**: Full RAG on transaction embeddings (Convex vector search or external vector DB).

**Components**:
- **Chat Interface**: Message bubbles, streaming responses (SSE)
- **Preset Questions**: "How much did I spend on food this month?", "What's my biggest expense category?", "Summarize my finances this month"
- **Input**: Text input with send button
- **Empty State**: Shows preset questions prominently

**System Prompt**:
```
You are penny-wise, a helpful personal finance assistant for Indian users.

User's financial snapshot:
- Total balance: {total_balance} INR across {account_count} accounts
- This month: {income} income, {expenses} expenses, {net} net savings
- Top spending categories: {top_categories}

You help users:
- Understand their spending patterns
- Answer questions about their finances
- Provide tax-saving suggestions (80C, HRA, etc.)
- Suggest better financial decisions

Be concise, friendly, and practical.
Always clarify you are not a SEBI-registered financial advisor.
```

#### 5. Settings — `/settings`

**Sections**:
- **Profile**: Name (editable via `profiles.update`), email (read-only from Clerk), avatar initials preview
- **Accounts**: Add/edit/delete bank accounts. Delete calls `accounts.remove` (soft-delete: `isDeleted = true`); transaction history is preserved.
- **Categories**: Add custom categories (name, icon, color) via `categories.create`. System categories visible but not editable/deletable.
- **Budgets**: Set monthly/weekly budget per category or overall via `budgets.upsert`.
- **Data**: Export transactions as CSV (calls `/api/export/transactions`). Delete account (hard delete — requires "Type DELETE to confirm" gate).

### Component Library

| Component | States | Description |
|-----------|--------|-------------|
| `Button` | default, hover, active, disabled, loading | Primary actions |
| `Input` | default, focus, error, disabled | Text/number inputs |
| `AmountInput` | default, focus, error | Number input with INR formatting and numpad |
| `Card` | default, hover | Container for content |
| `Badge` | category colors | Category indicators |
| `TransactionItem` | default, selected, loading (skeleton) | Single transaction row |
| `BalanceCard` | positive, negative, neutral | Account balance display |
| `Chart` | loading, empty, data | Recharts wrapper with skeleton state |
| `Modal` / `BottomSheet` | open, closed, loading | Bottom sheet on mobile, dialog on desktop |
| `Skeleton` | loading | Placeholder during fetch |
| `ConfirmDialog` | open, closed | Destructive action confirmation |
| `Toast` | success, error, warning | Action feedback (via sonner) |

---

## Data Fetching Strategy

With Convex, there is no Zustand cache and no REST API layer for data. Convex queries are reactive — components re-render automatically when data changes.

| Page | Rendering | Data Source |
|------|-----------|-------------|
| Dashboard | Client Component + Convex `useQuery` | `api.dashboard.getSummary` |
| Expenses list | Client Component (infinite scroll) | `api.transactions.list` with cursor |
| Add transaction form | Client Component | `api.accounts.list`, `api.categories.list` |
| Chat | Client Component (streaming) | `api.chat.list` (history) + `/api/chat` SSE |
| Settings | Client Component + Convex `useQuery` | relevant Convex queries |

---

## API Routes (Next.js Route Handlers)

Only two Route Handlers remain — all other data operations use Convex directly.

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/categorize` | AI categorization for a transaction description |
| POST | `/api/chat` | AI chat (SSE streaming) |

### `/api/categorize`

**Input** (Zod validated):
```typescript
{ description: string (max 500), amount: number, type: 'income' | 'expense' | 'transfer' }
```

**Flow**:
1. Validate input with Zod
2. Check in-memory categorization cache (keyed on normalized description; TTL 30 min)
3. If cache miss: send to OpenAI with category list + user corrections
4. Return `{ category, confidence, reasoning }`
5. On any error: return `{ category: 'Other', confidence: 'low', aiCategorized: false }`

**Rate limit**: 30 req/user/min

### `/api/chat`

**Input**: `{ messages: ChatMessage[], financialSnapshot: DashboardSummary }`

**Flow**:
1. Validate; build system prompt with financial snapshot
2. Call OpenAI streaming API
3. Stream tokens via `ReadableStream` + `text/event-stream`
4. Client saves messages via `api.chat.save` after completion

**Rate limit**: 10 req/user/min

**Error handling**: On OpenAI error, return "I'm having trouble connecting right now. Please try again in a moment." — never expose API errors.

---

## AI Features

### Auto-Categorization

**Prompt Template**:
```
You are a personal finance assistant for Indian users. Categorize this transaction:

Transaction: "{description}"
Amount: {amount} INR
Type: {type}

Available categories:
{category_list}

Return ONLY valid JSON:
{
  "category": "<category name from the list>",
  "confidence": "high" | "medium" | "low",
  "reasoning": "<one sentence>"
}
```

**Error handling**: If OpenAI returns an error or times out, silently fall back to category "Other". Never block transaction creation on AI failure.

---

## Project Structure

```
penny-wise/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (app)/
│   │   │   ├── layout.tsx          # App shell with nav + Clerk auth guard
│   │   │   ├── page.tsx            # Dashboard
│   │   │   ├── onboarding/
│   │   │   ├── expenses/
│   │   │   ├── investments/
│   │   │   ├── chat/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── categorize/route.ts # OpenAI categorization
│   │   │   └── chat/route.ts       # OpenAI SSE streaming
│   │   ├── layout.tsx              # Root layout (ConvexClientProvider + ClerkProvider)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                     # shadcn components
│   │   ├── providers/
│   │   │   └── ConvexClientProvider.tsx
│   │   ├── dashboard/
│   │   ├── expenses/
│   │   ├── investments/
│   │   ├── chat/
│   │   ├── settings/
│   │   └── layout/
│   ├── lib/
│   │   ├── format.ts               # INR formatting, date helpers
│   │   └── utils.ts                # cn(), misc
│   └── types/                      # Shared TypeScript types
├── convex/
│   ├── schema.ts                   # All table definitions
│   ├── auth.config.ts              # Clerk JWT config
│   ├── profiles.ts
│   ├── accounts.ts
│   ├── categories.ts
│   ├── transactions.ts
│   ├── budgets.ts
│   ├── dashboard.ts
│   ├── chat.ts
│   ├── lib/
│   │   └── auth.ts                 # getAuthUserIds, ownsUserData
│   └── _generated/                 # Auto-generated by Convex CLI
├── middleware.ts                   # Clerk middleware (protects all non-auth routes)
├── .env.local                      # Never committed
├── .env.example                    # Committed; placeholder values only
├── next.config.ts
├── tailwind.config.ts              # (or Tailwind v4 CSS config)
└── package.json
```

---

## Environment Variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Convex
NEXT_PUBLIC_CONVEX_URL=
CLERK_JWT_ISSUER_DOMAIN=https://<your-clerk-instance>.clerk.accounts.dev  # set in Convex dashboard env vars

# OpenAI
OPENAI_API_KEY=
```

---

## Security Notes

- **Auth in Convex**: Every query/mutation calls `ctx.auth.getUserIdentity()` and verifies ownership via `ownsUserData()` before touching any data.
- **No service role key**: There is no privileged Convex key in frontend code. All user-facing operations use the standard Convex client.
- **XSS**: Sanitize `description` and `notes` before rendering. Never use `dangerouslySetInnerHTML` with user input.
- **CSP**: Set `Content-Security-Policy` headers in `next.config.ts`.
- **IDOR**: `ownsUserData(userId, identity)` is called on every document fetched before returning or mutating it.

---

## Deployment

**Platform**: Vercel (Next.js) + Convex cloud

**Steps**:
1. `npx convex deploy` — deploys schema + functions to Convex cloud
2. Set all environment variables in Vercel dashboard
3. Set `CLERK_JWT_ISSUER_DOMAIN` in Convex dashboard environment variables
4. Configure Clerk production instance with correct redirect URLs
5. `git push` → Vercel auto-deploys

---

## Developer Setup

```bash
# Install dependencies
pnpm install

# Start Convex dev server (runs schema sync + watches functions)
pnpm convex:dev

# In a separate terminal, start Next.js dev server
pnpm dev
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "type-check": "next typegen && tsc --noEmit",
    "convex:dev": "convex dev",
    "convex:deploy": "convex deploy"
  }
}
```

---

## Coding Standards

- **Components**: Use shadcn/ui as base, customize sparingly
- **Styling**: Tailwind CSS only, no inline styles
- **Data fetching**: Convex `useQuery` / `useMutation` in Client Components; no REST layer for data
- **Mutations**: Call Convex mutations directly from Client Components; no Server Actions needed for data ops
- **Validation**: Zod schemas for all API Route Handler inputs (`/api/categorize`, `/api/chat`)
- **Types**: No `any`. Use Convex's generated `Doc<"tableName">` and `Id<"tableName">` types everywhere.
- **Error handling**: Convex mutations throw on error — catch in the component and show a toast. API routes return `{ error: string }` with appropriate HTTP status codes.

---

## Implementation Checklist

### Phase 0 — Project Scaffolding ✅

- [x] Create Next.js project with TypeScript, Tailwind, App Router, src dir
- [x] Install dependencies: `convex`, `@clerk/nextjs`, `openai`, `recharts`, `zod`, `date-fns`, `lucide-react`, `sonner`, etc.
- [x] Install and configure shadcn/ui components
- [x] Configure Tailwind with design system colors and fonts
- [x] Add `globals.css` with CSS variables matching the color palette
- [x] Set up ESLint
- [x] Initialize Convex: `npx convex dev` (generates `convex/_generated/`)
- [x] Create `convex/schema.ts` with all table definitions
- [x] Create `convex/auth.config.ts` for Clerk JWT integration
- [x] Create `convex/lib/auth.ts` helpers
- [x] Create all Convex modules: profiles, accounts, categories, transactions, budgets, dashboard, chat
- [x] Set up Clerk middleware in `middleware.ts`
- [x] Create `ConvexClientProvider` wrapping app with `ConvexProviderWithClerk`

### Phase 1 — Auth UI ✅ (Clerk handles this)

- [x] Create `(auth)/sign-in` page using Clerk `<SignIn />` component
- [x] Create `(auth)/sign-up` page using Clerk `<SignUp />` component
- [x] Middleware protects all `(app)` routes; redirects unauthenticated users to `/sign-in`

### Phase 2 — Core Layout & Navigation

- [ ] Create root `app/layout.tsx` with `<ClerkProvider>` + `<ConvexClientProvider>`, Inter + JetBrains Mono fonts, dark background, `<Toaster />`
- [ ] Create `app/(app)/layout.tsx` with sticky header (logo + settings icon + avatar) and fixed bottom nav; call `profiles.ensureProfile` on mount
- [ ] Create `BottomNav` component with 4 tabs (Home, Expenses, Investments, Chat); active state highlighted
- [ ] Create `Header` component with Clerk avatar (initials fallback, colored circle)
- [ ] Create `app/error.tsx` for app-level error boundary
- [ ] Create `app/not-found.tsx` for 404 page
- [ ] Verify navigation works on mobile (375px) and desktop (1280px)

### Phase 3 — Accounts & Onboarding

- [ ] Create Onboarding page (`/onboarding`) with 2-step flow: Welcome → Add first account (calls `accounts.create`)
- [ ] Add redirect logic in `(app)/layout.tsx`: if `accounts.list` returns empty → redirect to `/onboarding`
- [ ] Create Add Account modal (reused in Settings): name, type dropdown, initial balance, color picker
- [ ] Test: new user sees onboarding; returning user with accounts skips it

### Phase 4 — Categories

- [ ] Call `categories.seedSystemCategories` once during setup (or on first app load if no system categories exist)
- [ ] Create Category badge component (colored dot + name)
- [ ] Settings: categories section with add/edit/delete custom categories

### Phase 5 — Transactions (Core Feature)

- [ ] Create Add/Edit Transaction modal with all fields per spec:
  - [ ] Amount input with INR formatting (JetBrains Mono, numpad keyboard on mobile)
  - [ ] Type toggle (Income / Expense / Transfer)
  - [ ] Transfer mode: "From account" + "To account" selects
  - [ ] Category dropdown (from `useQuery(api.categories.list)`)
  - [ ] Account dropdown (from `useQuery(api.accounts.list)`; shows "Add account" if empty)
  - [ ] Description input (triggers AI categorization on blur ≥3 chars)
  - [ ] Date picker (defaults to today)
  - [ ] Notes textarea (optional)
  - [ ] Submit with loading state; calls `useMutation(api.transactions.create)`
- [ ] Create Expenses page (`/expenses`):
  - [ ] Filter bar (date range presets + custom, category, account, type)
  - [ ] Debounced search input (300ms)
  - [ ] Transaction list grouped by date (infinite scroll with cursor pagination via `transactions.list`)
  - [ ] Each transaction row: icon + description + category badge + amount (red/green) + date
  - [ ] Empty states (no transactions vs. filters return nothing)
  - [ ] Floating "+" button that opens Add Transaction modal
  - [ ] Sticky monthly summary strip
- [ ] Test: add expense, income, transfer; verify account balances update correctly
- [ ] Test: delete transfer — verify both rows removed, balances reversed

### Phase 6 — AI Categorization

- [ ] Create `POST /api/categorize` route handler:
  - [ ] Zod input validation
  - [ ] Rate limit: 30 req/user/min
  - [ ] In-memory cache (keyed on normalized description, TTL 30 min)
  - [ ] Call OpenAI; parse and validate returned category
  - [ ] On error: return `{ category: 'Other', confidence: 'low', aiCategorized: false }`
- [ ] Wire up in Add Transaction modal: call `/api/categorize` on description blur; show inline spinner; auto-select suggested category; user can override
- [ ] Test: Swiggy → Food & Dining, Uber → Transport; test OpenAI timeout fallback

### Phase 7 — Dashboard

- [ ] Create Dashboard page (`/`) as Client Component using `useQuery(api.dashboard.getSummary)`:
  - [ ] Balance Card (total balance)
  - [ ] This Month Summary (income, expenses, net savings)
  - [ ] Spending Chart (Recharts bar chart, top 6 categories; skeleton while loading)
  - [ ] Recent Transactions (last 5; link to Expenses for full list)
  - [ ] Quick Actions row (Add Expense, Add Income, Transfer — open Add Transaction modal with type pre-selected)
  - [ ] Empty state: 0 accounts → onboarding CTA
- [ ] Add skeleton loading state while `getSummary` is pending

### Phase 8 — Chat (MVP)

- [ ] Create `POST /api/chat` route handler (SSE streaming):
  - [ ] Rate limit: 10 req/user/min
  - [ ] Accept `messages` + `financialSnapshot` from client
  - [ ] Build system prompt with financial snapshot
  - [ ] Stream response via `ReadableStream` + `text/event-stream`
- [ ] Create Chat page (`/chat`):
  - [ ] Load history via `useQuery(api.chat.list, { limit: 20 })`
  - [ ] Message bubbles (user right, assistant left)
  - [ ] Streaming response rendering (token by token)
  - [ ] Preset question chips (shown in empty state + above input)
  - [ ] Text input + send button (disabled while streaming)
  - [ ] Auto-scroll to bottom on new message
  - [ ] After stream completes: save user + assistant messages via `useMutation(api.chat.save)`
  - [ ] Error state: "I'm having trouble connecting right now."

### Phase 9 — Settings

- [ ] Create Settings page sections:
  - [ ] **Profile**: Display name (editable via `profiles.update`), email (read-only from `useUser()` Clerk hook), avatar initials
  - [ ] **Accounts**: List all accounts with balance; Add Account (reuses Phase 3 modal); Edit/Delete per account
  - [ ] **Categories**: List system (grayed out) + custom; Add/Edit/Delete custom
  - [ ] **Budgets**: Add/edit overall monthly budget + per-category budgets via `budgets.upsert`
  - [ ] **Data**: "Export as CSV" button; "Delete account" with "Type DELETE to confirm" gate

### Phase 10 — Polish & QA

- [ ] Responsive testing: 375px (iPhone SE), 768px (tablet), 1280px (desktop)
- [ ] Dark mode visual QA: check all components render correctly
- [ ] Test all empty states and error states
- [ ] Verify all forms have proper validation messages
- [ ] Verify toast notifications appear for: transaction created, transaction deleted, account added, error states
- [ ] Add `loading.tsx` skeleton for each route
- [ ] Check for console errors and TypeScript errors (`pnpm type-check`)
- [ ] Run `pnpm lint` and fix all warnings
- [ ] Verify auth flow end-to-end: signup → onboarding → add transaction → logout → login → data persists
- [ ] Verify transfer flow: debit from Account A, credit to Account B, both balances update
- [ ] Verify AI categorization works and falls back gracefully
- [ ] Verify chat streams correctly and saves history

### Phase 11 — Deployment

- [ ] Run `pnpm convex:deploy` — deploy schema + functions to Convex cloud
- [ ] Set `CLERK_JWT_ISSUER_DOMAIN` in Convex dashboard environment variables
- [ ] Seed system categories in production (call `categories.seedSystemCategories` once)
- [ ] Set all environment variables in Vercel dashboard
- [ ] Configure Clerk production instance with correct Vercel redirect URLs
- [ ] Deploy to Vercel: `git push` → auto-deploy
- [ ] Smoke test production: signup, add account, add transaction, AI categorize, chat

---

## Post-MVP Roadmap (Phase 2+)

- [ ] RAG chat: embed transaction history using Convex vector search or external vector DB; semantic search on user queries
- [ ] Kotlin Android app: SMS parsing for auto-transaction capture via broadcast receiver
- [ ] Investment tracking: live NAV for mutual funds (AMFI API), stock prices (NSE/BSE API)
- [ ] Tax report: 80C deductions tracker, HRA calculator, ITR summary export
- [ ] Budget alerts: push notifications when spending exceeds budget threshold
- [ ] Recurring transactions: auto-create transactions on schedule (subscriptions, EMIs)
- [ ] Multi-currency: track exchange rates, convert to base currency for net worth
- [ ] Account sharing: shared expense tracking (splits) with other users
- [ ] Pagination tech debt: migrate `transactions.list` and `dashboard.getSummary` to use Convex `paginationOpts` + index range bounds

---

## Agent Instructions for Future Development

### When Continuing Development

1. **Read this PLAN.md first** — Do not deviate from specifications
2. **Read `convex/_generated/ai/guidelines.md`** — Contains Convex-specific API rules that override training data
3. **Read the Next.js docs in `node_modules/next/dist/docs/`** — This project uses Next.js 16, which has breaking changes from Next.js 14
4. **Run both servers** — `pnpm convex:dev` + `pnpm dev` must both be running
5. **Mobile-first** — Always test on mobile viewport (375px width)
6. **Type safety** — No `any`. Use `Doc<"tableName">` and `Id<"tableName">` from `convex/_generated/dataModel`
7. **AI features** — Use consistent prompt templates; always handle AI errors gracefully

### Feature Addition Protocol

Before adding any new feature:
1. Update this PLAN.md with the feature specification
2. Update `convex/schema.ts` if new tables or fields are needed; run `pnpm convex:dev` to sync
3. Add/update Convex modules for backend logic
4. Implement frontend in a feature branch
5. Test thoroughly including error states

---

## Resources

- [Next.js Docs](https://nextjs.org/docs) + `node_modules/next/dist/docs/`
- [Convex Docs](https://docs.convex.dev)
- [Convex + Clerk Integration](https://docs.convex.dev/auth/clerk)
- [Clerk Next.js Docs](https://clerk.com/docs/nextjs/get-started)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenAI API](https://platform.openai.com/)
- [Recharts](https://recharts.org/)

---

*Last Updated: 2026-04-07*
*Author: Ayush Saini*
