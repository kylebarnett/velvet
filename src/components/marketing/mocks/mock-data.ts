export const MOCK_COMPANIES = [
  { name: "Apex Labs", sector: "AI/ML", stage: "Series A", revenue: "$2.1M", arr: "$8.4M", growth: "+24%", avatarColor: "bg-blue-500", freshness: "2d ago" },
  { name: "NovaPay", sector: "Fintech", stage: "Series B", revenue: "$8.4M", arr: "$32.1M", growth: "+18%", avatarColor: "bg-violet-500", freshness: "5h ago" },
  { name: "CloudHive", sector: "Infrastructure", stage: "Seed", revenue: "$420K", arr: "$1.7M", growth: "+45%", avatarColor: "bg-emerald-500", freshness: "1d ago" },
  { name: "GreenLoop", sector: "CleanTech", stage: "Series A", revenue: "$1.8M", arr: "$7.2M", growth: "+31%", avatarColor: "bg-amber-500", freshness: "3d ago" },
  { name: "DataForge", sector: "Analytics", stage: "Series A", revenue: "$3.2M", arr: "$12.8M", growth: "+22%", avatarColor: "bg-pink-500", freshness: "12h ago" },
  { name: "MediSync", sector: "HealthTech", stage: "Series B", revenue: "$5.7M", arr: "$22.8M", growth: "+15%", avatarColor: "bg-cyan-500", freshness: "4d ago" },
];

export const MOCK_KPIS = [
  { label: "Total ARR", value: 12.4, prefix: "$", suffix: "M", change: "+18%", positive: true, sparkline: [6.2, 7.1, 7.8, 8.5, 9.4, 10.1, 10.9, 11.6, 12.4] },
  { label: "Companies", value: 24, change: "+3", positive: true, sparkline: [14, 16, 17, 18, 19, 20, 21, 22, 24] },
  { label: "Avg Burn Rate", value: 180, prefix: "$", suffix: "K", change: "-12%", positive: true, sparkline: [220, 215, 208, 205, 198, 195, 190, 185, 180] },
  { label: "Response Rate", value: 87, suffix: "%", change: "+5%", positive: true, sparkline: [62, 65, 70, 72, 75, 78, 82, 85, 87] },
];

export const MOCK_CHART_DATA = [
  { month: "Jul", value: 8.2 },
  { month: "Aug", value: 8.8 },
  { month: "Sep", value: 9.4 },
  { month: "Oct", value: 10.1 },
  { month: "Nov", value: 10.9 },
  { month: "Dec", value: 11.6 },
  { month: "Jan", value: 12.4 },
];

export const MOCK_INVESTORS = [
  { name: "Sequoia Ventures", status: "approved" as const, initials: "SV" },
  { name: "a16z Growth", status: "approved" as const, initials: "A1" },
  { name: "Founders Fund", status: "pending" as const, initials: "FF" },
  { name: "Accel Partners", status: "denied" as const, initials: "AP" },
];

export const MOCK_METRICS = [
  { name: "Revenue", value: "$2,100,000", period: "Q4 2025" },
  { name: "ARR", value: "$8,400,000", period: "Q4 2025" },
  { name: "Burn Rate", value: "$180,000", period: "Q4 2025" },
  { name: "Headcount", value: "47", period: "Q4 2025" },
  { name: "Churn Rate", value: "2.1%", period: "Q4 2025" },
];

export type MockNavItem = {
  icon: string;
  label: string;
  divider?: boolean;
  children?: MockNavItem[];
};

export const MOCK_SIDEBAR_NAV: MockNavItem[] = [
  {
    icon: "briefcase",
    label: "Portfolio",
    children: [
      { icon: "building2", label: "Companies" },
      { icon: "users", label: "Contacts" },
      { icon: "send", label: "Metric Requests" },
      { icon: "file-spreadsheet", label: "Tear Sheets" },
    ],
  },
  { icon: "bar-chart-3", label: "Reports", divider: true },
  { icon: "file-text", label: "Documents" },
  {
    icon: "landmark",
    label: "Funds",
    children: [
      { icon: "landmark", label: "Overview" },
      { icon: "file-text", label: "LP Reports" },
    ],
  },
];

export const MOCK_FUND_METRICS = [
  { label: "TVPI", value: "2.4x" },
  { label: "DPI", value: "0.8x" },
  { label: "IRR", value: "32%" },
  { label: "MOIC", value: "2.1x" },
];

export const MOCK_REQUESTS = [
  { investor: "Sequoia Ventures", metrics: "Revenue, ARR, Burn Rate", status: "pending" as const, date: "Feb 15, 2026" },
  { investor: "a16z Growth", metrics: "Revenue, Headcount", status: "submitted" as const, date: "Feb 10, 2026" },
  { investor: "Founders Fund", metrics: "ARR, Churn Rate, NRR", status: "pending" as const, date: "Feb 8, 2026" },
];
