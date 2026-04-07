"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { todayISO } from "@/lib/format";
import type { Transaction, TransactionType } from "@/types";
import { AmountKeypad } from "@/components/expenses/AmountKeypad";

const EMPTY_ACCOUNTS: Array<{ _id: string; name: string }> = [];
const EMPTY_CATEGORIES: Array<{ _id: string; icon: string; name: string }> = [];

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  defaultAccountId?: Id<"accounts">;
  transaction?: Transaction | null;
}

export function AddTransactionModal({
  open,
  onClose,
  defaultType = "expense",
  defaultAccountId,
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
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISO());
  const [accountId, setAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categorizing, setCategorizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"amount" | "details">("amount");
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "custom">("today");

  function resetForm(nextDefaultType: TransactionType) {
    setType(nextDefaultType);
    setAmount("0");
    setDescription("");
    setNotes("");
    setDate(todayISO());
    setCategoryId("");
    setToAccountId("");
    setStep("amount");
    setDateMode("today");
  }

  // Pre-select first account when creating
  useEffect(() => {
    if (!isEditing && defaultAccountId) {
      setAccountId(defaultAccountId);
      return;
    }
    if (!isEditing && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0]._id);
    }
  }, [accounts, accountId, defaultAccountId, isEditing]);

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
      setStep("details");
      setDateMode("custom");
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
        const category = categories.find((c) => c._id === categoryId);
        const emoji = category?.icon ?? "💾";
        toast.success(
          type === "income"
            ? `${amount} income saved ${emoji}`
            : type === "expense"
            ? `${amount} expense saved ${emoji}`
            : "Transfer saved ↔️"
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

  function handleAmountKey(key: string) {
    if (key === "⌫") {
      setAmount((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
      return;
    }
    if (key === "." && amount.includes(".")) return;
    setAmount((prev) => {
      if (prev === "0" && key !== ".") return key;
      return prev + key;
    });
  }

  function setQuickDate(next: "today" | "yesterday" | "custom") {
    setDateMode(next);
    if (next === "today") {
      setDate(todayISO());
      return;
    }
    if (next === "yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      setDate(d.toISOString().split("T")[0]);
    }
  }

  const typeColors = {
    income: "text-income border-income",
    expense: "text-expense border-expense",
    transfer: "text-accent border-accent",
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Transaction" : step === "amount" ? "Add Transaction" : `₹${amount} · ${type}`}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4 pb-6 px-4">
          {!isEditing && step === "amount" ? (
            <>
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
              <div className="py-6 text-center">
                <p className="font-amount text-5xl font-bold">₹ {amount}</p>
              </div>
              <AmountKeypad onKeyPress={handleAmountKey} />
              <Button type="button" className="h-12" disabled={(parseFloat(amount) || 0) <= 0} onClick={() => setStep("details")}>
                Continue
              </Button>
            </>
          ) : (
            <>
              {isEditing && (
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 font-amount text-xl"
                />
              )}

              <Input
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
              />

              <Select value={accountId} onValueChange={(v) => v !== null && setAccountId(v)}>
                <SelectTrigger>
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

              {type === "transfer" && (
                <Select value={toAccountId} onValueChange={(v) => v !== null && setToAccountId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="To account">
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
              )}

              {type !== "transfer" && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {categorizing ? "AI thinking..." : "Category"}
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

              <div className="flex gap-2">
                {(["today", "yesterday", "custom"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-xs capitalize ${
                      dateMode === d ? "bg-secondary text-foreground" : "bg-surface text-muted-foreground"
                    }`}
                    onClick={() => setQuickDate(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {dateMode === "custom" && (
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={todayISO()}
                />
              )}

              <Textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />

              <div className="flex gap-2">
                {!isEditing && (
                  <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setStep("amount")}>
                    Back
                  </Button>
                )}
                <Button type="submit" className="h-12 flex-1" disabled={loading}>
                  {loading ? "Saving..." : isEditing ? "Update Transaction" : `Save ${type}`}
                </Button>
              </div>
            </>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
