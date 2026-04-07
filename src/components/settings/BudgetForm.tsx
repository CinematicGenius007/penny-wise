"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { BudgetPeriod, Category } from "@/types";

interface BudgetFormProps {
  categories: Category[];
}

export function BudgetForm({ categories }: BudgetFormProps) {
  const upsertBudget = useMutation(api.budgets.upsert);
  const [categoryId, setCategoryId] = useState<string>("overall");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [loading, setLoading] = useState(false);

  async function saveBudget() {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return toast.error("Enter a valid budget amount");
    setLoading(true);
    try {
      await upsertBudget({
        categoryId: categoryId === "overall" ? undefined : (categoryId as Id<"categories">),
        amount: parsed,
        period,
      });
      setAmount("");
      setCategoryId("overall");
      toast.success("Budget saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save budget");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 px-4 py-4">
      <Select value={categoryId} onValueChange={(value) => value !== null && setCategoryId(value)}>
        <SelectTrigger className="h-10">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="overall">Overall</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category._id} value={category._id}>
              {category.icon} {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="Budget amount"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={period === "monthly" ? "secondary" : "outline"}
          onClick={() => setPeriod("monthly")}
        >
          Monthly
        </Button>
        <Button
          type="button"
          variant={period === "weekly" ? "secondary" : "outline"}
          onClick={() => setPeriod("weekly")}
        >
          Weekly
        </Button>
      </div>
      <Button type="button" className="w-full" onClick={saveBudget} disabled={loading}>
        {loading ? "Saving..." : "Add budget"}
      </Button>
    </div>
  );
}
