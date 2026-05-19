export type CoherenceTone = "slate" | "blue" | "green" | "amber" | "red";

export type CoherenceInputTask = {
  title: string;
  detail: string;
  href: string;
  tone?: "default" | "urgent" | "success";
};

export type CoherenceInputTool = {
  title: string;
  detail: string;
  href: string;
};

export type CoherenceInputMetric = {
  label: string;
  value: string | number;
  href: string;
  detail?: string;
};

export type CoherenceArea = {
  key: "work" | "inbox" | "records" | "money" | "activity";
  label: string;
  question: string;
  detail: string;
  href: string;
  count: string | number;
  tone: CoherenceTone;
};

export type CoherenceSummary = {
  primaryQuestion: string;
  nextActionLabel: string;
  nextActionHref: string;
  attentionTotal: number;
  moduleTotal: number;
  areas: CoherenceArea[];
};

function firstHref(items: Array<{ href: string; label?: string; title?: string }>, patterns: RegExp[], fallback: string) {
  return items.find((item) => patterns.some((pattern) => pattern.test(`${item.href} ${item.label ?? ""} ${item.title ?? ""}`)))?.href ?? fallback;
}

function firstMetric(metrics: CoherenceInputMetric[], patterns: RegExp[]) {
  return metrics.find((metric) => patterns.some((pattern) => pattern.test(`${metric.label} ${metric.href} ${metric.detail ?? ""}`)));
}

function countForMetric(metric: CoherenceInputMetric | undefined, fallback: number | string) {
  return metric?.value ?? fallback;
}

function taskTone(tone?: CoherenceInputTask["tone"]): CoherenceTone {
  if (tone === "urgent") return "red";
  if (tone === "success") return "green";
  return "blue";
}

export function buildDashboardCoherence({
  tasks,
  tools,
  metrics
}: {
  tasks: CoherenceInputTask[];
  tools: CoherenceInputTool[];
  metrics: CoherenceInputMetric[];
}): CoherenceSummary {
  const urgentTasks = tasks.filter((task) => task.tone === "urgent");
  const nextAction = urgentTasks[0] ?? tasks[0];
  const workMetric = firstMetric(metrics, [/task/i, /work/i, /application/i, /lead/i]);
  const inboxMetric = firstMetric(metrics, [/inbox/i, /message/i, /lead/i]);
  const recordMetric = firstMetric(metrics, [/rental/i, /listing/i, /unit/i, /home/i, /propert/i]);
  const moneyMetric = firstMetric(metrics, [/ledger/i, /payment/i, /rent/i, /balance/i, /payout/i]);
  const activityMetric = firstMetric(metrics, [/security/i, /access/i, /audit/i, /notice/i]);
  const allNavItems = [...tools, ...metrics.map((metric) => ({ title: metric.label, href: metric.href }))];

  const workHref = nextAction?.href ?? firstHref(allNavItems, [/task/i, /application/i, /lead/i, /maintenance/i], "/applicant/tasks");
  const inboxHref = firstHref(allNavItems, [/inbox/i, /message/i, /lead/i], "/applicant/inbox");
  const recordsHref = firstHref(allNavItems, [/rental/i, /unit/i, /home/i, /marketplace/i], "/marketplace");
  const moneyHref = firstHref(allNavItems, [/ledger/i, /payment/i, /rent/i, /payout/i], "/applicant/payments");
  const activityHref = firstHref(allNavItems, [/task/i, /report/i, /analytics/i, /system/i], workHref);

  const areas: CoherenceArea[] = [
    {
      key: "work",
      label: "Today's work",
      question: "What needs action right now?",
      detail: nextAction?.detail ?? "No urgent work is currently waiting.",
      href: workHref,
      count: urgentTasks.length > 0 ? urgentTasks.length : countForMetric(workMetric, tasks.length),
      tone: nextAction ? taskTone(nextAction.tone) : "green"
    },
    {
      key: "inbox",
      label: "Inbox",
      question: "Who is waiting on me?",
      detail: "Messages, leads, repair conversations, approvals, and notices should converge here.",
      href: inboxHref,
      count: countForMetric(inboxMetric, 0),
      tone: "amber"
    },
    {
      key: "records",
      label: "Rental records",
      question: "Where is the source of truth?",
      detail: "Open the rental/person/workflow record instead of hunting across modules.",
      href: recordsHref,
      count: countForMetric(recordMetric, tools.length),
      tone: "blue"
    },
    {
      key: "money",
      label: "Money",
      question: "What is owed, paid, failed, or ready?",
      detail: moneyMetric?.detail ?? "Ledger, payment, rent, payout, and balance work should be one click away.",
      href: moneyHref,
      count: countForMetric(moneyMetric, 0),
      tone: "green"
    },
    {
      key: "activity",
      label: "Activity",
      question: "What changed since last time?",
      detail: "Recent tasks, approvals, lifecycle changes, payments, documents, and messages form the timeline.",
      href: activityHref,
      count: countForMetric(activityMetric, tasks.length),
      tone: "slate"
    }
  ];

  return {
    primaryQuestion: nextAction?.title ?? "Everything is calm. Choose a module or search for the next record.",
    nextActionLabel: nextAction ? nextAction.title : "Open dashboard",
    nextActionHref: nextAction?.href ?? workHref,
    attentionTotal: urgentTasks.length,
    moduleTotal: tools.length,
    areas
  };
}
