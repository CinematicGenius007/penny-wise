"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

const ACCOUNT_COLORS = [
  { label: "Emerald", value: "#10B981" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Rose", value: "#F43F5E" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const createAccount = useMutation(api.accounts.create);

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [type, setType] = useState<"bank" | "cash" | "card" | "wallet">("bank");
  const [initialBalance, setInitialBalance] = useState("");
  const [color, setColor] = useState("#10B981");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const balance = parseFloat(initialBalance);
    if (!name.trim()) return toast.error("Account name is required");
    if (isNaN(balance) || balance < 0) return toast.error("Enter a valid balance");

    setLoading(true);
    try {
      await createAccount({ name: name.trim(), type, initialBalance: balance, color });
      toast.success("Account created! Welcome to penny-wise.");
      router.push("/");
    } catch {
      toast.error("Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Wallet className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Welcome to penny-wise</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Your financially-savvy best friend who never forgets a rupee.
            <br />
            Let&apos;s set up your first account to get started.
          </p>
        </div>
        <Button className="w-full max-w-xs" onClick={() => setStep(2)}>
          Set up my account
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-6 pt-8 gap-6 max-w-md mx-auto">
      <div>
        <h2 className="text-xl font-bold">Add your first account</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This could be your bank account, wallet, or cash on hand.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-name">Account name</Label>
          <Input
            id="account-name"
            placeholder="e.g. HDFC Savings, Cash"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Account type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank">Bank Account</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Credit Card</SelectItem>
              <SelectItem value="wallet">Digital Wallet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="initial-balance">Current balance (₹)</Label>
          <Input
            id="initial-balance"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter how much money is in this account right now.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Color</Label>
          <div className="flex gap-2">
            {ACCOUNT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c.value,
                  borderColor: color === c.value ? "white" : "transparent",
                  transform: color === c.value ? "scale(1.15)" : "scale(1)",
                }}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleCreate} disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </div>
    </div>
  );
}
