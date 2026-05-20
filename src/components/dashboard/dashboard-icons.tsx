import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Database,
  DollarSign,
  FileSignature,
  FileText,
  Heart,
  Home,
  Megaphone,
  MessageSquare,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap = {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Database,
  DollarSign,
  FileSignature,
  FileText,
  Heart,
  Home,
  Megaphone,
  MessageSquare,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  Wrench
} satisfies Record<string, LucideIcon>;

export function DashboardIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = iconMap[name as keyof typeof iconMap] ?? Activity;
  return <Icon size={size} />;
}
