export const dynamic = "force-dynamic";

import { FileSignature } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { CommandCenterHeader } from "@/components/ui/CommandCenterPrimitives";
import { DocumentGenerationWorkspace } from "@/components/document-generation/DocumentGenerationWorkspace";
import { ensureSystemDocumentTemplates, listDocumentTemplates, listGeneratedDocuments } from "@/lib/document-generation/service";
import { generateLandlordDocumentAction } from "@/app/landlord/document-generation/actions";

export default async function LandlordDocumentGenerationPage() {
  const user = await requireRole(["LANDLORD"], "/landlord/document-generation");
  await ensureSystemDocumentTemplates(user);
  const [templates, generatedDocuments] = await Promise.all([
    listDocumentTemplates(user),
    listGeneratedDocuments(user)
  ]);

  return (
    <main id="main-content" className="min-h-screen bg-[#f7faff]">
      <div className="mx-auto max-w-[1520px] px-3 py-4 sm:px-5 lg:px-6">
        <CommandCenterHeader
          eyebrow="Document generation"
          title="Lease and report generation"
          description="Generate leases, tenant statements, rent rolls, property summaries, maintenance reports, inspection reports, and application packets from shared platform data."
          actionHref="/landlord/documents"
          actionLabel="Document archive"
          secondaryHref="/landlord/reports"
          secondaryLabel="Reports"
          icon={<FileSignature className="text-blue-700" size={30} />}
        />
        <section className="mt-4">
          <DocumentGenerationWorkspace templates={templates} generatedDocuments={generatedDocuments} generateAction={generateLandlordDocumentAction} />
        </section>
      </div>
    </main>
  );
}
