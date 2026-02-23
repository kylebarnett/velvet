"use client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TypingIndicatorProps = {
  typingUsers: Array<{ userId: string; fullName: string }>;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  let label: string;
  if (typingUsers.length === 1) {
    label = `${typingUsers[0].fullName} is typing`;
  } else if (typingUsers.length === 2) {
    label = `${typingUsers[0].fullName} and ${typingUsers[1].fullName} are typing`;
  } else {
    const othersCount = typingUsers.length - 2;
    label = `${typingUsers[0].fullName}, ${typingUsers[1].fullName}, and ${othersCount} ${othersCount === 1 ? "other" : "others"} are typing`;
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 text-xs italic text-text-muted">
      <span>{label}</span>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        <span
          className="inline-block h-1 w-1 animate-pulse rounded-full bg-text-muted"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="inline-block h-1 w-1 animate-pulse rounded-full bg-text-muted"
          style={{ animationDelay: "200ms" }}
        />
        <span
          className="inline-block h-1 w-1 animate-pulse rounded-full bg-text-muted"
          style={{ animationDelay: "400ms" }}
        />
      </span>
    </div>
  );
}
