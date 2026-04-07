"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useUser, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR, getInitials, getAvatarColor } from "@/lib/format";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Pencil } from "lucide-react";
import type { AccountType, Budget, Category } from "@/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BudgetForm } from "@/components/settings/BudgetForm";
import { EditAccountSheet } from "@/components/settings/EditAccountSheet";
import { AccountColorPicker } from "@/components/accounts/AccountColorPicker";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank",
  cash: "Cash",
  card: "Card",
  wallet: "Wallet",
};

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const accounts = useQuery(api.accounts.list) ?? [];
  const categories = useQuery(api.categories.list) ?? [];
  const budgets = useQuery(api.budgets.list) ?? [];
  const createAccount = useMutation(api.accounts.create);
  const removeAccount = useMutation(api.accounts.remove);
  const createCategory = useMutation(api.categories.create);
  const removeCategory = useMutation(api.categories.remove);
  const removeBudget = useMutation(api.budgets.remove);

  // Add account form state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<AccountType>("bank");
  const [accBalance, setAccBalance] = useState("");
  const [accColor, setAccColor] = useState("#10B981");
  const [addingAcc, setAddingAcc] = useState(false);

  // Add category form state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("💰");
  const [addingCat, setAddingCat] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{ id: Id<"accounts">; name: string } | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<{ _id: Id<"accounts">; name: string; color: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Id<"categories"> | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Id<"budgets"> | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  const name = user?.fullName ?? user?.firstName ?? "User";
  const email = user?.emailAddresses[0]?.emailAddress;

  async function handleAddAccount() {
    const balance = parseFloat(accBalance);
    if (!accName.trim()) return toast.error("Account name is required");
    if (isNaN(balance) || balance < 0) return toast.error("Enter a valid balance");
    setAddingAcc(true);
    try {
      await createAccount({ name: accName.trim(), type: accType, initialBalance: balance, color: accColor });
      toast.success("Account added");
      setAccName(""); setAccBalance(""); setShowAddAccount(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add account");
    } finally {
      setAddingAcc(false);
    }
  }

  async function handleDeleteAccount(id: Id<"accounts">, name: string) {
    void name;
    setAccountToDelete(null);
    try {
      await removeAccount({ id });
      toast.success("Account removed");
    } catch {
      toast.error("Failed to remove account");
    }
  }

  async function handleAddCategory() {
    if (!catName.trim()) return toast.error("Category name is required");
    setAddingCat(true);
    try {
      await createCategory({ name: catName.trim(), icon: catIcon });
      toast.success("Category added");
      setCatName(""); setCatIcon("💰"); setShowAddCategory(false);
    } catch {
      toast.error("Failed to add category");
    } finally {
      setAddingCat(false);
    }
  }

  async function handleDeleteCategory(id: Id<"categories">) {
    setCategoryToDelete(null);
    try {
      await removeCategory({ id });
      toast.success("Category deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete category");
    }
  }

  async function handleDeleteBudget(id: Id<"budgets">) {
    setBudgetToDelete(null);
    try {
      await removeBudget({ id });
      toast.success("Budget deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete budget");
    }
  }

  async function handleExportCsv() {
    setExportingCsv(true);
    try {
      const response = await fetch("/api/export/transactions");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "penny-wise-transactions.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExportingCsv(false);
    }
  }

  type Cat = { _id: Id<"categories">; name: string; icon: string; color: string; isSystem: boolean };
  type Acc = { _id: Id<"accounts">; name: string; type: string; balance: number; color: string };
  const userCategories = (categories as Cat[]).filter((c) => !c.isSystem);
  const systemCategories = (categories as Cat[]).filter((c) => c.isSystem);
  const categoryById = new Map((categories as Category[]).map((category) => [category._id, category]));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Settings
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace controls</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage your profile, accounts, categories, and access without squeezing everything into a phone-sized stack.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="flex flex-col gap-6">
          <Section
            title="Accounts"
            action={
              <button onClick={() => setShowAddAccount(!showAddAccount)} className="text-xs text-accent">
                <Plus className="w-4 h-4" />
              </button>
            }
          >
            {(accounts as Acc[]).map((acc) => (
              <div key={acc._id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: acc.color }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{acc.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                </div>
                <p className="text-sm font-amount font-medium text-foreground whitespace-nowrap">{formatINR(acc.balance)}</p>
                <button
                  onClick={() => setAccountToEdit({ _id: acc._id as Id<"accounts">, name: acc.name, color: acc.color })}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setAccountToDelete({ id: acc._id as Id<"accounts">, name: acc.name })}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {showAddAccount && (
              <div className="px-4 py-4 border-t border-border flex flex-col gap-3 bg-surface">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="HDFC Savings" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={accType} onValueChange={(v) => v !== null && setAccType(v as AccountType)}>
                      <SelectTrigger className="h-10"><SelectValue>{ACCOUNT_TYPE_LABELS[accType]}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="wallet">Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Balance (₹)</Label>
                    <Input type="number" value={accBalance} onChange={(e) => setAccBalance(e.target.value)} placeholder="0" className="h-10" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Color</Label>
                    <div className="pt-1">
                      <AccountColorPicker value={accColor} onChange={setAccColor} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="flex-1" onClick={() => setShowAddAccount(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleAddAccount} disabled={addingAcc}>
                    {addingAcc ? "Adding…" : "Add account"}
                  </Button>
                </div>
              </div>
            )}

            {accounts.length === 0 && !showAddAccount && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No accounts yet.</p>
            )}
          </Section>

          <Section
            title="Custom Categories"
            action={
              <button onClick={() => setShowAddCategory(!showAddCategory)} className="text-xs text-accent">
                <Plus className="w-4 h-4" />
              </button>
            }
          >
            {userCategories.map((cat) => (
              <div key={cat._id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 border-b border-border last:border-0">
                <span className="text-base">{cat.icon}</span>
                <p className="truncate text-sm">{cat.name}</p>
                <button
                  onClick={() => setCategoryToDelete(cat._id as Id<"categories">)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {showAddCategory && (
              <div className="px-4 py-4 border-t border-border flex flex-col gap-3 bg-surface">
                <div className="grid gap-3 md:grid-cols-[96px_minmax(0,1fr)]">
                  <Input
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    placeholder="💰"
                    className="text-center text-lg"
                    maxLength={2}
                  />
                  <Input
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Category name"
                    className="flex-1"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="flex-1" onClick={() => setShowAddCategory(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleAddCategory} disabled={addingCat}>
                    {addingCat ? "Adding…" : "Add category"}
                  </Button>
                </div>
              </div>
            )}

            {userCategories.length === 0 && !showAddCategory && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No custom categories. Add one above.</p>
            )}

            <div className="px-4 pt-2 pb-1">
              <p className="text-xs text-muted-foreground">System categories ({systemCategories.length})</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {systemCategories.map((c: Cat) => (
                  <span key={c._id} className="text-xs text-muted-foreground bg-surface px-2 py-1 rounded-full">
                    {c.icon} {c.name}
                  </span>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Budgets">
            {(budgets as Budget[]).length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No budgets yet. Add one below.</p>
            ) : (
              (budgets as Budget[]).map((budget) => {
                const category = budget.categoryId ? categoryById.get(budget.categoryId) : null;
                return (
                  <div key={budget._id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                    <div>
                      <p className="truncate text-sm font-medium">
                        {category ? `${category.icon} ${category.name}` : "Overall"}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {budget.period} · {formatINR(budget.amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => setBudgetToDelete(budget._id)}
                      className="p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
            <BudgetForm categories={categories as Category[]} />
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          <Section title="Profile">
            <div className="flex items-center gap-3 px-4 py-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ backgroundColor: getAvatarColor(name) }}
              >
                {getInitials(name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
            </div>
          </Section>

          <Section title="Session">
            <div className="flex flex-col gap-3 px-4 py-4">
              <p className="text-sm text-muted-foreground">
                You’re signed in to a private personal-finance workspace.
              </p>
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => signOut({ redirectUrl: "/sign-in" })}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            </div>
          </Section>

          <Section title="Data">
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-muted-foreground">
                Download your full transaction history as a CSV file.
              </p>
              <Button onClick={handleExportCsv} disabled={exportingCsv}>
                {exportingCsv ? "Exporting..." : "Export transactions"}
              </Button>
            </div>
          </Section>
        </div>
      </div>
      <ConfirmDialog
        open={accountToDelete !== null}
        title="Delete account?"
        description={
          accountToDelete
            ? `Delete "${accountToDelete.name}"? Transaction history is preserved and this account is soft-deleted.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setAccountToDelete(null)}
        onConfirm={() => {
          if (!accountToDelete) return;
          return handleDeleteAccount(accountToDelete.id, accountToDelete.name);
        }}
      />
      {accountToEdit && (
        <EditAccountSheet
          open={accountToEdit !== null}
          onOpenChange={(open) => {
            if (!open) setAccountToEdit(null);
          }}
          account={accountToEdit}
        />
      )}
      <ConfirmDialog
        open={categoryToDelete !== null}
        title="Delete category?"
        description="This removes the custom category from your workspace."
        confirmLabel="Delete"
        destructive
        onCancel={() => setCategoryToDelete(null)}
        onConfirm={() => {
          if (!categoryToDelete) return;
          return handleDeleteCategory(categoryToDelete);
        }}
      />
      <ConfirmDialog
        open={budgetToDelete !== null}
        title="Delete budget?"
        description="This budget limit will be removed."
        confirmLabel="Delete"
        destructive
        onCancel={() => setBudgetToDelete(null)}
        onConfirm={() => {
          if (!budgetToDelete) return;
          return handleDeleteBudget(budgetToDelete);
        }}
      />
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{title}</p>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}
