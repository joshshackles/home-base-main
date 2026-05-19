import type { ReactNode } from "react";

export type DashboardDTO = {
  title: string;
  accountLabel: string;
  metrics: Array<{
    label: string;
    value: string | number;
    detail?: string;
    href?: string;
  }>;
  queue: Array<{
    title: string;
    detail: string;
    href: string;
    tone?: "slate" | "blue" | "green" | "amber" | "red";
  }>;
};

export type LedgerDTO = {
  id: string;
  label: string;
  amount: number;
  status: string;
  href?: string;
};

export type MessageDTO = {
  id: string;
  subject: string;
  preview: string;
  unread: boolean;
  href: string;
};

export type ContactDTO = {
  id: string;
  name: string;
  role: string;
  scope: string;
  href?: string;
};

export type TimelineItemDTO = {
  id: string;
  title: string;
  detail?: string;
  tone?: "slate" | "blue" | "green" | "amber" | "red";
  icon?: ReactNode;
};
