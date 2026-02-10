"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value: string;
  onChange: (role: string) => void;
  disabled?: boolean;
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const roleDescriptions: Record<string, string> = {
  admin: "Full access, can manage team",
  member: "Can create and submit",
  viewer: "Read-only access",
};

export function MemberRoleSelector({ value, onChange, disabled }: Props) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-auto min-w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[220px]">
        {Object.entries(roleLabels).map(([role, label]) => (
          <SelectItem key={role} value={role} className="py-3 pl-9 pr-4">
            <div>
              <div className="font-medium text-text-primary">{label}</div>
              <div className="mt-1 text-xs leading-snug text-text-muted">
                {roleDescriptions[role]}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
