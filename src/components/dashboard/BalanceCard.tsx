"use client";

import { formatINR } from "@/lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  totalBalance: number;
  netSavings: number;
  accountCount: number;
}

export function BalanceCard({ totalBalance, netSavings, accountCount }: BalanceCardProps) {
  const isPositive = netSavings >= 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 mx-4">
      <p className="text-xs text-muted-foreground uppercase tracking-widest">
        Total Balance
      </p>
      <p className="text-4xl font-amount font-bold text-foreground mt-1">
        {formatINR(totalBalance)}
      </p>
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-muted-foreground">
          Across {accountCount} {accountCount === 1 ? "account" : "accounts"}
        </p>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isPositive ? "text-income" : "text-expense"
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>{formatINR(Math.abs(netSavings))} this month</span>
        </div>
      </div>
    </div>
  );
}
