"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { todayISO } from "@/lib/format";
import type { Transaction, TransactionType } from "@/types";

const EMPTY_ACCOUNTS: Array<{ _id: string; name: string }> = [];
const EMPTY_CATEGORIES: Array<{ _id: string; icon: string; name: string }> = [];

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  transaction?: Transaction | null;
}

export function AddTransactionModal({
  open,
  onClose,
  defaultType = "expense",
  transaction,
}: AddTransactionModalProps) {
  const createTx = useMutation(api.transactions.create);
  const updateTx = useMutation(api.transactions.update);
  const rawAccounts = useQuery(api.accounts.list);
  const rawCategories = useQuery(api.categories.list);
  const accounts = rawAccounts ?? EMPTY_ACCOUNTS;
  const categories = rawCategories ?? EMPTY_CATEGORIES;
  const isEditing = transaction !== null && transaction !== undefined;

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISO());
  const [accountId, setAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categorizing, setCategorizing] = useState(false);
  const [loading, setLoading] = useState(false);

  function resetForm(nextDefaultType: TransactionType) {
    setType(nextDefaultType);
    setAmount("");
    setDescription("");
    setNotes("");
    setDate(todayISO());
    setCategoryId("");
    setToAccountId("");
  }

  // Pre-select first account when creating
  useEffect(() => {
    if (!isEditing && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0]._id);
    }
  }, [accounts, accountId, isEditing]);

  // Sync form state when the transaction being edited changes or when switching back to create mode.
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setDescription(transaction.description ?? "");
      setNotes(transaction.notes ?? "");
      setDate(transaction.date);
      setAccountId(transaction.accountId);
      setToAccountId(transaction.toAccountId ?? "");
      setCategoryId(transaction.categoryId ?? "");
      return;
    }

    resetForm(defaultType);
  }, [defaultType, transaction]);

  async function handleDescriptionBlur() {
    if (isEditing) return;
    if (!description.trim() || description.length < 3 || categoryId) return;
    setCategorizing(true);
    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: parseFloat(amount) || 0,
          type,
          categories: categories.map((c) => c.name),
        }),
      });
      if (res.ok) {
        const data = await res.json() as { category?: string };
        const matched = categories.find((c) => c.name === data.category);
        if (matched) setCategoryId(matched._id);
      }
    } catch {
      // Silent fallback — AI categorization is non-blocking
    } finally {
      setCategorizing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return toast.error("Enter a valid amount");
    if (!accountId) return toast.error("Select an account");
    if (type === "transfer" && !toAccountId) return toast.error("Select a destination account");
    if (type === "transfer" && toAccountId === accountId) return toast.error("From and To accounts must differ");
    if (isEditing && type === "transfer") return toast.error("Transfers can’t be edited yet");

    setLoading(true);
    try {
      if (transaction) {
        await updateTx({
          id: transaction._id,
          amount: parsedAmount,
          categoryId: categoryId ? (categoryId as Id<"categories">) : undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
          date,
        });
        toast.success("Transaction updated!");
      } else {
        await createTx({
          accountId: accountId as Id<"accounts">,
          amount: parsedAmount,
          type,
          categoryId: categoryId ? (categoryId as Id<"categories">) : undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
          date,
          toAccountId: type === "transfer" ? (toAccountId as Id<"accounts">) : undefined,
          aiCategorized: categorizing ? false : !!categoryId,
        });

        toast.success(
          type === "income"
            ? "Income added!"
            : type === "expense"
            ? "Expense added!"
            : "Transfer recorded!"
        );
      }

      resetForm(defaultType);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  }

  const typeColors = {
    income: "text-income border-income",
    expense: "text-expense border-expense",
    transfer: "text-accent border-accent",
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Transaction" : "Add Transaction"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4 pb-6 px-4">
          {/* Type toggle */}
          {!isEditing && (
            <div className="flex gap-2">
              {(["expense", "income", "transfer"] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    type === t ? typeColors[t] + " bg-current/10" : "border-border text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-amount text-xl h-12"
              required
            />
          </div>

          {/* From account */}
          <div className="flex flex-col gap-1.5">
            <Label>{type === "transfer" ? "From Account" : "Account"}</Label>
            <Select value={accountId} onValueChange={(v) => v !== null && setAccountId(v)}>
              <SelectTrigger disabled={isEditing}>
                <SelectValue placeholder="Select account">
                  {accounts.find((a: { _id: string }) => a._id === accountId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a: { _id: string; name: string }) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To account (transfers only) */}
          {type === "transfer" && (
            <div className="flex flex-col gap-1.5">
              <Label>To Account</Label>
              <Select value={toAccountId} onValueChange={(v) => v !== null && setToAccountId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account">
                    {accounts.find((a: { _id: string }) => a._id === toAccountId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a: { _id: string }) => a._id !== accountId)
                    .map((a: { _id: string; name: string }) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input
              placeholder="e.g. Swiggy order, Salary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
            />
          </div>

          {/* Category */}
          {type !== "transfer" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Category</Label>
                {categorizing && (
                  <span className="text-xs text-muted-foreground animate-pulse">AI thinking…</span>
                )}
              </div>
              <Select value={categoryId} onValueChange={(v) => v !== null && setCategoryId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category">
                    {categories.find((c: { _id: string }) => c._id === categoryId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: { _id: string; icon: string; name: string }) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayISO()}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any additional details…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? "Saving…" : isEditing ? "Update Transaction" : "Save Transaction"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
