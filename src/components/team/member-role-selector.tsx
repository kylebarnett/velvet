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
      <SelectTrigger size="sm" className="w-auto min-w-[110px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(roleLabels).map(([role, label]) => (
          <SelectItem key={role} value={role}>
            <div>
              <div>{label}</div>
              <div className="text-[10px] text-white/40">
                {roleDescriptions[role]}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
