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
import { LogOut, Palette, Plus, Trash2 } from "lucide-react";
import type { AccountType } from "@/types";

const ACCOUNT_COLORS = [
  "#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#F43F5E",
];

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
  const createAccount = useMutation(api.accounts.create);
  const removeAccount = useMutation(api.accounts.remove);
  const createCategory = useMutation(api.categories.create);
  const removeCategory = useMutation(api.categories.remove);

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
    if (!confirm(`Delete "${name}"? Transaction history will be preserved.`)) return;
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
    if (!confirm("Delete this category?")) return;
    try {
      await removeCategory({ id });
      toast.success("Category deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete category");
    }
  }

  type Cat = { _id: Id<"categories">; name: string; icon: string; color: string; isSystem: boolean };
  type Acc = { _id: Id<"accounts">; name: string; type: string; balance: number; color: string };
  const userCategories = (categories as Cat[]).filter((c) => !c.isSystem);
  const systemCategories = (categories as Cat[]).filter((c) => c.isSystem);

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
              <div key={acc._id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 border-b border-border last:border-0">
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
                  onClick={() => handleDeleteAccount(acc._id as Id<"accounts">, acc.name)}
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
	                    <div className="flex flex-col gap-3 pt-1">
	                      <div className="flex flex-wrap gap-2">
	                        {ACCOUNT_COLORS.map((color) => (
	                          <button
	                            key={color}
	                            type="button"
	                            onClick={() => setAccColor(color)}
	                            className="h-8 w-8 rounded-full border-2 transition-all"
	                            style={{ backgroundColor: color, borderColor: accColor === color ? "white" : "transparent" }}
	                            aria-label={`Use ${color} for this account`}
	                            title={color}
	                          />
	                        ))}
                          <label
                            className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: accColor }}
                          >
                            <Palette className="h-4 w-4" />
                            <input
                              type="color"
                              value={accColor}
                              onChange={(e) => setAccColor(e.target.value)}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              aria-label="Pick a custom account color"
                            />
                          </label>
	                      </div>
	                      {/* <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-2">
	                        <div className="flex items-center gap-3 min-w-0">
	                          <label
	                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
	                            style={{ backgroundColor: accColor }}
	                          >
                              <Palette className="h-4 w-4" />
	                            {getInitials(accName || "A")}
                              <input
                                type="color"
                                value={accColor}
                                onChange={(e) => setAccColor(e.target.value)}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                aria-label="Pick a custom account color"
                              />
                            </label>
	                          <div className="min-w-0">
	                            <p className="truncate text-sm font-medium">
	                              {accName.trim() || "Account preview"}
	                            </p>
	                            <p className="text-xs text-muted-foreground">{accColor}</p>
	                          </div>
	                        </div>
	                        {/* <label className="relative inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover">
	                          <Palette className="h-4 w-4" />
	                          <span>Custom</span>
	                          <input
	                            type="color"
	                            value={accColor}
	                            onChange={(e) => setAccColor(e.target.value)}
	                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
	                            aria-label="Pick a custom account color"
	                          />
	                        </label>
	                      </div> */}
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
                  onClick={() => handleDeleteCategory(cat._id as Id<"categories">)}
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

          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Layout note
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              This page now expands into a wider workspace on desktop while staying compact on mobile, so management tasks don’t feel trapped in a phone-only UI.
            </p>
          </div>
        </div>
      </div>
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
