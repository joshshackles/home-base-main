export type FinancialMetricDTO = {
  label: string;
  value: string;
  detail?: string;
  tone?: "slate" | "blue" | "green" | "amber" | "red";
};

export type LedgerRowDTO = {
  id: string;
  description: string;
  unitLabel: string;
  amount: string;
  status: string;
  dueLabel?: string;
  href?: string;
};
