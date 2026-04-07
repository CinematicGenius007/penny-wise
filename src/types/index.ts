import type { Id } from "../../convex/_generated/dataModel";

export type AccountType = "bank" | "cash" | "card" | "wallet";
export type TransactionType = "income" | "expense" | "transfer";
export type BudgetPeriod = "monthly" | "weekly";
export type InvestmentType = "stock" | "mutual_fund" | "fd" | "nps" | "ppf" | "other";
export type MessageRole = "user" | "assistant";

export interface Account {
  _id: Id<"accounts">;
  _creationTime: number;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
  isDeleted: boolean;
}

export interface Category {
  _id: Id<"categories">;
  _creationTime: number;
  userId?: string;
  name: string;
  icon: string;
  color: string;
  isSystem: boolean;
}

export interface Transaction {
  _id: Id<"transactions">;
  _creationTime: number;
  userId: string;
  accountId: Id<"accounts">;
  amount: number;
  type: TransactionType;
  categoryId?: Id<"categories">;
  description?: string;
  notes?: string;
  date: string;
  transferPairId?: string;
  toAccountId?: Id<"accounts">;
  aiCategorized: boolean;
}

export interface Budget {
  _id: Id<"budgets">;
  _creationTime: number;
  userId: string;
  categoryId?: Id<"categories">;
  amount: number;
  period: BudgetPeriod;
}

export interface ChatMessage {
  _id: Id<"chatMessages">;
  _creationTime: number;
  userId: string;
  role: MessageRole;
  content: string;
}

export interface DashboardSummary {
  totalBalance: number;
  accountCount: number;
  monthIncome: number;
  monthExpenses: number;
  netSavings: number;
  categorySpend: Array<{
    name: string;
    icon: string;
    color: string;
    amount: number;
  }>;
  recentTransactions: Array<
    Transaction & {
      category: Category | null;
      account: Account | null;
    }
  >;
  accounts: Account[];
  budgets: Array<{
    _id: Id<"budgets">;
    categoryId?: Id<"categories">;
    categoryName: string | null;
    categoryIcon: string | null;
    amount: number;
    period: BudgetPeriod;
    spent: number;
  }>;
}
