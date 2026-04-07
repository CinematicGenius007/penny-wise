"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { AccountCard } from "@/components/dashboard/AccountCard";
import type { Account } from "@/types";

interface AccountsCarouselProps {
  accounts: Account[];
  hideBalances?: boolean;
}

export function AccountsCarousel({ accounts, hideBalances = false }: AccountsCarouselProps) {
  return (
    <section className="px-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Accounts</p>
        <p className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground">
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
        </p>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
        {accounts.map((account) => (
          <Link key={account._id} href={`/accounts/${account._id}`} className="snap-start">
            <AccountCard account={account} hideBalance={hideBalances} />
          </Link>
        ))}
        <Link
          href="/settings"
          className="flex w-[220px] shrink-0 snap-start items-center justify-center rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground hover:text-foreground md:w-auto"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Account
          </span>
        </Link>
      </div>
    </section>
  );
}
