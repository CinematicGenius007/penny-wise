# penny-wise — Phase 2 Plan

> **Goal**: Transform a functional but plain MVP into something that feels *alive*, delightful on every screen, and so simple that anyone picks it up in 10 seconds.
>
> **North star**: The CRED Money tab — your wealth visible at a glance, accounts feel like physical cards, numbers have weight and personality. Not a spreadsheet. A companion.

---

## Current State Audit

### What's working
- Core Convex data layer is solid (all tables, mutations, balance sync)
- Auth (Clerk) and routing work correctly
- Add/Edit/Delete transactions functional
- AI categorization + chat functional
- Onboarding gate works
- Mobile layout is decent

### What's broken or missing
- **Desktop layout is unresolved** — BottomNav is pinned to mobile width (`max-w-lg`), pages expand to `max-w-6xl`, so on desktop the nav drifts left while content fills the full width. There is no sidebar.
- **No account detail view** — you can't tap an account and see its transactions
- **No budget tracking visible anywhere** — `budgets` table exists but is unused in UI
- **Account edit is missing** — only delete exists
- **Native `confirm()` dialogs** — jarring, inconsistent with design
- **Add Transaction modal is a plain vertical form** — functional but un-fun; amount is a small number input buried in the middle
- **Expenses filter bar is a horizontal scroll of date `<input>` and `<Select>` elements** — ugly on desktop, awkward on mobile
- **Chat is fixed-height for mobile viewport** — breaks on desktop
- **Dashboard on desktop looks sparse** — single column of cards stretched wide
- **No spending vs. budget comparison anywhere**
- **No investments page** (just a placeholder stub)
- **No CSV export**
- **No delete account confirmation modal** — using browser `confirm()`
- **Spending chart** — a plain bar chart; category labels are truncated (`v.split(" ")[0]`)
- **Settings page** has leftover commented-out code and a "Layout note" placeholder card

---

## Design Principles for Phase 2

1. **Numbers have weight** — balances count up on load, large font, monospace. They feel real.
2. **Accounts feel physical** — colored cards with gradients, like cards in a wallet. Horizontal carousel on mobile, grid on desktop.
3. **Actions are obvious** — the most common action (add expense) should never require more than 2 taps.
4. **Desktop gets a real layout** — left sidebar replaces BottomNav on `md+`. Pages use a two-column grid where it makes sense.
5. **Empty states are invitations** — not just gray text. A character, a nudge, a single CTA.
6. **Forms feel fast** — amount entry is big and centered. Type is a large, illustrated toggle. Date has quick-pick chips.

---

## Section 1 — Layout & Navigation Overhaul

### Problem
BottomNav works on mobile. On desktop (`md+`) it looks orphaned at the bottom, and content fills the full viewport width without any navigation structure.

### Solution: Responsive Shell

Replace the current single-mode layout with a responsive shell:

```
Mobile (< 768px)                Desktop (≥ 768px)
┌──────────────────┐            ┌────────────┬──────────────────────┐
│  Header (sticky) │            │            │  Header (sticky)     │
├──────────────────┤            │  Sidebar   ├──────────────────────┤
│                  │            │  (fixed,   │                      │
│   Page content   │            │  240px)    │   Page content       │
│                  │            │            │   (max-w-4xl,        │
│                  │            │  nav items │   centered in rest)  │
├──────────────────┤            │  + logo    │                      │
│  BottomNav       │            │  + user    └──────────────────────┘
└──────────────────┘            └────────────
```

**`(app)/layout.tsx` changes:**
- Wrap content in a flex row on `md+`
- Render `<Sidebar>` instead of `<BottomNav>` on `md+` (CSS: `hidden md:flex`)
- Render `<BottomNav>` only on `< md` (CSS: `md:hidden`)
- Main content area: `flex-1 overflow-y-auto` with `md:ml-[240px]` (or flex sibling)

**Sidebar contents:**
- penny-wise logo at top
- Nav items (same 4 as BottomNav) — icon + label, vertical
- Active item: filled pill background (primary/10 + primary text)
- Bottom of sidebar: avatar + name + settings link

**Header changes on desktop:**
- On `md+` the header spans only the main content area (not the sidebar)
- Or: header spans full width and sidebar sits below it — simpler to implement, pick this

**BottomNav on mobile:**
- Keep as-is but fix `max-w-lg` — change to `max-w-none` so it spans full screen width on all mobile sizes

---

## Section 2 — Dashboard Redesign (CRED-inspired)

### 2.1 — Net Worth Hero

Replace the current `BalanceCard` with a full-bleed hero section:

```
┌─────────────────────────────────────────┐
│  your money                             │
│                                         │
│  ₹2,47,850.00          [+] Add          │
│  ↑ ₹12,450 saved this month             │
│                                         │
│  [April 2026 ▼]  (month picker pill)    │
└─────────────────────────────────────────┘
```

- Balance number: `font-amount text-5xl font-bold`. Count-up animation on first load (using a simple requestAnimationFrame counter — no library).
- "saved this month" is green if positive, red if negative. Small trend arrow.
- Month picker: a subtle pill/chip that opens a popover with prev/next month buttons. This lets users browse historical months across the whole dashboard.
- Background: subtle radial gradient from primary/5 to transparent — not a solid card, just a soft glow behind the number.

### 2.2 — Accounts Carousel (CRED-style)

This is the signature change. Accounts become **physical cards**.

**Mobile**: horizontal scroll carousel, cards peek from edge
**Desktop**: 3-column grid (or 2-column if few accounts)

**Each account card:**
```
┌──────────────────────────────┐
│  ████ (account color strip)  │
│                              │
│  HDFC Savings          Bank  │
│                              │
│  ₹1,24,500            →      │
└──────────────────────────────┘
```

- Card background: solid dark (`surface`) with a **left border or top strip** in `account.color` (4px colored accent, not a full gradient — subtler, more premium)
- Account name + type badge
- Balance in `font-amount` — large, prominent
- Tap → navigates to `/accounts/[id]` (filtered transaction view)
- Last card in the row: `+ Add Account` ghost card (dashed border, centered `+` icon)
- Card width: `220px` fixed on mobile (scrollable), `auto` in desktop grid
- Active/selected state: light ring in `account.color` on the card border

**CRED reference behaviors to borrow:**
- Each card slightly elevated (subtle shadow)
- Horizontal scroll with snap points (`scroll-snap-type: x mandatory`)
- The total across all accounts shown above the carousel
- "X accounts" pill as a subtitle under the net worth

### 2.3 — Monthly Pulse (Income vs Expenses)

Replace the flat 2-box income/expenses cards with a more visual treatment:

```
April — ₹12,450 saved

  Earned     ₹80,000   ████████████████████░ 100%
  Spent      ₹67,550   ████████████████░░░░░  84%
```

- Two rows with a progress bar comparing spent vs earned
- The bar width for "Spent" is `(expenses / income) * 100%` clamped to 100%
- Color: income = `primary/green`, expenses = `expense/red`
- If expenses > income: both bars show, expenses bar goes red + animated shake

### 2.4 — Spending Breakdown

Replace the Recharts bar chart with a **horizontal category list** (more readable, no truncated labels):

```
🍽️  Food & Dining    ████████░░  ₹23,400   34%
🚗  Transport        █████░░░░░  ₹14,200   21%
🛍️  Shopping         ████░░░░░░  ₹11,000   16%
⚡  Utilities        ███░░░░░░░   ₹8,500   12%
    Others           ██░░░░░░░░   ₹5,500    8%
```

- Each row: emoji icon + name + progress bar + amount + % share
- Progress bar: thin (4px height), colored with `category.color`, bg is `border`
- Tapping a category row navigates to `/expenses?category=<id>` (pre-filtered)
- "See all" link if more than 5 categories

Keep the Recharts bar chart but make it optional — toggle between "list view" and "chart view" with a small icon button in the section header.

### 2.5 — Budget Callout (new)

If at least one budget is set, show a budget progress section below the spending breakdown:

```
₹45,000 budget  ·  ₹22,100 spent  ·  52% used  →  [Manage]
```

- A single-line banner if no per-category budgets, just an overall number
- If per-category budgets: show a horizontal scroll of small budget cards (category icon + name + mini progress bar + amount left)
- If no budgets set: show a CTA card "Set a monthly budget → [Set up]" that links to settings

### 2.6 — Quick Actions Row

Keep, but make the buttons feel more intentional:

- 3 large pill buttons with colored icons (not tiny outline buttons)
- Labels: "Expense", "Income", "Transfer"
- Expense = red tint, Income = green tint, Transfer = blue tint
- On tap: opens Add Transaction modal with type pre-selected

### 2.7 — Recent Transactions

Keep the list but improve:
- Show 5 items
- Each row: slightly taller (better touch target), category emoji, description, account name in muted small text, amount
- "See all" in header → `/expenses`
- Tap a row → opens edit modal for that transaction

---

## Section 3 — Account Detail Page (`/accounts/[id]`)

New page. Tapping an account card on the dashboard navigates here.

**Layout:**
```
← Back         HDFC Savings
               Bank · ₹1,24,500

[This Month ▼]

  +₹80,000 in      -₹67,550 out

  [Transaction list — same as /expenses but pre-filtered to this account]
```

- Back button → `/` (dashboard)
- Account name + type + balance as a mini-header
- The same `transactions.list` query with `accountId` pre-set
- Reuse `TransactionItem` component
- No filter bar for type/category (keep it simple — you're already filtered to one account)
- FAB for add transaction (pre-selects this account in the modal)
- Edit account button (pencil icon in header) → opens `EditAccountSheet`

**`EditAccountSheet` (new component):**
- Name field
- Color picker (same swatches as create)
- Save button → calls `accounts.update`
- Delete account button at the bottom (opens `ConfirmDeleteDialog`)

---

## Section 4 — Add Transaction — UX Rethink

### Problem
Current modal: a vertical form starting with a tiny toggle, then a number input labeled "Amount (₹)", then selects. It's functional but forgettable.

### New flow: Amount-first, calculator-feel

**Step 1: Amount entry screen**

```
┌────────────────────────────────┐
│                                │
│   [Expense] [Income] [Transfer]│  ← large pill toggle, top
│                                │
│         ₹ 0                   │  ← huge centered amount
│                                │
│   [1] [2] [3]                  │
│   [4] [5] [6]  ← numpad        │
│   [7] [8] [9]                  │
│   [.] [0] [⌫]                  │
│                                │
│   [Continue →]                 │
└────────────────────────────────┘
```

- Full-screen bottom sheet, takes up ~85% of screen height
- Amount displayed large (`text-5xl font-amount`) in the center — updates as user taps numpad
- Type toggle: 3 large pills at top with color feedback
- Numpad: custom component (3×4 grid of circular buttons)
- "Continue →" unlocks after amount > 0

**Step 2: Details screen** (slides up from Step 1)

```
┌────────────────────────────────┐
│ ← ₹1,200 · Expense            │
│                                │
│  Description                   │
│  [Swiggy order…________]       │
│  AI thinking… → Food & Dining  │  ← inline category suggestion
│                                │
│  Account    [HDFC Savings ▼]  │
│  Category   [Food & Dining ▼]  │
│  Date       [Today · Apr 7 ▼]  │
│  Notes      [optional…]        │
│                                │
│  [Save Expense]                │
└────────────────────────────────┘
```

- Header shows amount + type from Step 1 — tapping it goes back to Step 1
- Description triggers AI categorization on blur; the category field shows a subtle "AI: Food & Dining ✓" indicator
- Date has quick-pick chips: **Today**, **Yesterday**, **Custom** (opening a date picker)
- No Label components — just clean placeholder text in inputs

**Desktop behavior:**
- Same sheet but capped at `480px max-w` centered, not full-width

**Edit transaction:**
- Same modal but opens directly to Step 2 (no numpad — amount is inline editable)
- Transfer editing remains: show message "Transfers can't be edited. Delete and recreate."

---

## Section 5 — Expenses Page — Desktop Layout

### Problem
On desktop, the filter bar is a horizontal scroll row of `<Select>` + date `<input>` elements inside a narrow container. It looks like a mobile UI forced onto a big screen.

### Solution: Two-column layout on `md+`

```
Desktop (md+):
┌──────────────────┬────────────────────────────────┐
│  Filters         │  Summary strip                 │
│  (sticky panel)  │  +₹80,000  ·  -₹67,550         │
│                  ├────────────────────────────────┤
│  Type            │  Apr 7                         │
│  [•] All         │    Swiggy order   -₹450        │
│  [ ] Expense     │    Salary         +₹80,000     │
│  [ ] Income      │                                │
│  [ ] Transfer    │  Apr 6                         │
│                  │    Amazon         -₹2,300      │
│  Account         │                                │
│  [All ▼]         │                                │
│                  │                                │
│  Date Range      │                                │
│  [This Month ▼]  │                                │
│                  │                                │
│  [Clear filters] │                                │
└──────────────────┴────────────────────────────────┘
```

**Mobile**: keep existing filter bar but replace raw date inputs with quick-pick chips:

```
[Today] [This Week] [This Month] [All time] [Custom ▼]
```

The chips replace the two date `<input>` fields. "Custom" opens a mini date range picker popover.

**Type filter on mobile**: replace the `<Select>` with 4 inline chips (All / Expense / Income / Transfer) that are scrollable horizontally — no dropdown.

**Account filter**: keep as `<Select>` on mobile (dropdown is fine), render as a grouped list in the desktop filter panel.

---

## Section 6 — Missing Features

### 6.1 — Budget Management (Settings)

Add a Budgets section to Settings:

- List existing budgets: category icon + name + period + amount + delete button
- "Add budget" form: category dropdown (or "Overall"), amount, period toggle (Monthly / Weekly)
- Calls `budgets.upsert` — idempotent, updates if already exists

### 6.2 — Account Edit

Add an edit flow to the accounts list in Settings and to the Account Detail page:
- Edit sheet: name + color picker
- Calls `accounts.update`

### 6.3 — Replace Native `confirm()` Dialogs

Everywhere `confirm()` is used, replace with a `ConfirmDialog` component:
- Built on shadcn `<Dialog>` (already installed)
- Props: `title`, `description`, `confirmLabel`, `onConfirm`, `onCancel`, `destructive?: boolean`
- Destructive variant: confirm button is red
- Used for: delete account, delete category, clear chat history

### 6.4 — CSV Export

Add to Settings > Data:
- "Export transactions" button
- Calls `/api/export/transactions` (GET, returns CSV)
- Route handler: fetch all user transactions from Convex via the Convex HTTP API or a server action, format as CSV, return with `Content-Disposition: attachment; filename=penny-wise-transactions.csv`
- CSV columns: Date, Description, Type, Amount, Category, Account, Notes

### 6.5 — Investments Placeholder (proper)

Replace the current empty stub with a designed placeholder page:

```
📈  Investment tracking coming soon

    In the meantime, you can log investments manually.

    [+ Add investment]   (opens a simple form)
    [Browse your portfolio →]  (list of manually added investments)
```

- `AddInvestmentSheet`: name, type (stock / mutual_fund / fd / etc.), invested amount, current value (optional), purchase date
- Calls `investments.create` mutation (needs to be added to `convex/investments.ts`)
- List view: name + type badge + invested amount + current value + gain/loss %

### 6.6 — Onboarding Polish

Read the current onboarding page and audit against spec — it likely needs:
- Better visual design (match the CRED-inspired cards aesthetic)
- The "Add Account" step should use the same form as the new account card creation

---

## Section 7 — Polish & Micro-interactions

### 7.1 — Number Count-up Animation

On Dashboard hero balance load: count from 0 → actual value over 800ms using `requestAnimationFrame`. Simple, no library needed.

```typescript
function useCountUp(target: number, duration = 800) {
  // returns current animated value
}
```

Apply to: total balance, monthly income, monthly expenses.

### 7.2 — Transaction Add Feedback

After saving a transaction:
- Sonner toast: `"₹450 expense saved 🍽️"` (includes category emoji)
- The FAB button gets a brief scale-pulse animation

### 7.3 — Loading Skeletons that Match Layout

Current skeletons are generic rectangles. Replace with skeletons that mirror the actual layout:
- Dashboard: skeleton that matches the hero + account carousel + monthly pulse layout
- Expenses: skeleton rows that match `TransactionItem` height and structure

### 7.4 — Empty States

| Page/Section | Empty state |
|---|---|
| Dashboard (no transactions) | "Nothing tracked yet. Your first ₹ is waiting." + Expense/Income buttons |
| Expenses (no results) | "Quiet month! 🎉 No transactions match." + Clear filters button |
| Chat | Keep existing (preset questions are good) |
| Accounts carousel | Just the "+ Add Account" ghost card |
| Investments | Designed placeholder (see 6.5) |

### 7.5 — Typography Consistency

- All monetary amounts: `font-amount` (JetBrains Mono) — audit every component for this
- Section labels: `text-xs uppercase tracking-widest text-muted-foreground` — audit for consistency
- Primary actions: `font-medium` not `font-semibold`

---

## Section 8 — Responsiveness Audit Per Page

| Page | Mobile status | Desktop fix needed |
|---|---|---|
| Dashboard | Good | 2-col grid: accounts + monthly summary side by side; chart fills right column |
| Expenses | Functional | Two-column filter + list layout (Section 5) |
| Chat | Fixed mobile height | On desktop: remove fixed height; use `flex-1 min-h-0` inside the sidebar layout |
| Settings | Already has a responsive 2-col grid | Remove the "Layout note" placeholder card; minor polish |
| Onboarding | Unknown | Center card, max-w-sm, same design on all screen sizes |
| Account Detail (new) | New page | Simple single column; no special desktop treatment needed |

---

## Section 9 — Component Inventory (new + modified)

### New components

| Component | Location | Purpose |
|---|---|---|
| `<Sidebar>` | `components/layout/Sidebar.tsx` | Desktop left nav |
| `<AccountCard>` | `components/dashboard/AccountCard.tsx` | Single colored account card |
| `<AccountsCarousel>` | `components/dashboard/AccountsCarousel.tsx` | Horizontal scroll + desktop grid of AccountCards |
| `<MonthlyPulse>` | `components/dashboard/MonthlyPulse.tsx` | Income vs expense progress bars |
| `<SpendingList>` | `components/dashboard/SpendingList.tsx` | Horizontal category rows with progress bars |
| `<BudgetCallout>` | `components/dashboard/BudgetCallout.tsx` | Budget banner / mini cards |
| `<AmountKeypad>` | `components/expenses/AmountKeypad.tsx` | Numpad for amount entry |
| `<AddTransactionFlow>` | `components/expenses/AddTransactionFlow.tsx` | 2-step amount → details flow (replaces current modal) |
| `<ConfirmDialog>` | `components/ui/confirm-dialog.tsx` | Reusable destructive confirmation |
| `<EditAccountSheet>` | `components/settings/EditAccountSheet.tsx` | Edit account name + color |
| `<BudgetForm>` | `components/settings/BudgetForm.tsx` | Add/edit budget |
| `<FilterChips>` | `components/expenses/FilterChips.tsx` | Quick-pick date + type chips |
| `<AddInvestmentSheet>` | `components/investments/AddInvestmentSheet.tsx` | Log investment manually |
| `useCountUp` | `lib/hooks/useCountUp.ts` | Animated number hook |

### Modified components

| Component | Change |
|---|---|
| `<Header>` | On desktop: spans full width above sidebar; on mobile: unchanged |
| `<BottomNav>` | Fix `max-w-lg` → `max-w-none`; render `md:hidden` |
| `<BalanceCard>` | Replaced by new hero section inline in dashboard page |
| `<MonthlySummary>` | Replaced by `<MonthlyPulse>` |
| `<SpendingChart>` | Wrapped: toggle between list view (`SpendingList`) and chart view (existing Recharts bar chart) |
| `<RecentTransactions>` | Tap row → open edit modal |
| `<TransactionItem>` | Taller touch target; better typography |
| `(app)/layout.tsx` | Add sidebar + responsive shell |
| `settings/page.tsx` | Add Budgets section; replace `confirm()` with `ConfirmDialog`; remove placeholder card |

---

## Section 10 — Convex Changes Needed

### New: `convex/investments.ts`

```typescript
// Mutations needed:
create: { name, type, investedAmount, currentValue?, purchaseDate? }
update: { id, currentValue?, name? }
remove: { id }

// Query:
list: returns all user investments
```

### No schema changes needed

All required tables already exist in `convex/schema.ts`.

### `dashboard.getSummary` — budget data

Add budget data to the summary response:
- Fetch `budgets` for the user
- For each budget with a `categoryId`, compute `spent` = sum of expenses in that category this month
- For the overall budget (no `categoryId`), compute `spent` = total expenses this month
- Return `budgets: Array<{ categoryId?, categoryName?, amount, period, spent }>`

---

## Section 11 — Implementation Order

Recommended order to minimize rework and unblock the most visible changes first:

1. **Layout shell** (sidebar + responsive BottomNav fix) — unblocks all desktop work
2. **`ConfirmDialog` component** — unblocks settings cleanup; replaces `confirm()` everywhere
3. **Dashboard redesign** — AccountsCarousel + hero + MonthlyPulse + SpendingList
4. **Add Transaction flow redesign** (numpad + 2-step) — highest UX impact
5. **Account Detail page** + EditAccountSheet
6. **Expenses page desktop layout** + FilterChips
7. **Budget section** (settings + dashboard callout + `dashboard.getSummary` update)
8. **Investments page** (add `convex/investments.ts` + form + list)
9. **CSV export** (`/api/export/transactions`)
10. **Polish pass** — count-up animation, toast feedback with emoji, skeleton audit, empty states

---

## Out of Scope for Phase 2

These remain Phase 3+:

- RAG chat (vector embeddings)
- Kotlin Android SMS parsing
- Live investment prices (AMFI/NSE APIs)
- Tax report / ITR summary
- Recurring transactions
- Multi-currency conversion
- Account sharing / splits
- Push notifications for budget alerts

---

*Phase 2 Plan authored: 2026-04-07*
*Author: Ayush Saini*
