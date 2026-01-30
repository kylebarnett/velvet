// Metric definitions with descriptions and formulas for tooltips
export type MetricInfo = {
  description: string;
  formula?: string;
};

export const METRIC_DEFINITIONS: Record<string, MetricInfo> = {
  // SaaS Metrics
  "MRR": {
    description: "Monthly Recurring Revenue - The predictable revenue a company expects to receive every month from subscriptions.",
    formula: "Sum of all recurring subscription revenue in a month"
  },
  "ARR": {
    description: "Annual Recurring Revenue - The annualized value of recurring subscription revenue.",
    formula: "MRR × 12"
  },
  "Net Revenue Retention": {
    description: "The percentage of recurring revenue retained from existing customers over a period, including expansions and contractions.",
    formula: "(Starting MRR + Expansion - Contraction - Churn) / Starting MRR × 100"
  },
  "Gross Revenue Retention": {
    description: "The percentage of recurring revenue retained from existing customers, excluding any expansion revenue.",
    formula: "(Starting MRR - Contraction - Churn) / Starting MRR × 100"
  },
  "Customer Churn Rate": {
    description: "The percentage of customers who cancel or don't renew their subscriptions during a given period.",
    formula: "Customers Lost / Total Customers at Start × 100"
  },
  "CAC": {
    description: "Customer Acquisition Cost - The total cost of acquiring a new customer.",
    formula: "Total Sales & Marketing Spend / New Customers Acquired"
  },
  "LTV": {
    description: "Lifetime Value - The total revenue a business expects from a single customer account.",
    formula: "ARPU × Gross Margin % × Average Customer Lifespan"
  },
  "LTV:CAC Ratio": {
    description: "The ratio of customer lifetime value to acquisition cost. A ratio of 3:1 or higher is generally considered healthy.",
    formula: "LTV / CAC"
  },
  "Burn Rate": {
    description: "The rate at which a company spends its cash reserves, typically measured monthly.",
    formula: "Starting Cash Balance - Ending Cash Balance (monthly)"
  },
  "Runway": {
    description: "The number of months a company can continue operating at its current burn rate.",
    formula: "Current Cash Balance / Monthly Burn Rate"
  },
  "Gross Margin": {
    description: "Revenue minus cost of goods sold, expressed as a percentage of revenue.",
    formula: "(Revenue - COGS) / Revenue × 100"
  },
  "Active Users": {
    description: "The number of users who have engaged with the product within a specified time period."
  },

  // Fintech Metrics
  "Total Transaction Volume": {
    description: "The total dollar value of all transactions processed through the platform.",
    formula: "Sum of all transaction amounts"
  },
  "Net Revenue": {
    description: "Total revenue minus returns, allowances, and discounts.",
    formula: "Gross Revenue - Returns - Discounts - Allowances"
  },
  "Take Rate": {
    description: "The percentage of transaction value that the platform retains as revenue.",
    formula: "Platform Revenue / Total Transaction Volume × 100"
  },
  "Default Rate": {
    description: "The percentage of loans or credit that borrowers fail to repay.",
    formula: "Defaulted Loans / Total Loans × 100"
  },
  "Active Accounts": {
    description: "The number of accounts that have had activity within a specified period."
  },
  "Customer Acquisition Cost": {
    description: "The total cost of acquiring a new customer.",
    formula: "Total Sales & Marketing Spend / New Customers Acquired"
  },
  "Average Revenue Per User": {
    description: "Total revenue divided by the number of users, measuring revenue efficiency.",
    formula: "Total Revenue / Total Users"
  },
  "ARPU": {
    description: "Average Revenue Per User - Total revenue divided by the number of users.",
    formula: "Total Revenue / Total Users"
  },
  "Fraud Rate": {
    description: "The percentage of transactions identified as fraudulent.",
    formula: "Fraudulent Transactions / Total Transactions × 100"
  },
  "Regulatory Capital Ratio": {
    description: "The ratio of a financial institution's capital to its risk-weighted assets.",
    formula: "Regulatory Capital / Risk-Weighted Assets × 100"
  },
  "Net Interest Margin": {
    description: "The difference between interest income and interest expenses, relative to interest-earning assets.",
    formula: "(Interest Income - Interest Expense) / Average Earning Assets × 100"
  },

  // Healthcare Metrics
  "Monthly Active Patients": {
    description: "The number of unique patients who engaged with the platform in a month."
  },
  "Revenue": {
    description: "Total income generated from business operations."
  },
  "Cost Per Patient": {
    description: "The average cost incurred to serve each patient.",
    formula: "Total Operating Costs / Number of Patients Served"
  },
  "Patient Retention Rate": {
    description: "The percentage of patients who continue using the service over time.",
    formula: "Returning Patients / Total Patients at Start × 100"
  },
  "Clinical Outcomes Score": {
    description: "A measure of the effectiveness of healthcare interventions."
  },
  "Provider Utilization Rate": {
    description: "The percentage of available provider time that is used for patient care.",
    formula: "Billable Hours / Total Available Hours × 100"
  },
  "Claims Processing Time": {
    description: "The average time taken to process insurance claims.",
    formula: "Sum of Processing Times / Number of Claims"
  },
  "Net Promoter Score": {
    description: "A measure of customer loyalty based on likelihood to recommend, ranging from -100 to 100.",
    formula: "% Promoters (9-10) - % Detractors (0-6)"
  },
  "NPS": {
    description: "Net Promoter Score - A measure of customer loyalty based on likelihood to recommend.",
    formula: "% Promoters (9-10) - % Detractors (0-6)"
  },
  "HIPAA Compliance Score": {
    description: "A measure of adherence to healthcare privacy and security regulations."
  },

  // E-commerce Metrics
  "Gross Merchandise Value": {
    description: "The total value of merchandise sold through the platform before deductions.",
    formula: "Sum of all order values (before fees, returns, cancellations)"
  },
  "GMV": {
    description: "Gross Merchandise Value - The total value of merchandise sold through the platform.",
    formula: "Sum of all order values (before fees, returns, cancellations)"
  },
  "Average Order Value": {
    description: "The average dollar amount spent per order.",
    formula: "Total Revenue / Number of Orders"
  },
  "AOV": {
    description: "Average Order Value - The average dollar amount spent per order.",
    formula: "Total Revenue / Number of Orders"
  },
  "Customer Lifetime Value": {
    description: "The total revenue expected from a customer over their entire relationship.",
    formula: "Average Order Value × Purchase Frequency × Customer Lifespan"
  },
  "Conversion Rate": {
    description: "The percentage of visitors who complete a desired action (e.g., make a purchase).",
    formula: "Conversions / Total Visitors × 100"
  },
  "Return Rate": {
    description: "The percentage of sold items that are returned by customers.",
    formula: "Returned Items / Total Items Sold × 100"
  },
  "Cart Abandonment Rate": {
    description: "The percentage of shopping carts that are created but not converted to purchases.",
    formula: "(Carts Created - Completed Purchases) / Carts Created × 100"
  },
  "Inventory Turnover": {
    description: "How many times inventory is sold and replaced over a period.",
    formula: "Cost of Goods Sold / Average Inventory Value"
  },
  "Repeat Purchase Rate": {
    description: "The percentage of customers who make more than one purchase.",
    formula: "Customers with 2+ Orders / Total Customers × 100"
  },

  // EdTech Metrics
  "Monthly Active Learners": {
    description: "The number of unique learners who engaged with the platform in a month."
  },
  "Course Completion Rate": {
    description: "The percentage of enrolled students who complete a course.",
    formula: "Students Who Completed / Students Who Enrolled × 100"
  },
  "Student Retention Rate": {
    description: "The percentage of students who continue using the platform over time.",
    formula: "Active Students End of Period / Active Students Start of Period × 100"
  },
  "Content Engagement Time": {
    description: "The average time users spend actively engaging with educational content.",
    formula: "Total Engagement Time / Number of Active Users"
  },
  "Instructor Satisfaction Score": {
    description: "A measure of instructor satisfaction with the platform."
  },
  "Instructor Satisfaction": {
    description: "A measure of instructor satisfaction with the platform."
  },
  "Learning Outcome Improvement": {
    description: "The measurable improvement in learning outcomes achieved by students.",
    formula: "(Post-Assessment Score - Pre-Assessment Score) / Pre-Assessment Score × 100"
  },

  // AI/ML Metrics
  "Monthly Active Users": {
    description: "The number of unique users who engaged with the product in a month."
  },
  "API Calls": {
    description: "The total number of API requests made to the platform."
  },
  "Compute Costs": {
    description: "The cost of computational resources used to run AI/ML models."
  },
  "Model Accuracy": {
    description: "The percentage of correct predictions made by the model.",
    formula: "Correct Predictions / Total Predictions × 100"
  },
  "Inference Latency": {
    description: "The time taken to generate a prediction or response from the model.",
    formula: "Average response time in milliseconds"
  },
  "Usage Growth Rate": {
    description: "The rate at which platform usage is increasing over time.",
    formula: "(Current Period Usage - Previous Period Usage) / Previous Period Usage × 100"
  },
  "Data Processing Volume": {
    description: "The amount of data processed by the platform."
  },

  // General Metrics
  "Operating Expenses": {
    description: "The ongoing costs of running the business, excluding cost of goods sold.",
    formula: "Sum of all operational costs (salaries, rent, utilities, etc.)"
  },
  "Headcount": {
    description: "The total number of employees in the organization."
  },
  "Customer Count": {
    description: "The total number of active customers."
  },
};

// Get definition for a metric, with fallback
export function getMetricDefinition(metricName: string): MetricInfo | null {
  // Try exact match first
  if (METRIC_DEFINITIONS[metricName]) {
    return METRIC_DEFINITIONS[metricName];
  }

  // Try case-insensitive match
  const lowerName = metricName.toLowerCase();
  for (const [key, value] of Object.entries(METRIC_DEFINITIONS)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  return null;
}
