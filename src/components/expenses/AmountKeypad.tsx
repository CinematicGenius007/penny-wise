"use client";

interface AmountKeypadProps {
  onKeyPress: (key: string) => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function AmountKeypad({ onKeyPress }: AmountKeypadProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKeyPress(key)}
          className="h-14 rounded-full border border-border bg-card text-lg font-medium transition-colors hover:bg-surface"
        >
          {key}
        </button>
      ))}
    </div>
  );
}
