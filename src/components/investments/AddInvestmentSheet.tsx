"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { InvestmentType } from "@/types";

interface AddInvestmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPES: InvestmentType[] = ["stock", "mutual_fund", "fd", "nps", "ppf", "other"];

export function AddInvestmentSheet({ open, onOpenChange }: AddInvestmentSheetProps) {
  const createInvestment = useMutation(api.investments.create);
  const [name, setName] = useState("");
  const [type, setType] = useState<InvestmentType>("stock");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const invested = Number(investedAmount);
    if (!name.trim()) return toast.error("Name is required");
    if (!invested || invested <= 0) return toast.error("Enter a valid invested amount");
    setLoading(true);
    try {
      await createInvestment({
        name: name.trim(),
        type,
        investedAmount: invested,
        currentValue: currentValue ? Number(currentValue) : undefined,
        purchaseDate: purchaseDate || undefined,
      });
      setName("");
      setInvestedAmount("");
      setCurrentValue("");
      setPurchaseDate("");
      onOpenChange(false);
      toast.success("Investment added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add investment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto w-full max-w-lg rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Add Investment</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-6">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <Select value={type} onValueChange={(value) => value !== null && setType(value as InvestmentType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={investedAmount}
            onChange={(e) => setInvestedAmount(e.target.value)}
            placeholder="Invested amount"
          />
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="Current value (optional)"
          />
          <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          <Button onClick={submit} className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save investment"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
