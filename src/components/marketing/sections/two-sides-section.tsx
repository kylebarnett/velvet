import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  FileText,
  Shield,
  Upload,
  Users,
  Sparkles,
  Send,
} from "lucide-react";

const investorProps = [
  { icon: Upload, text: "Import your portfolio in minutes" },
  { icon: Send, text: "Request metrics from any founder" },
  { icon: Sparkles, text: "AI-powered portfolio insights" },
  { icon: FileText, text: "Generate LP-ready reports" },
];

const founderProps = [
  { icon: BarChart3, text: "Submit metrics once for all investors" },
  { icon: Shield, text: "Control who sees your data" },
  { icon: FileText, text: "Build beautiful tear sheets" },
  { icon: Sparkles, text: "AI document extraction" },
];

export function TwoSidesSection() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Investor card */}
      <div className="card-surface rounded-xl border border-border-default p-8">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle text-accent">
          <Users className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-bold text-text-primary">For Investors</h3>
        <ul className="mt-6 space-y-4">
          {investorProps.map((prop) => (
            <li key={prop.text} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span className="text-sm text-text-secondary">{prop.text}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/for-investors"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
        >
          Learn more
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* Founder card */}
      <div className="card-surface rounded-xl border border-border-default p-8">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle text-accent">
          <BarChart3 className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-bold text-text-primary">For Founders</h3>
        <ul className="mt-6 space-y-4">
          {founderProps.map((prop) => (
            <li key={prop.text} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span className="text-sm text-text-secondary">{prop.text}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/for-founders"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
        >
          Learn more
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
