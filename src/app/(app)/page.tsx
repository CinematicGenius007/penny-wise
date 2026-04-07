"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { AccountsCarousel } from "@/components/dashboard/AccountsCarousel";
import { MonthlyPulse } from "@/components/dashboard/MonthlyPulse";
import { SpendingList } from "@/components/dashboard/SpendingList";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { BudgetCallout } from "@/components/dashboard/BudgetCallout";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { AddTransactionModal } from "@/components/expenses/AddTransactionModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ArrowLeftRight, TrendingDown, TrendingUp, BarChart3, List, Eye, EyeOff } from "lucide-react";
import type { Transaction, TransactionType } from "@/types";
import { formatINR, maskINR } from "@/lib/format";
import { useCountUp } from "@/lib/hooks/useCountUp";

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const summary = useQuery(api.dashboard.getSummary);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>("expense");
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [spendingView, setSpendingView] = useState<"list" | "chart">("list");
  const [hideBalances, setHideBalances] = useState(true);
  const animatedBalance = useCountUp(summary?.totalBalance ?? 0);

  function openModal(type: TransactionType) {
    setModalType(type);
    setEditingTx(null);
    setModalOpen(true);
  }

  if (!isLoaded || summary === undefined) {
    return <DashboardSkeleton />;
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4 py-8">
        <div className="flex w-full flex-col gap-4 rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Locked
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to view your dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            We need your authenticated session before we can load balances, spending insights, and recent transactions.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4 py-8">
        <div className="flex w-full flex-col gap-3 rounded-3xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            We couldn’t load your workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            This usually means the app is signed in but Convex is not receiving a valid Clerk token yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Check that the Clerk Convex integration or `convex` JWT template is enabled, then reload.
          </p>
        </div>
      </div>
    );
  }

  const currentMonth = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });
  const isSaving = summary.netSavings >= 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-4">
      <section className="relative mx-4 overflow-hidden rounded-2xl border border-border bg-card p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_50%)]" />
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your money</p>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setHideBalances((prev) => !prev)}
            aria-label={hideBalances ? "Show balances" : "Hide balances"}
          >
            {hideBalances ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>
        <p className="relative mt-2 text-4xl font-bold font-amount md:text-5xl">
          {hideBalances ? maskINR(animatedBalance) : formatINR(animatedBalance)}
        </p>
        <div className="relative mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-sm">
            {isSaving ? (
              <TrendingUp className="h-4 w-4 text-income" />
            ) : (
              <TrendingDown className="h-4 w-4 text-expense" />
            )}
            <span className={isSaving ? "text-income" : "text-expense"}>
              {formatINR(Math.abs(summary.netSavings))} {isSaving ? "saved" : "overspent"} this month
            </span>
          </div>
          <p className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            {currentMonth}
          </p>
        </div>
      </section>

      <AccountsCarousel accounts={summary.accounts} hideBalances={hideBalances} />
      <MonthlyPulse income={summary.monthIncome} expenses={summary.monthExpenses} />

      {/* Quick actions */}
      <div className="mx-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 border-expense/30 text-expense hover:bg-expense/10"
          onClick={() => openModal("expense")}
        >
          <Minus className="w-4 h-4" />
          Expense
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 border-income/30 text-income hover:bg-income/10"
          onClick={() => openModal("income")}
        >
          <Plus className="w-4 h-4" />
          Income
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 border-accent/30 text-accent hover:bg-accent/10"
          onClick={() => openModal("transfer")}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Transfer
        </Button>
      </div>

      <div className="mx-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Spending View</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => setSpendingView((prev) => (prev === "list" ? "chart" : "list"))}
        >
          {spendingView === "list" ? <BarChart3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
        </Button>
      </div>
      {spendingView === "list" ? <SpendingList data={summary.categorySpend} /> : <SpendingChart data={summary.categorySpend} />}
      <BudgetCallout budgets={summary.budgets} />

      {/* Recent transactions */}
      <RecentTransactions
        transactions={summary.recentTransactions}
        onEdit={(tx) => {
          setEditingTx(tx);
          setModalOpen(true);
        }}
      />

      <AddTransactionModal
        open={modalOpen}
        transaction={editingTx}
        onClose={() => {
          setModalOpen(false);
          setEditingTx(null);
        }}
        defaultType={modalType}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="flex gap-3 overflow-hidden">
        <Skeleton className="h-28 w-[220px] shrink-0 rounded-2xl" />
        <Skeleton className="h-28 w-[220px] shrink-0 rounded-2xl" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-10 rounded-full" />
        <Skeleton className="h-10 rounded-full" />
        <Skeleton className="h-10 rounded-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
