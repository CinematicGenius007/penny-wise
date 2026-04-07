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
import { FilterChips } from "@/components/expenses/FilterChips";

const TransactionTypes: { label: string; value: TransactionType }[] = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Transfer", value: "transfer" },
];

export default function ExpensesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState(startOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [datePreset, setDatePreset] = useState<"today" | "week" | "month" | "all" | "custom">("month");

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
    setDatePreset("month");
  }

  function applyDatePreset(next: "today" | "week" | "month" | "all" | "custom") {
    setDatePreset(next);
    const nowIso = todayISO();
    if (next === "today") {
      setDateFrom(nowIso);
      setDateTo(nowIso);
      return;
    }
    if (next === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setDateFrom(d.toISOString().split("T")[0]);
      setDateTo(nowIso);
      return;
    }
    if (next === "month") {
      setDateFrom(startOfMonthISO());
      setDateTo(nowIso);
      return;
    }
    if (next === "all") {
      setDateFrom("1970-01-01");
      setDateTo("2999-12-31");
    }
  }

  const hasActiveFilters =
    filterType !== "all" || filterAccount !== "all" || debouncedSearch || datePreset !== "month";

  const grouped = groupByDate(transactions);
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex min-h-full flex-col">
      {/* Summary strip */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-2 flex gap-4 text-sm">
        <span className="text-income font-amount font-medium">+{formatINR(totalIncome)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-expense font-amount font-medium">-{formatINR(totalExpenses)}</span>
      </div>

      <div className="grid flex-1 md:grid-cols-[280px_minmax(0,1fr)] md:gap-4 md:px-4 md:py-4">
        <aside className="border-b border-border px-4 py-3 md:sticky md:top-16 md:h-fit md:rounded-xl md:border md:bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-3 md:hidden">
            <FilterChips
              type={filterType}
              onTypeChange={setFilterType}
              datePreset={datePreset}
              onDatePresetChange={applyDatePreset}
            />
          </div>

          <div className="mt-3 hidden md:block">
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Type</p>
            <div className="flex flex-col gap-2">
              <Button variant={filterType === "all" ? "secondary" : "outline"} size="sm" onClick={() => setFilterType("all")}>
                All
              </Button>
              {TransactionTypes.map((item) => (
                <Button
                  key={item.value}
                  variant={filterType === item.value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <Select value={filterAccount} onValueChange={(v) => v !== null && setFilterAccount(v)}>
              <SelectTrigger className="h-9 text-xs">
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
          </div>

          <div className="mt-3 hidden md:flex md:flex-col md:gap-2">
            <Button size="sm" variant={datePreset === "today" ? "secondary" : "outline"} onClick={() => applyDatePreset("today")}>Today</Button>
            <Button size="sm" variant={datePreset === "week" ? "secondary" : "outline"} onClick={() => applyDatePreset("week")}>This week</Button>
            <Button size="sm" variant={datePreset === "month" ? "secondary" : "outline"} onClick={() => applyDatePreset("month")}>This month</Button>
            <Button size="sm" variant={datePreset === "all" ? "secondary" : "outline"} onClick={() => applyDatePreset("all")}>All time</Button>
            <Button size="sm" variant={datePreset === "custom" ? "secondary" : "outline"} onClick={() => setDatePreset("custom")}>Custom</Button>
          </div>

          {datePreset === "custom" && (
            <div className="mt-3 flex gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
            </div>
          )}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2 h-8 text-xs">
              Clear filters
            </Button>
          )}
        </aside>

        <div className="flex-1">
          {result === undefined ? (
            <TransactionListSkeleton />
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-2">
              {hasActiveFilters ? (
                <>
                  <p className="text-sm text-muted-foreground">Quiet month! No transactions match your filters.</p>
                  <button onClick={clearFilters} className="text-xs text-accent underline">
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <p className="text-2xl">💸</p>
                  <p className="text-sm text-muted-foreground">Nothing tracked yet. Your first rupee is waiting.</p>
                  <p className="text-xs text-muted-foreground">Tap + to add expense or income.</p>
                </>
              )}
            </div>
          ) : (
            grouped.map(({ date, items }) => (
              <div key={date}>
                <div className="px-4 py-2 bg-background sticky top-0 z-5">
                  <p className="text-xs text-muted-foreground font-medium">{formatDate(date, "medium")}</p>
                </div>
                <ul className="bg-card mx-4 mb-2 rounded-xl overflow-hidden border border-border md:mx-0">
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
    <div className="space-y-5 px-4 pt-4 md:px-0">
      {[...Array(2)].map((_, section) => (
        <div key={section}>
          <Skeleton className="mb-2 h-4 w-24 rounded" />
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {[...Array(3)].map((__, row) => (
              <div key={row} className={`flex items-center gap-3 px-4 py-3.5 ${row < 2 ? "border-b border-border" : ""}`}>
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-40 rounded" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
