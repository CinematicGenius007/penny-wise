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
| **Frontend** | Next.js 14 + TypeScript | App Router, Server Components, fullstack capability |
| **Styling** | Tailwind CSS + shadcn/ui | Minimal, customizable, dark mode ready |
| **Backend** | Next.js API Routes + Server Actions | Fullstack in one framework |
| **Database** | Supabase (PostgreSQL + Auth) | Free tier, Row Level Security, included vector support |
| **AI** | OpenAI GPT-4o | Categorization, chat, insights |
| **State** | Zustand | Lightweight, minimal boilerplate |
| **Charts** | Recharts | Lightweight, customizable |
| **Validation** | Zod | Schema validation for all API inputs and env vars |
| **Mobile** | Kotlin Android (future) | SMS parsing for auto-transaction capture |

---

## Database Schema

### Tables

```sql
-- Users (managed by Supabase Auth)
-- profiles table extends auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- NOTE: email is intentionally omitted — always read from auth.users to avoid drift

-- Bank/Cash/Card accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'card', 'wallet')),
  balance DECIMAL(12, 2) DEFAULT 0 CHECK (balance >= 0),
  currency TEXT DEFAULT 'INR',
  color TEXT DEFAULT '#10B981',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- Expense categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL for system categories
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#71717A',
  parent_id UUID REFERENCES categories(id),
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, -- RESTRICT to prevent orphan history
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category_id UUID REFERENCES categories(id),
  description TEXT,
  notes TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- For transfers: links the paired debit+credit rows
  transfer_pair_id UUID,
  to_account_id UUID REFERENCES accounts(id), -- only set when type = 'transfer'
  ai_categorized BOOLEAN DEFAULT FALSE,       -- track whether AI assigned the category
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),  -- NULL means overall budget
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL CHECK (period IN ('monthly', 'weekly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category_id, period)
);

-- Investments (Phase 2+)
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock', 'mutual_fund', 'fd', 'nps', 'ppf', 'other')),
  invested_amount DECIMAL(12, 2) NOT NULL CHECK (invested_amount > 0),
  current_value DECIMAL(12, 2) CHECK (current_value >= 0),
  purchase_date DATE,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat history
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
-- Transactions: primary query pattern (user + date-sorted list)
CREATE INDEX idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX idx_transactions_user_account ON transactions (user_id, account_id);
CREATE INDEX idx_transactions_user_category ON transactions (user_id, category_id);
CREATE INDEX idx_transactions_transfer_pair ON transactions (transfer_pair_id) WHERE transfer_pair_id IS NOT NULL;

-- Accounts: user's account list
CREATE INDEX idx_accounts_user ON accounts (user_id) WHERE is_deleted = FALSE;

-- Categories: user + system categories
CREATE INDEX idx_categories_user ON categories (user_id);

-- Budgets
CREATE INDEX idx_budgets_user ON budgets (user_id);

-- Chat history
CREATE INDEX idx_chat_messages_user_created ON chat_messages (user_id, created_at DESC);
```

### Triggers & Functions

```sql
-- 1. Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Auto-update updated_at columns
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_accounts BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_transactions BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_budgets BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Keep accounts.balance in sync with transactions
CREATE OR REPLACE FUNCTION sync_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    END IF;
    -- transfer rows are handled in pairs by the API; the trigger handles each row independently
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'income' THEN
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse the old effect, apply the new
    IF OLD.type = 'income' THEN
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    END IF;
    IF NEW.type = 'income' THEN
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_balance_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION sync_account_balance();
```

### Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- profiles: users manage only their own profile
CREATE POLICY "profiles: own row" ON profiles FOR ALL USING (auth.uid() = id);

-- accounts: users manage only their own accounts
CREATE POLICY "accounts: own rows" ON accounts FOR ALL USING (auth.uid() = user_id);

-- categories: own categories + read access to system categories
CREATE POLICY "categories: own rows" ON categories FOR SELECT USING (auth.uid() = user_id OR is_system = TRUE);
CREATE POLICY "categories: insert own" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system = FALSE);
CREATE POLICY "categories: update own" ON categories FOR UPDATE USING (auth.uid() = user_id AND is_system = FALSE);
CREATE POLICY "categories: delete own" ON categories FOR DELETE USING (auth.uid() = user_id AND is_system = FALSE);

-- transactions: users manage only their own transactions
CREATE POLICY "transactions: own rows" ON transactions FOR ALL USING (auth.uid() = user_id);

-- budgets: users manage only their own budgets
CREATE POLICY "budgets: own rows" ON budgets FOR ALL USING (auth.uid() = user_id);

-- investments: users manage only their own investments
CREATE POLICY "investments: own rows" ON investments FOR ALL USING (auth.uid() = user_id);

-- chat_messages: users manage only their own messages
CREATE POLICY "chat_messages: own rows" ON chat_messages FOR ALL USING (auth.uid() = user_id);
```

### System Category Seed Data

```sql
-- supabase/seed.sql
INSERT INTO categories (id, user_id, name, icon, color, is_system) VALUES
  (gen_random_uuid(), NULL, 'Food & Dining', '🍽️', '#F59E0B', TRUE),
  (gen_random_uuid(), NULL, 'Transport', '🚗', '#3B82F6', TRUE),
  (gen_random_uuid(), NULL, 'Shopping', '🛍️', '#8B5CF6', TRUE),
  (gen_random_uuid(), NULL, 'Utilities', '⚡', '#10B981', TRUE),
  (gen_random_uuid(), NULL, 'Healthcare', '🏥', '#EF4444', TRUE),
  (gen_random_uuid(), NULL, 'Entertainment', '🎬', '#EC4899', TRUE),
  (gen_random_uuid(), NULL, 'Education', '📚', '#14B8A6', TRUE),
  (gen_random_uuid(), NULL, 'Housing & Rent', '🏠', '#F97316', TRUE),
  (gen_random_uuid(), NULL, 'Subscriptions', '🔄', '#6366F1', TRUE),
  (gen_random_uuid(), NULL, 'Salary', '💼', '#10B981', TRUE),
  (gen_random_uuid(), NULL, 'Freelance', '💻', '#0EA5E9', TRUE),
  (gen_random_uuid(), NULL, 'Investment Returns', '📈', '#22C55E', TRUE),
  (gen_random_uuid(), NULL, 'Other', '💰', '#71717A', TRUE);
```

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

**Avatar**: Initials fallback (first letter of `full_name`), colored circle. Tapping opens settings.

### Navigation

| Tab | Icon | Route | Description |
|-----|------|-------|-------------|
| Home | `home` | `/` | Dashboard overview |
| Expenses | `credit-card` | `/expenses` | Transaction list + add |
| Investments | `trending-up` | `/investments` | Portfolio placeholder (Phase 2) |
| Chat | `message-circle` | `/chat` | AI assistant (basic for MVP, RAG in Phase 2) |

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

#### 1. Dashboard (Home) — `/`

**Purpose**: "What do I need to know right now?"

**Components**:
- **Balance Card**: Total balance across all non-deleted accounts, trend indicator vs. last month
- **This Month Summary**: Total income vs. total expenses for current month, net savings (income − expenses)
- **Spending Chart**: Bar chart grouped by category for current month (server-side aggregation query)
- **Recent Transactions**: Last 5 transactions, quick add button
- **Quick Actions**: Add expense, Add income, Transfer

**Empty State**: "Start by adding your first account" → triggers onboarding flow

**Note**: "Net savings" = income − expenses for the current month. There is no budget-vs-actual tracking on the Dashboard unless a budget is set in Settings; if set, the summary shows "₹X of ₹Y budget used."

#### 2. Expenses — `/expenses`

**Purpose**: View and manage all transactions

**Components**:
- **Filter Bar**: Date range (preset: today/week/month/custom), category, account, type
- **Search**: Full-text search on description (debounced, 300ms)
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
- Submit → AI categorizes (if description provided) → optimistic insert → saves

**Edit flow**: Tap a transaction row to open the same modal pre-populated. Long-press shows context menu (Edit / Delete).

**Delete flow**: Confirmation dialog — "Delete this transaction? This cannot be undone." For transfers, both paired rows are deleted atomically.

#### 3. Investments — `/investments`

**Purpose**: Track investment portfolio (Phase 2)

**MVP**: Show a placeholder card — "Investment tracking coming soon. You can still add investments manually." with an "Add Investment" button that saves to the `investments` table with manual `current_value` entry.

#### 4. Chat — `/chat`

**MVP**: Basic chat interface. Sends last 20 messages + user's financial summary (total balance, top 3 categories this month) as context. No vector RAG for MVP.

**Phase 2**: Full RAG on transaction history using Supabase vector embeddings.

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
- **Profile**: Name (editable), email (read-only from auth.users), avatar initials preview
- **Accounts**: Add/edit/delete bank accounts. Deleting soft-deletes (`is_deleted = TRUE`); existing transaction history is preserved.
- **Categories**: Add custom categories (name, icon, color). System categories are visible but not editable/deletable.
- **Budgets**: Set monthly/weekly budget per category or an overall budget limit.
- **Advanced**: Toggle to show investment tracking tab.
- **Data**: Export transactions as CSV. Delete account (hard delete with "Type DELETE to confirm" gate).

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
| `Toast` | success, error, warning | Action feedback (via shadcn/ui toast) |

---

## State Management

### Zustand Store Shape

```typescript
// src/store/index.ts

interface AppStore {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Accounts (cached after first fetch, invalidated on mutation)
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  removeAccount: (id: string) => void; // soft delete

  // Categories (cached; rarely changes)
  categories: Category[];
  setCategories: (categories: Category[]) => void;

  // Transactions (NOT cached globally — fetched per page with server-side pagination)
  // Optimistic updates only: add to local list, remove on error
  optimisticTransactions: Transaction[];
  addOptimisticTransaction: (tx: Transaction) => void;
  removeOptimisticTransaction: (id: string) => void;

  // UI state
  selectedAccountId: string | null;  // dashboard account filter
  setSelectedAccountId: (id: string | null) => void;
}
```

**Rules**:
- Server Components fetch data directly via Supabase server client (no Zustand)
- Client Components read from Zustand for cached data (accounts, categories), fetch from API for paginated data (transactions)
- Mutations go through Server Actions or API routes; on success, update Zustand cache and call `revalidatePath`
- Optimistic updates: insert transaction into `optimisticTransactions` immediately, remove after server confirms

### Data Fetching Strategy

| Page | Rendering | Data Source |
|------|-----------|-------------|
| Dashboard | Server Component + Suspense | Supabase server client |
| Expenses list | Client Component (infinite scroll) | `/api/transactions/` with cursor pagination |
| Add transaction form | Client Component | Zustand (accounts/categories cache) |
| Chat | Client Component (streaming) | `/api/chat/` SSE |
| Settings | Server Component | Supabase server client |

---

## API Routes

### Defined Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/transactions` | List transactions (paginated, filtered) |
| POST | `/api/transactions` | Create transaction (or transfer pair) |
| GET | `/api/transactions/[id]` | Get single transaction |
| PUT | `/api/transactions/[id]` | Update transaction |
| DELETE | `/api/transactions/[id]` | Delete transaction (or transfer pair) |
| GET | `/api/accounts` | List user's accounts |
| POST | `/api/accounts` | Create account |
| PUT | `/api/accounts/[id]` | Update account |
| DELETE | `/api/accounts/[id]` | Soft-delete account |
| GET | `/api/categories` | List categories (own + system) |
| POST | `/api/categories` | Create custom category |
| PUT | `/api/categories/[id]` | Update custom category |
| DELETE | `/api/categories/[id]` | Delete custom category |
| PATCH | `/api/profiles` | Update profile (full_name, avatar_url) |
| POST | `/api/categorize` | AI categorization for a description |
| POST | `/api/chat` | AI chat (SSE streaming) |
| GET | `/api/export/transactions` | Export transactions as CSV |

### Query Parameters for `GET /api/transactions`

```
?cursor=<uuid>        // cursor-based pagination (last seen id)
&limit=20             // page size (max 100)
&type=expense         // income | expense | transfer
&account_id=<uuid>
&category_id=<uuid>
&date_from=2026-01-01
&date_to=2026-01-31
&search=swiggy        // full-text on description
```

### Validation

All API routes validate inputs with **Zod** before touching the database. Example:

```typescript
const CreateTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'transfer']),
  account_id: z.string().uuid(),
  to_account_id: z.string().uuid().optional(), // required when type = 'transfer'
  category_id: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

### Rate Limiting

- `/api/categorize`: max 30 requests per user per minute (Upstash Redis or in-memory Map with TTL)
- `/api/chat`: max 10 requests per user per minute
- All other routes: max 60 requests per user per minute

---

## AI Features

### Auto-Categorization

**Flow**:
1. User enters description (e.g., "Swiggy order - Biryani")
2. Check categorization cache (Postgres `categorization_cache` table keyed on normalized description)
3. If cache miss: send to OpenAI with category list
4. AI returns suggested category + confidence
5. Cache the result (TTL: 30 days)
6. User can override or confirm; override is stored and used to build per-user few-shot examples in future calls

**Prompt Template**:
```
You are a personal finance assistant for Indian users. Categorize this transaction:

Transaction: "{description}"
Amount: {amount} INR
Type: {type}

Available categories:
{category_list}

Past corrections by this user (learn from these):
{user_corrections}

Return ONLY valid JSON:
{
  "category": "<category name from the list>",
  "confidence": "high" | "medium" | "low",
  "reasoning": "<one sentence>"
}
```

**Error handling**: If OpenAI returns an error or times out, silently fall back to category "Other" and set `ai_categorized = FALSE`. Never block transaction creation on AI failure.

### Chat Assistant

**MVP**: Sends financial snapshot + last 20 messages as context. Responses streamed via SSE.

**Phase 2**: Vector RAG on transaction embeddings stored in Supabase `pgvector`.

**Error handling**: On OpenAI error, show "I'm having trouble connecting right now. Please try again in a moment." — never expose API errors to the user.

---

## Project Structure

```
penny-wise/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx        # handles ?token_hash=...&type=recovery
│   │   │   └── confirm/
│   │   │       └── route.ts        # handles ?token_hash=...&type=email
│   │   ├── (app)/
│   │   │   ├── layout.tsx          # App shell with nav + auth guard
│   │   │   ├── page.tsx            # Dashboard
│   │   │   ├── onboarding/
│   │   │   │   └── page.tsx
│   │   │   ├── expenses/
│   │   │   │   └── page.tsx
│   │   │   ├── investments/
│   │   │   │   └── page.tsx
│   │   │   ├── chat/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   ├── transactions/
│   │   │   │   ├── route.ts        # GET list, POST create
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts    # GET, PUT, DELETE
│   │   │   ├── accounts/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── categories/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── profiles/
│   │   │   │   └── route.ts        # PATCH only
│   │   │   ├── categorize/
│   │   │   │   └── route.ts
│   │   │   ├── chat/
│   │   │   │   └── route.ts        # SSE streaming
│   │   │   └── export/
│   │   │       └── transactions/
│   │   │           └── route.ts
│   │   ├── error.tsx               # App-level error boundary
│   │   ├── not-found.tsx
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                     # shadcn components
│   │   ├── dashboard/
│   │   ├── expenses/
│   │   ├── investments/
│   │   ├── chat/
│   │   └── layout/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser client (@supabase/ssr createBrowserClient)
│   │   │   ├── server.ts           # Server client (@supabase/ssr createServerClient)
│   │   │   └── middleware.ts       # Middleware client for session refresh
│   │   ├── openai/
│   │   │   ├── categorize.ts
│   │   │   └── chat.ts
│   │   ├── validations/
│   │   │   ├── transaction.ts      # Zod schemas
│   │   │   ├── account.ts
│   │   │   └── category.ts
│   │   ├── rate-limit.ts
│   │   └── utils.ts
│   ├── store/
│   │   └── index.ts                # Zustand store
│   └── types/
│       └── database.ts             # Generated via: supabase gen types typescript --local
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # Schema + triggers + RLS + indexes
│   └── seed.sql                    # System categories
├── proxy.ts                        # Root proxy: session refresh + auth redirect
├── .env.local                      # Never committed
├── .env.example                    # Committed; placeholder values only
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # server-only; NEVER use in client components

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

**Validation** (in `src/lib/env.ts` using `@t3-oss/env-nextjs`):

```typescript
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
});
```

---

## Security Notes

- **`SUPABASE_SERVICE_ROLE_KEY`**: Only use in server-side code that does NOT process user-controlled input (e.g., admin triggers). For all user-facing mutations, use the Supabase anon client with RLS.
- **CSRF**: Server Actions are CSRF-protected by Next.js. Route Handlers that mutate state must verify the `Authorization` header or Supabase session cookie.
- **XSS**: Sanitize `description` and `notes` before rendering. Never use `dangerouslySetInnerHTML` with user input.
- **CSP**: Set `Content-Security-Policy` headers in `next.config.js` restricting `script-src` to `'self'` and known CDNs.
- **IDOR**: Always verify `account_id` and `category_id` belong to `auth.uid()` in API routes (not just via RLS — validate explicitly in Zod or query).

---

## Deployment

**Platform**: Vercel

**Build Command**: `npm run build`

**Environment Variables**: Set in Vercel dashboard

**Supabase Auth URLs**: Configure `Site URL` and `Redirect URLs` in Supabase Dashboard → Authentication → URL Configuration to include your Vercel deployment URL.

---

## Developer Setup

```bash
# Install dependencies
npm install

# Start Supabase locally (requires Docker)
npx supabase start

# Generate TypeScript types from local schema
npx supabase gen types typescript --local > src/types/database.ts

# Run migrations locally
npx supabase db push

# Seed system categories
npx supabase db reset  # runs migrations + seed.sql

# Start dev server
npm run dev
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "db:types": "supabase gen types typescript --local > src/types/database.ts",
    "db:reset": "supabase db reset",
    "db:push": "supabase db push"
  }
}
```

---

## Coding Standards

- **Components**: Use shadcn/ui as base, customize sparingly
- **Styling**: Tailwind CSS only, no inline styles
- **State**: Zustand for client cache, Server Components for initial data fetch
- **API**: Next.js Server Actions for mutations within the app, Route Handlers for external API calls (OpenAI)
- **Database**: Supabase server client with TypeScript types; never use service role key for user-facing mutations
- **Validation**: Zod schemas for all API inputs; validate both client-side (UX) and server-side (security)
- **Types**: No `any`. Use `database.ts` generated types everywhere.
- **Error handling**: All API routes return `{ error: string }` on failure with appropriate HTTP status codes

---

## Implementation Checklist

### Phase 0 — Project Scaffolding

- [ ] Create Next.js 14 project: `npx create-next-app@latest penny-wise --typescript --tailwind --app --src-dir`
- [ ] Install dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `zustand`, `zod`, `recharts`, `openai`, `@t3-oss/env-nextjs`
- [ ] Install shadcn/ui: `npx shadcn-ui@latest init`; add components: `button`, `input`, `card`, `badge`, `dialog`, `sheet`, `toast`, `skeleton`, `dropdown-menu`, `select`, `tabs`
- [ ] Configure `tailwind.config.ts` with design system colors and fonts (Inter + JetBrains Mono)
- [ ] Add `globals.css` with CSS variables matching the color palette
- [ ] Configure `next.config.js` with security headers (CSP, X-Frame-Options, HSTS)
- [ ] Create `.env.local` (from `.env.example`) with real Supabase + OpenAI credentials
- [ ] Create `.env.example` with placeholder values; commit this file
- [ ] Set up ESLint: extend `next/core-web-vitals`, add `@typescript-eslint/no-explicit-any: error`
- [ ] Add Prettier config (single quotes, 2-space indent, trailing comma)
- [ ] Initialize Supabase locally: `npx supabase init`
- [ ] Set up `supabase/config.toml` for local dev

### Phase 1 — Database & Auth Foundation

- [ ] Write `supabase/migrations/001_initial_schema.sql`:
  - [ ] Create all tables (profiles, accounts, categories, transactions, budgets, investments, chat_messages)
  - [ ] Add all CHECK constraints (amount > 0, valid enums, balance >= 0)
  - [ ] Add UNIQUE constraints (user_id + name on accounts and categories)
  - [ ] Add all indexes (transactions by user+date, user+account, user+category; accounts by user; etc.)
  - [ ] Write `handle_new_user()` trigger function + trigger on `auth.users`
  - [ ] Write `set_updated_at()` trigger function + attach to all tables with `updated_at`
  - [ ] Write `sync_account_balance()` trigger function + attach AFTER INSERT/UPDATE/DELETE on transactions
  - [ ] Write all RLS `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` statements
- [ ] Write `supabase/seed.sql` with all 13 system categories
- [ ] Test locally: `npx supabase db reset` — verify tables, triggers, and RLS work
- [ ] Generate TypeScript types: `npm run db:types`
- [ ] Create `src/lib/supabase/client.ts` (browser client using `createBrowserClient`)
- [ ] Create `src/lib/supabase/server.ts` (server client using `createServerClient` with cookie store)
- [ ] Create `src/lib/supabase/middleware.ts` (middleware client for session refresh)
- [ ] Create root `middleware.ts` that refreshes session and redirects unauthenticated users away from `(app)` routes
- [ ] Create `src/lib/env.ts` with Zod env validation (fails at build time if vars missing)
- [ ] Create `src/types/database.ts` (generated; add to `.gitignore` if preferred, or commit initial version)

### Phase 2 — Auth UI

- [ ] Create `/login` page: email + password form, "Forgot password?" link, "Don't have an account? Sign up" link
- [ ] Create `/signup` page: full name + email + password form, "Already have an account? Login" link
- [ ] Create `/forgot-password` page: email input form, "Check your email" success state
- [ ] Create `/reset-password` page: new password + confirm, handles `?token_hash=...&type=recovery` from URL
- [ ] Create `/confirm/route.ts`: handles email confirmation callback, redirects to `/` on success
- [ ] Handle auth errors in UI: wrong password, email already exists, unverified email, network error
- [ ] Test full auth flow: signup → email verify → login → logout → forgot password → reset
- [ ] Configure Supabase Auth redirect URLs to include `http://localhost:3000`

### Phase 3 — Core Layout & Navigation

- [ ] Create root `app/layout.tsx` with Inter + JetBrains Mono fonts, dark background, `<Toaster />`
- [ ] Create `app/(app)/layout.tsx` with sticky header (logo + settings icon + avatar) and fixed bottom nav
- [ ] Create `BottomNav` component with 4 tabs (Home, Expenses, Investments, Chat); active state highlighted
- [ ] Create `Header` component with avatar (initials, colored circle based on user name)
- [ ] Create `app/error.tsx` for app-level error boundary
- [ ] Create `app/not-found.tsx` for 404 page
- [ ] Create `app/(app)/loading.tsx` route-level loading skeleton
- [ ] Initialize Zustand store (`src/store/index.ts`) with full shape from spec
- [ ] Verify navigation works on mobile (375px) and desktop (1280px)

### Phase 4 — Accounts & Onboarding

- [ ] Create `GET /api/accounts` route with Zod output validation
- [ ] Create `POST /api/accounts` route with Zod input validation (name, type, initial_balance, currency, color)
- [ ] Create `PUT /api/accounts/[id]` route
- [ ] Create `DELETE /api/accounts/[id]` route (soft-delete: sets `is_deleted = TRUE`)
- [ ] Create Onboarding page (`/onboarding`) with 2-step flow: Welcome → Add first account
- [ ] Add redirect logic in `(app)/layout.tsx`: if user has 0 accounts → redirect to `/onboarding`
- [ ] Create Add Account modal (reused in Settings): name, type dropdown, initial balance, color picker
- [ ] Populate Zustand accounts cache on app load (fetch once in `(app)/layout.tsx`)
- [ ] Test: new user sees onboarding; returning user with accounts skips it

### Phase 5 — Categories

- [ ] Create `GET /api/categories` route (returns own + system categories)
- [ ] Create `POST /api/categories` route (custom categories only, `is_system = FALSE`)
- [ ] Create `PUT /api/categories/[id]` route (own categories only)
- [ ] Create `DELETE /api/categories/[id]` route (own categories only; check if in use — warn user)
- [ ] Populate Zustand categories cache on app load
- [ ] Create Category badge component (colored dot + name)

### Phase 6 — Transactions (Core Feature)

- [ ] Create `GET /api/transactions` route:
  - [ ] Cursor-based pagination (default limit 20)
  - [ ] Filters: type, account_id, category_id, date_from, date_to, search
  - [ ] Returns transactions grouped by date (or raw list — group client-side for flexibility)
- [ ] Create `POST /api/transactions` route:
  - [ ] Zod validation (including: if type=transfer, to_account_id is required and ≠ account_id)
  - [ ] For transfers: create two linked transaction rows in a single DB transaction (debit + credit with same `transfer_pair_id`)
  - [ ] Balance trigger fires automatically per row
- [ ] Create `GET /api/transactions/[id]` route
- [ ] Create `PUT /api/transactions/[id]` route (verify ownership; handle transfer pairs)
- [ ] Create `DELETE /api/transactions/[id]` route (for transfers: delete both rows atomically)
- [ ] Create Add/Edit Transaction modal with all fields per spec:
  - [ ] Amount input with INR formatting (JetBrains Mono, numpad keyboard on mobile)
  - [ ] Type toggle (Income / Expense / Transfer)
  - [ ] Transfer mode: "From account" + "To account" selects
  - [ ] Category dropdown (loaded from Zustand cache)
  - [ ] Account dropdown (loaded from Zustand cache; shows "Add account" if empty)
  - [ ] Description input (triggers AI categorization on blur ≥3 chars)
  - [ ] Date picker (defaults to today)
  - [ ] Notes textarea (optional)
  - [ ] Submit with loading state and optimistic insert
- [ ] Create Expenses page (`/expenses`):
  - [ ] Filter bar (date range presets + custom, category, account, type)
  - [ ] Debounced search input (300ms)
  - [ ] Transaction list grouped by date (infinite scroll with Intersection Observer, cursor-based)
  - [ ] Each transaction row: icon + description + category badge + amount (red/green) + date
  - [ ] Empty states (no transactions vs. filters return nothing)
  - [ ] Floating "+" button that opens Add Transaction modal
  - [ ] Sticky monthly summary strip
- [ ] Implement optimistic updates: add to `optimisticTransactions` in Zustand on submit, remove on server confirm or error
- [ ] Test: add expense, income, transfer; verify account balances update correctly

### Phase 7 — AI Categorization

- [ ] Create `src/lib/openai/categorize.ts` with the prompt template from spec
- [ ] Create `POST /api/categorize` route:
  - [ ] Zod input: description (string, max 500), amount (number), type (enum)
  - [ ] Rate limit: 30 req/user/min
  - [ ] Check/set categorization cache (Postgres table or in-memory for MVP)
  - [ ] Call OpenAI; parse JSON response; validate returned category exists in user's category list
  - [ ] On error: return `{ category: 'Other', confidence: 'low', ai_categorized: false }`
- [ ] Wire up in Add Transaction modal: call `/api/categorize` on description blur; show spinner inline in category field; auto-select suggested category; user can override
- [ ] Test: Swiggy → Food & Dining, Uber → Transport, Amazon → Shopping; test OpenAI timeout fallback

### Phase 8 — Dashboard

- [ ] Create Dashboard aggregation queries (server-side):
  - [ ] Total balance: `SUM(balance)` from non-deleted accounts
  - [ ] This month income: `SUM(amount) WHERE type='income' AND date >= start_of_month`
  - [ ] This month expenses: `SUM(amount) WHERE type='expense' AND date >= start_of_month`
  - [ ] Spending by category: `GROUP BY category_id` for current month
- [ ] Create Dashboard page (`/`) as Server Component with Suspense boundaries:
  - [ ] Balance Card (total balance, trend vs. last month)
  - [ ] This Month Summary (income, expenses, net savings; or budget progress if budget is set)
  - [ ] Spending Chart (Recharts bar chart by category; skeleton while loading)
  - [ ] Recent Transactions (last 5; link to Expenses for full list)
  - [ ] Quick Actions row (Add Expense, Add Income, Transfer — all open Add Transaction modal with type pre-selected)
  - [ ] Empty state: 0 accounts → onboarding CTA
- [ ] Add `loading.tsx` for Dashboard with skeleton placeholders

### Phase 9 — Chat (MVP)

- [ ] Create `src/lib/openai/chat.ts` with system prompt template
- [ ] Create `POST /api/chat` route (SSE streaming):
  - [ ] Rate limit: 10 req/user/min
  - [ ] Build financial snapshot (total balance, this month income/expenses, top 3 categories)
  - [ ] Fetch last 20 chat messages from `chat_messages`
  - [ ] Stream response via `ReadableStream` + `text/event-stream`
  - [ ] Save user message + assistant response to `chat_messages` after completion
- [ ] Create Chat page (`/chat`):
  - [ ] Message bubbles (user right, assistant left)
  - [ ] Streaming response rendering (token by token)
  - [ ] Preset question chips (shown in empty state + above input)
  - [ ] Text input + send button (disabled while streaming)
  - [ ] Auto-scroll to bottom on new message
  - [ ] Error state: "I'm having trouble connecting right now."

### Phase 10 — Settings

- [ ] Create Settings page sections:
  - [ ] **Profile**: Display name (editable via `PATCH /api/profiles`), email (read-only), avatar initials
  - [ ] **Accounts**: List all accounts with balance; Add Account button (reuses Phase 4 modal); Edit/Delete per account
  - [ ] **Categories**: List system (grayed out, non-editable) + custom categories; Add/Edit/Delete custom
  - [ ] **Budgets**: Add/edit overall monthly budget + per-category budgets
  - [ ] **Data**: "Export as CSV" button (calls `GET /api/export/transactions`); "Delete account" with confirmation ("Type DELETE to confirm")
- [ ] Create `GET /api/export/transactions` route (returns CSV with all user transactions; streams for large datasets)

### Phase 11 — Polish & QA

- [ ] Responsive testing: 375px (iPhone SE), 768px (tablet), 1280px (desktop)
- [ ] Dark mode visual QA: check all components render correctly
- [ ] Test all empty states and error states
- [ ] Verify all forms have proper validation messages
- [ ] Verify toast notifications appear for: transaction created, transaction deleted, account added, error states
- [ ] Add `loading.tsx` for each route group that doesn't have one
- [ ] Check for console errors and TypeScript errors (`npm run type-check`)
- [ ] Run `npm run lint` and fix all warnings
- [ ] Verify auth flow end-to-end: signup → onboarding → add transaction → logout → login → data persists
- [ ] Verify transfer flow: debit from Account A, credit to Account B, both balances update
- [ ] Verify AI categorization works and falls back gracefully
- [ ] Verify chat streams correctly and saves history
- [ ] Verify CSV export downloads correctly

### Phase 12 — Deployment

- [ ] Push migrations to Supabase cloud (`npx supabase db push --linked`)
- [ ] Run seed file on cloud Supabase (system categories)
- [ ] Set all environment variables in Vercel dashboard
- [ ] Configure Supabase Auth: Site URL and Redirect URLs to production domain
- [ ] Deploy to Vercel: `git push` → auto-deploy
- [ ] Smoke test production: signup, add account, add transaction, AI categorize, chat
- [ ] Set up Vercel domain (if custom domain)

---

## Post-MVP Roadmap (Phase 2+)

- [ ] RAG chat: embed transaction history with `pgvector`, semantic search on user queries
- [ ] Kotlin Android app: SMS parsing for auto-transaction capture via broadcast receiver
- [ ] Investment tracking: live NAV for mutual funds (AMFI API), stock prices (NSE/BSE API)
- [ ] Tax report: 80C deductions tracker, HRA calculator, ITR summary export
- [ ] Budget alerts: push notifications when spending exceeds budget threshold
- [ ] Recurring transactions: auto-create transactions on schedule (subscriptions, EMIs)
- [ ] Multi-currency: track exchange rates, convert to base currency for net worth
- [ ] Account sharing: shared expense tracking (splits) with other users

---

## Agent Instructions for Future Development

### When Continuing Development

1. **Read this PLAN.md first** — Do not deviate from specifications
2. **Check Supabase credentials** — Verify env vars from `.env.local`
3. **Test locally first** — Run `npx supabase start` then `npm run dev`
4. **Mobile-first** — Always test on mobile viewport (375px width)
5. **Type safety** — Use TypeScript strictly, no `any` types; use generated `database.ts` types
6. **AI features** — Use consistent prompt templates; always handle AI errors gracefully

### Feature Addition Protocol

Before adding any new feature:
1. Update this PLAN.md with the feature specification
2. Add database migrations if needed; run `npm run db:types` to regenerate types
3. Implement in a feature branch
4. Test thoroughly including error states
5. Update README if applicable

---

## Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase + Next.js App Router Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenAI API](https://platform.openai.com/)
- [Recharts](https://recharts.org/)
- [@t3-oss/env-nextjs](https://env.t3.gg/)

---

*Last Updated: 2026-04-06*
*Author: Ayush Saini*
