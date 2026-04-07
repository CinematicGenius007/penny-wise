"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TrendingUp, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddInvestmentSheet } from "@/components/investments/AddInvestmentSheet";
import { formatINR } from "@/lib/format";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function InvestmentsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"investments"> | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [deletingId, setDeletingId] = useState<Id<"investments"> | null>(null);
  const investments = (useQuery(api.investments.list, {}) ?? []) as Doc<"investments">[];
  const updateInvestment = useMutation(api.investments.update);
  const removeInvestment = useMutation(api.investments.remove);

  async function saveEdit() {
    if (!editingId) return;
    await updateInvestment({
      id: editingId,
      name: editingName.trim() || undefined,
      currentValue: editingValue ? Number(editingValue) : undefined,
    });
    toast.success("Investment updated");
    setEditingId(null);
    setEditingName("");
    setEditingValue("");
  }

  async function deleteInvestment() {
    if (!deletingId) return;
    await removeInvestment({ id: deletingId });
    toast.success("Investment deleted");
    setDeletingId(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Investments</p>
            <h1 className="text-xl font-semibold">Manual portfolio tracker</h1>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-accent" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Investment tracking is now available for manual entries while live price integrations are in progress.
        </p>
        <Button className="mt-4 gap-2" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Add investment
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {investments.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No investments yet. Add your first one to start tracking.
          </p>
        ) : (
          <ul>
            {investments.map((investment, index) => {
              const current = investment.currentValue ?? investment.investedAmount;
              const gain = current - investment.investedAmount;
              const gainPct = investment.investedAmount > 0 ? (gain / investment.investedAmount) * 100 : 0;
              return (
                <li
                  key={investment._id}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 ${
                    index < investments.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <p className="truncate text-sm font-medium">{investment.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">{investment.type.replace("_", " ")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditingId(investment._id);
                        setEditingName(investment.name);
                        setEditingValue(String(investment.currentValue ?? ""));
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit investment"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(investment._id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete investment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-right min-w-24">
                    <p className="text-sm font-amount">{formatINR(current)}</p>
                    <p className={`text-xs font-medium ${gain >= 0 ? "text-income" : "text-expense"}`}>
                      {gain >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AddInvestmentSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <ConfirmDialog
        open={deletingId !== null}
        title="Delete investment?"
        description="This entry will be permanently removed."
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeletingId(null)}
        onConfirm={deleteInvestment}
      />
      {editingId && (
        <div className="fixed bottom-24 left-1/2 z-30 w-[92vw] max-w-md -translate-x-1/2 rounded-xl border border-border bg-card p-3 shadow-xl">
          <div className="space-y-2">
            <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} placeholder="Investment name" />
            <Input type="number" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} placeholder="Current value" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingId(null)}>Cancel</Button>
              <Button className="flex-1" onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
