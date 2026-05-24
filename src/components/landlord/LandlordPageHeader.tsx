import { Home } from "lucide-react";
import { CommandCenterHeader } from "@/components/ui/CommandCenterPrimitives";

type LandlordPageHeaderProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function LandlordPageHeader({ title, description, actionHref, actionLabel }: LandlordPageHeaderProps) {
  return (
    <CommandCenterHeader
      className="mb-5 sm:mb-8"
      eyebrow="Landlord workspace"
      title={title}
      description={description}
      actionHref={actionHref}
      actionLabel={actionLabel}
      icon={<Home className="text-blue-700" size={30} />}
    />
  );
}
