"use client";

type PeriodSelectorProps = {
  value: "monthly" | "quarterly" | "yearly";
  onChange: (value: "monthly" | "quarterly" | "yearly") => void;
};

const options: Array<{ value: "monthly" | "quarterly" | "yearly"; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex rounded-lg border border-white/10 bg-black/20 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`
            rounded-md px-3 py-1.5 text-xs font-medium transition-colors
            ${
              value === option.value
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/70"
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
