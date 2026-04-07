"use client";

import { ChevronRight } from "lucide-react";
import { formatINR, maskINR } from "@/lib/format";
import type { Account } from "@/types";
import { cn } from "@/lib/utils";

interface AccountCardProps {
  account: Account;
  active?: boolean;
  hideBalance?: boolean;
}

export function AccountCard({ account, active = false, hideBalance = false }: AccountCardProps) {
  const activeStyle = active ? { borderColor: account.color } : undefined;

  return (
    <div
      className={cn(
        "w-[220px] shrink-0 rounded-2xl border border-border bg-card p-4 shadow-sm md:w-auto",
        active && "shadow-md"
      )}
      style={activeStyle}
    >
      <div className="mb-4 h-1 w-full rounded-full" style={{ backgroundColor: account.color }} />
      <div className="mb-5 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{account.name}</p>
        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
          {account.type}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xl font-amount font-bold">{hideBalance ? maskINR(account.balance) : formatINR(account.balance)}</p>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
