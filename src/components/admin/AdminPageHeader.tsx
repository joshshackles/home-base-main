import { ShieldCheck } from "lucide-react";
import { CommandCenterHeader } from "@/components/ui/CommandCenterPrimitives";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function AdminPageHeader({ eyebrow = "Admin", title, description, actionHref, actionLabel }: AdminPageHeaderProps) {
  return (
    <CommandCenterHeader
      className="mb-5 sm:mb-8"
      eyebrow={eyebrow}
      title={title}
      description={description}
      actionHref={actionHref}
      actionLabel={actionLabel}
      icon={<ShieldCheck className="text-blue-700" size={30} />}
    />
  );
}
