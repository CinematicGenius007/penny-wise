"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { MonthlySummary } from "@/components/dashboard/MonthlySummary";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { AddTransactionModal } from "@/components/expenses/AddTransactionModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ArrowLeftRight } from "lucide-react";
import type { TransactionType } from "@/types";

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const summary = useQuery(api.dashboard.getSummary);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>("expense");

  function openModal(type: TransactionType) {
    setModalType(type);
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-4">
      {/* Balance */}
      <BalanceCard
        totalBalance={summary.totalBalance}
        netSavings={summary.netSavings}
        accountCount={summary.accountCount}
      />

      {/* Month header */}
      <p className="px-4 text-xs text-muted-foreground uppercase tracking-widest">
        {currentMonth}
      </p>

      {/* Monthly summary */}
      <MonthlySummary
        income={summary.monthIncome}
        expenses={summary.monthExpenses}
        netSavings={summary.netSavings}
      />

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

      {/* Spending chart */}
      <SpendingChart data={summary.categorySpend} />

      {/* Recent transactions */}
      <RecentTransactions transactions={summary.recentTransactions} />

      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultType={modalType}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 px-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
