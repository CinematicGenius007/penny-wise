"use client";

import Link from "next/link";
import { formatINR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/types";
import { ArrowRight } from "lucide-react";

type RecentTx = DashboardSummary["recentTransactions"][number];

interface RecentTransactionsProps {
  transactions: RecentTx[];
  onEdit?: (tx: RecentTx) => void;
}

export function RecentTransactions({ transactions, onEdit }: RecentTransactionsProps) {
  if (!transactions.length) {
    return (
      <div className="mx-4 bg-card border border-border rounded-xl p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent Transactions</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing tracked yet. Your first rupee is waiting.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-4 bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent Transactions</p>
        <Link
          href="/expenses"
          className="text-xs text-accent flex items-center gap-1 hover:underline"
        >
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <ul>
        {transactions.map((tx, i) => (
          <li
            key={tx._id}
            className={cn(
              "flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors",
              i < transactions.length - 1 && "border-b border-border"
            )}
            onClick={() => onEdit?.(tx)}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
              style={{ backgroundColor: (tx.category?.color ?? "#71717a") + "20" }}
            >
              {tx.category?.icon ?? "💸"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {tx.description ?? tx.category?.name ?? "Transaction"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(tx.date, "short")}
                {tx.account && (
                  <> · {tx.account.name}</>
                )}
              </p>
            </div>
            <span
              className={cn(
                "text-sm font-amount font-semibold flex-shrink-0",
                tx.type === "income" ? "text-income" : "text-expense"
              )}
            >
              {tx.type === "income" ? "+" : "-"}{formatINR(tx.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
