"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatINR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction, Category, Account } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  onEdit?: (tx: Transaction) => void;
}

export function TransactionItem({ transaction: tx, category, account, onEdit }: TransactionItemProps) {
  const removeTx = useMutation(api.transactions.remove);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    setConfirmOpen(false);
    setDeleting(true);
    try {
      await removeTx({ id: tx._id as Id<"transactions"> });
      toast.success("Transaction deleted");
    } catch {
      toast.error("Failed to delete transaction");
    } finally {
      setDeleting(false);
    }
  }

  const isTransfer = tx.type === "transfer";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover transition-colors",
        deleting && "opacity-50 pointer-events-none"
      )}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
        style={{ backgroundColor: (category?.color ?? "#71717a") + "20" }}
      >
        {isTransfer ? "↔️" : (category?.icon ?? "💸")}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {tx.description ?? category?.name ?? "Transaction"}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(tx.date, "short")}
          {account && <> · {account.name}</>}
          {tx.type !== "transfer" && category && <> · {category.name}</>}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn(
            "text-sm font-amount font-medium",
            tx.type === "income"
              ? "text-income"
              : tx.type === "expense"
              ? "text-expense"
              : "text-muted-foreground"
          )}
        >
          {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
          {formatINR(tx.amount)}
        </span>

        {!isTransfer && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Transaction actions"
            >
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(tx)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setConfirmOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete transaction?"
        description="This cannot be undone. Transfer deletes remove both linked rows."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
