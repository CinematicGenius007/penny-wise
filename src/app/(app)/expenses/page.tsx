"use client";

import { useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { TransactionItem } from "@/components/expenses/TransactionItem";
import { AddTransactionModal } from "@/components/expenses/AddTransactionModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { groupByDate, formatDate, formatINR, startOfMonthISO, todayISO } from "@/lib/format";
import { Plus, Search, X } from "lucide-react";
import type { Transaction, TransactionType, Account, Category } from "@/types";

const TransactionTypes: { label: string; value: TransactionType }[] = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Transfer", value: "transfer" },
];

const TransactionTypeColors: Record<TransactionType, string> = {
  expense: "text-expense",
  income: "text-income",
  transfer: "text-muted-foreground",
};

export default function ExpensesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState(startOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accounts = useQuery(api.accounts.list) ?? [];
  const categories = useQuery(api.categories.list) ?? [];

  const result = useQuery(api.transactions.list, {
    limit: 50,
    search: debouncedSearch || undefined,
    type: filterType !== "all" ? filterType : undefined,
    accountId: filterAccount !== "all" ? (filterAccount as Id<"accounts">) : undefined,
    dateFrom,
    dateTo,
  });

  const transactions: Transaction[] = (result?.transactions ?? []) as Transaction[];

  const accountMap = new Map(accounts.map((a: Account) => [a._id, a]));
  const categoryMap = new Map(categories.map((c: Category) => [c._id, c]));

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setFilterType("all");
    setFilterAccount("all");
    setDateFrom(startOfMonthISO());
    setDateTo(todayISO());
  }

  const hasActiveFilters =
    filterType !== "all" || filterAccount !== "all" || debouncedSearch;

  const grouped = groupByDate(transactions);
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex flex-col min-h-full">
      {/* Summary strip */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-2 flex gap-4 text-sm">
        <span className="text-income font-amount font-medium">+{formatINR(totalIncome)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-expense font-amount font-medium">-{formatINR(totalExpenses)}</span>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 flex flex-col gap-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Select value={filterType} onValueChange={(v) => v !== null && setFilterType(v as typeof filterType)}>
            <SelectTrigger className="w-32 shrink-0 h-8 text-xs">
              <SelectValue placeholder="Type">
                {filterType === "all"
                  ? "All types"
                  : TransactionTypes.find((t) => t.value === filterType)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="transfer">Transfers</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAccount} onValueChange={(v) => v !== null && setFilterAccount(v)}>
            <SelectTrigger className="w-36 shrink-0 h-8 text-xs">
              <SelectValue placeholder="Account">
                {filterAccount === "all" ? "All accounts" : accounts.find((a: { _id: string }) => a._id === filterAccount)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((a: { _id: string; name: string }) => (
                <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36 shrink-0 h-8 text-xs"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36 shrink-0 h-8 text-xs"
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 h-8 text-xs">
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Transaction list */}
      <div className="flex-1">
        {result === undefined ? (
          <TransactionListSkeleton />
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-2">
            {hasActiveFilters ? (
              <>
                <p className="text-sm text-muted-foreground">No transactions match your filters.</p>
                <button onClick={clearFilters} className="text-xs text-accent underline">
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p className="text-2xl">💸</p>
                <p className="text-sm text-muted-foreground">No transactions yet.</p>
                <p className="text-xs text-muted-foreground">Tap + to add your first one.</p>
              </>
            )}
          </div>
        ) : (
          grouped.map(({ date, items }) => (
            <div key={date}>
              <div className="px-4 py-2 bg-background sticky top-22 z-5">
                <p className="text-xs text-muted-foreground font-medium">{formatDate(date, "medium")}</p>
              </div>
              <ul className="bg-card mx-4 mb-2 rounded-xl overflow-hidden border border-border">
                {items.map((tx, i) => (
                  <li key={tx._id} className={i < items.length - 1 ? "border-b border-border" : ""}>
                    <TransactionItem
                      transaction={tx}
                      category={tx.categoryId ? categoryMap.get(tx.categoryId) : undefined}
                      account={accountMap.get(tx.accountId)}
                      onEdit={(t) => { setEditingTx(t); setModalOpen(true); }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditingTx(null); setModalOpen(true); }}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-20"
        aria-label="Add transaction"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AddTransactionModal
        open={modalOpen}
        transaction={editingTx}
        onClose={() => { setModalOpen(false); setEditingTx(null); }}
      />
    </div>
  );
}

function TransactionListSkeleton() {
  return (
    <div className="px-4 pt-4 flex flex-col gap-3">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
