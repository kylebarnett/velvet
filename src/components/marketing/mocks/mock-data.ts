export const MOCK_COMPANIES = [
  { name: "Apex Labs", sector: "AI/ML", stage: "Series A", revenue: "$2.1M", growth: "+24%" },
  { name: "NovaPay", sector: "Fintech", stage: "Series B", revenue: "$8.4M", growth: "+18%" },
  { name: "CloudHive", sector: "Infrastructure", stage: "Seed", revenue: "$420K", growth: "+45%" },
  { name: "GreenLoop", sector: "CleanTech", stage: "Series A", revenue: "$1.8M", growth: "+31%" },
  { name: "DataForge", sector: "Analytics", stage: "Series A", revenue: "$3.2M", growth: "+22%" },
  { name: "MediSync", sector: "HealthTech", stage: "Series B", revenue: "$5.7M", growth: "+15%" },
];

export const MOCK_KPIS = [
  { label: "Total ARR", value: 12.4, prefix: "$", suffix: "M", change: "+18%", positive: true },
  { label: "Companies", value: 24, change: "+3", positive: true },
  { label: "Avg Burn Rate", value: 180, prefix: "$", suffix: "K", change: "-12%", positive: true },
  { label: "Response Rate", value: 87, suffix: "%", change: "+5%", positive: true },
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
  { name: "Sequoia Ventures", status: "approved" as const },
  { name: "a16z Growth", status: "approved" as const },
  { name: "Founders Fund", status: "pending" as const },
  { name: "Accel Partners", status: "denied" as const },
];

export const MOCK_METRICS = [
  { name: "Revenue", value: "$2,100,000", period: "Q4 2025" },
  { name: "ARR", value: "$8,400,000", period: "Q4 2025" },
  { name: "Burn Rate", value: "$180,000", period: "Q4 2025" },
  { name: "Headcount", value: "47", period: "Q4 2025" },
  { name: "Churn Rate", value: "2.1%", period: "Q4 2025" },
];

export const MOCK_SIDEBAR_NAV = [
  { icon: "layout-dashboard", label: "Dashboard" },
  { icon: "briefcase", label: "Portfolio" },
  { icon: "send", label: "Metric Requests" },
  { icon: "bar-chart-3", label: "Reports" },
  { icon: "file-text", label: "Documents" },
  { icon: "sparkles", label: "Ask AI" },
  { icon: "landmark", label: "LP Reports" },
];

export const MOCK_FUND_METRICS = [
  { label: "TVPI", value: "2.4x" },
  { label: "DPI", value: "0.8x" },
  { label: "IRR", value: "32%" },
  { label: "MOIC", value: "2.1x" },
];

export const MOCK_REQUESTS = [
  { investor: "Sequoia Ventures", metrics: "Revenue, ARR, Burn Rate", status: "pending" as const, date: "Jan 15, 2026" },
  { investor: "a16z Growth", metrics: "Revenue, Headcount", status: "submitted" as const, date: "Jan 10, 2026" },
  { investor: "Founders Fund", metrics: "ARR, Churn Rate, NRR", status: "pending" as const, date: "Jan 8, 2026" },
];
