import { ProfessionalModulePlaceholder } from "@/components/dashboard/pro/ProfessionalModulePlaceholder";

type PageProps = {
  params: Promise<{
    centerId: string;
  }>;
};

export default async function ProfessionalCenterAgendaPage({ params }: PageProps) {
  const { centerId } = await params;

  return (
    <ProfessionalModulePlaceholder
      centerId={centerId}
      moduleName="Agenda"
      permissionModule="agenda"
      permissionAction="view"
    />
  );
}
