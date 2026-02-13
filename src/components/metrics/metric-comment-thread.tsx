"use client";

import * as React from "react";
import { MessageSquare, Send } from "lucide-react";

type Comment = {
  id: string;
  user_role: string;
  content: string;
  created_at: string;
  author_name: string;
  is_own: boolean;
};

type MetricCommentThreadProps = {
  companyId: string;
  metricName: string;
  periodStart?: string;
  periodEnd?: string;
};

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MetricCommentThread({ companyId, metricName, periodStart, periodEnd }: MetricCommentThreadProps) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newComment, setNewComment] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    async function load() {
      try {
        let commentsUrl = `/api/metrics/comments?company_id=${companyId}&metric_name=${encodeURIComponent(metricName)}`;
        if (periodStart && periodEnd) {
          commentsUrl += `&period_start=${encodeURIComponent(periodStart)}&period_end=${encodeURIComponent(periodEnd)}`;
        }
        const res = await fetch(commentsUrl);
        if (!res.ok) throw new Error("Failed to load comments.");
        const json = await res.json();
        setComments(json.comments ?? []);
      } catch {
        setError("Failed to load comments.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, metricName, periodStart, periodEnd]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || posting) return;

    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/metrics/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          metric_name: metricName,
          content: newComment.trim(),
          period_start: periodStart ?? null,
          period_end: periodEnd ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed to post comment.");

      // Reload comments
      let reloadUrl = `/api/metrics/comments?company_id=${companyId}&metric_name=${encodeURIComponent(metricName)}`;
      if (periodStart && periodEnd) {
        reloadUrl += `&period_start=${encodeURIComponent(periodStart)}&period_end=${encodeURIComponent(periodEnd)}`;
      }
      const loadRes = await fetch(reloadUrl);
      if (loadRes.ok) {
        const json = await loadRes.json();
        setComments(json.comments ?? []);
      }
      setNewComment("");
    } catch {
      setError("Failed to post comment.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <MessageSquare className="h-3.5 w-3.5 text-text-muted" />
        <span className="text-xs font-medium text-text-secondary">
          Comments {comments.length > 0 && `(${comments.length})`}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto max-h-[200px] p-3 space-y-3">
        {loading && (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="animate-pulse space-y-1">
                <div className="h-3 w-20 rounded bg-bg-hover" />
                <div className="h-4 w-3/4 rounded bg-bg-hover" />
              </div>
            ))}
          </div>
        )}

        {!loading && comments.length === 0 && (
          <p className="text-xs text-text-faint text-center py-2">
            No comments yet. Start a conversation about this metric.
          </p>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className={`flex gap-2 ${comment.is_own ? "flex-row-reverse" : ""}`}>
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
                comment.user_role === "investor"
                  ? "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]"
                  : "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)]"
              }`}
            >
              {comment.author_name[0]?.toUpperCase() ?? "?"}
            </div>
            <div className={`max-w-[80%] ${comment.is_own ? "text-right" : ""}`}>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-text-secondary">
                  {comment.author_name}
                </span>
                <span className="text-[10px] text-text-faint">
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>
              <p className="mt-0.5 rounded-lg bg-bg-elevated px-2.5 py-1.5 text-xs text-text-primary">
                {comment.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mx-3 mb-2 rounded-md bg-[var(--status-error-bg)] px-2 py-1 text-[10px] text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border-subtle p-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          maxLength={2000}
          className="h-8 flex-1 rounded-md border border-border-default bg-bg-input px-2.5 text-xs text-text-primary placeholder:text-text-faint focus:border-border-default focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || posting}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-btn-primary-bg text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-40"
          aria-label="Send comment"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
