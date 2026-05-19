export type ThreadDTO = {
  id: string;
  subject: string;
  preview: string;
  href: string;
  unreadCount: number;
  escalationState?: "normal" | "watch" | "escalated";
  relatedUnit?: string;
  ownerLabel?: string;
  slaLabel?: string;
};
