import type { Application, LeasePacket, LeaseTemplate, Property, Unit, User } from "@prisma/client";
import { formatCurrency } from "@/lib/format";

type LeasePreviewInput = LeasePacket & {
  template: LeaseTemplate;
  application: Application & {
    applicantUser?: User | null;
    unit: Unit & { property: Property & { owner?: User | null } };
  };
};

function dateLabel(value: Date | null | undefined) {
  return value ? value.toLocaleDateString() : "Not set";
}

export function leaseTokenMap(packet: LeasePreviewInput) {
  const application = packet.application;
  const unit = application.unit;
  const property = unit.property;
  const landlord = property.owner;

  return {
    applicant_name: application.applicantName,
    applicant_email: application.applicantEmail,
    applicant_phone: application.applicantPhone ?? "Not provided",
    tenant_name: application.applicantName,
    property_name: property.name,
    property_address: `${property.addressLine}, ${property.city}, ${property.state} ${property.zip}`,
    unit_number: unit.unitNumber,
    landlord_name: landlord?.name ?? property.name,
    landlord_email: landlord?.email ?? "Not assigned",
    lease_start_date: dateLabel(packet.leaseStartDate),
    lease_end_date: dateLabel(packet.leaseEndDate),
    monthly_rent: formatCurrency(packet.monthlyRent),
    security_deposit: packet.securityDeposit === null || typeof packet.securityDeposit === "undefined" ? "Not set" : formatCurrency(packet.securityDeposit),
    lease_terms: packet.terms ?? "No additional terms entered.",
    application_id: application.id,
    lease_packet_id: packet.id
  };
}

export function renderLeaseTemplate(packet: LeasePreviewInput) {
  const tokens = leaseTokenMap(packet);
  let output = packet.template.body;

  for (const [key, value] of Object.entries(tokens)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }

  return output;
}

export const DEFAULT_LEASE_TEMPLATE_BODY = `RESIDENTIAL LEASE PACKET\n\nTenant: {{tenant_name}}\nTenant Email: {{applicant_email}}\nTenant Phone: {{applicant_phone}}\n\nLandlord / Owner: {{landlord_name}}\nLandlord Email: {{landlord_email}}\n\nProperty: {{property_name}}\nAddress: {{property_address}}\nUnit: {{unit_number}}\n\nLease Term\nStart Date: {{lease_start_date}}\nEnd Date: {{lease_end_date}}\n\nFinancial Terms\nMonthly Rent: {{monthly_rent}}\nSecurity Deposit: {{security_deposit}}\n\nAdditional Terms\n{{lease_terms}}\n\nSignature Placeholders\nTenant Signature: ______________________________ Date: ____________\nLandlord Signature: ____________________________ Date: ____________\n\nInternal Reference\nApplication ID: {{application_id}}\nLease Packet ID: {{lease_packet_id}}`;
