"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formDataToObject, leadSchema, validationMessage } from "@/lib/validation";

export async function createLead(formData: FormData) {
  const parsed = leadSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    const unitId = typeof formData.get("unitId") === "string" ? formData.get("unitId") : "";
    redirect(`/marketplace/${unitId}?error=${encodeURIComponent(validationMessage(parsed.error))}`);
  }

  const payload = parsed.data;

  const unit = await prisma.unit.findFirst({
    where: {
      id: payload.unitId,
      status: "AVAILABLE",
      property: { isArchived: false }
    },
    select: { id: true }
  });

  if (!unit) {
    redirect(`/marketplace/${payload.unitId}?error=${encodeURIComponent("This unit is no longer available for public inquiries.")}`);
  }

  await prisma.lead.create({ data: payload });

  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath(`/marketplace/${payload.unitId}`);
  redirect(`/marketplace/${payload.unitId}?lead=success`);
}
