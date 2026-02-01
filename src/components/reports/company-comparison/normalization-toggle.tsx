"use client";

type NormalizationToggleProps = {
  value: string;
  onChange: (value: string) => void;
};

const OPTIONS = [
  { value: "absolute", label: "Absolute", description: "Raw values" },
  { value: "indexed", label: "Indexed", description: "Start at 100" },
  { value: "percentChange", label: "% Change", description: "Period over period" },
];

export function NormalizationToggle({ value, onChange }: NormalizationToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-white/60">View:</span>
      <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            title={option.description}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              value === option.value
                ? "bg-white text-black"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
