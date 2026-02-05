"use client";

import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";

type PeriodType = "monthly" | "quarterly" | "yearly";

type PeriodSelectorProps = {
  value: PeriodType;
  onChange: (value: PeriodType) => void;
};

const options: TabItem<PeriodType>[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <SlidingTabs
      tabs={options}
      value={value}
      onChange={onChange}
      size="sm"
      showIcons={false}
    />
  );
}
