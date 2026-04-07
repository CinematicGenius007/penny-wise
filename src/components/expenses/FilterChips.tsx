"use client";

import { Button } from "@/components/ui/button";
import type { TransactionType } from "@/types";

interface FilterChipsProps {
  type: "all" | TransactionType;
  onTypeChange: (next: "all" | TransactionType) => void;
  datePreset: "today" | "week" | "month" | "all" | "custom";
  onDatePresetChange: (next: "today" | "week" | "month" | "all" | "custom") => void;
}

export function FilterChips({
  type,
  onTypeChange,
  datePreset,
  onDatePresetChange,
}: FilterChipsProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "expense", "income", "transfer"] as const).map((item) => (
          <Button
            key={item}
            type="button"
            variant={type === item ? "default" : "outline"}
            size="sm"
            className="shrink-0 capitalize"
            onClick={() => onTypeChange(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["today", "week", "month", "all", "custom"] as const).map((item) => (
          <Button
            key={item}
            type="button"
            variant={datePreset === item ? "secondary" : "ghost"}
            size="sm"
            className="shrink-0 capitalize"
            onClick={() => onDatePresetChange(item)}
          >
            {item === "all" ? "All time" : item === "week" ? "This week" : item === "month" ? "This month" : item}
          </Button>
        ))}
      </div>
    </div>
  );
}
