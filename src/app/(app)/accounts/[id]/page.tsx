"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { formatINR } from "@/lib/format";
import { TransactionItem } from "@/components/expenses/TransactionItem";
import { EditAccountSheet } from "@/components/settings/EditAccountSheet";
import { AddTransactionModal } from "@/components/expenses/AddTransactionModal";
import type { Account, Category, Transaction } from "@/types";

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>();
  const accountId = params.id as Id<"accounts">;
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const accounts = (useQuery(api.accounts.list) ?? []) as Account[];
  const categories = (useQuery(api.categories.list) ?? []) as Category[];
  const txResult = useQuery(api.transactions.list, { accountId, limit: 100 });
  const transactions = (txResult?.transactions ?? []) as Transaction[];
  const filteredTransactions = transactions.filter((tx) => tx.date.startsWith(selectedMonth));

  const account = accounts.find((item) => item._id === accountId);
  const categoryMap = new Map(categories.map((c) => [c._id, c]));

  if (!account) {
    return (
      <div className="px-4 py-8 text-sm text-muted-foreground">
        Account not found.
      </div>
    );
  }

  const income = filteredTransactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const outflow = filteredTransactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Link href="/" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-2xl font-semibold">{account.name}</h1>
          <p className="text-sm text-muted-foreground">
            {account.type} · <span className="font-amount text-foreground">{formatINR(account.balance)}</span>
          </p>
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
          aria-label="Edit account"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm">+<span className="font-amount text-income">{formatINR(income)}</span> in</p>
        <p className="text-right text-sm">-<span className="font-amount text-expense">{formatINR(outflow)}</span> out</p>
      </div>
      <div className="mb-4">
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {filteredTransactions.map((tx, idx) => (
          <div key={tx._id} className={idx < filteredTransactions.length - 1 ? "border-b border-border" : ""}>
            <TransactionItem
              transaction={tx}
              category={tx.categoryId ? categoryMap.get(tx.categoryId) : undefined}
              account={account}
              onEdit={(item) => {
                setEditingTx(item);
                setAddOpen(true);
              }}
            />
          </div>
        ))}
        {filteredTransactions.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No transactions for this account yet.</p>
        )}
      </div>

      <EditAccountSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        account={{ _id: account._id, name: account.name, color: account.color }}
      />
      <button
        onClick={() => {
          setEditingTx(null);
          setAddOpen(true);
        }}
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Add transaction to account"
      >
        <Plus className="h-6 w-6" />
      </button>
      <AddTransactionModal
        open={addOpen}
        transaction={editingTx}
        defaultType="expense"
        defaultAccountId={account._id}
        onClose={() => {
          setAddOpen(false);
          setEditingTx(null);
        }}
      />
    </div>
  );
}
