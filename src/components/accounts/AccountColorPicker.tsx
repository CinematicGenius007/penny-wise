"use client";

import { Palette } from "lucide-react";

const DEFAULT_ACCOUNT_COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#F43F5E"];

interface AccountColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
}

export function AccountColorPicker({
  value,
  onChange,
  colors = DEFAULT_ACCOUNT_COLORS,
}: AccountColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="h-8 w-8 rounded-full border-2 transition-all"
          style={{ backgroundColor: color, borderColor: value === color ? "white" : "transparent" }}
          aria-label={`Use ${color} for this account`}
          title={color}
        />
      ))}
      <label
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: value }}
      >
        <Palette className="h-4 w-4" />
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Pick a custom account color"
        />
      </label>
    </div>
  );
}
