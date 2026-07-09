import { ProfessionalModulePlaceholder } from "@/components/dashboard/pro/ProfessionalModulePlaceholder";

type PageProps = {
  params: Promise<{
    centerId: string;
  }>;
};

export default async function ProfessionalCenterVeterinaryPage({ params }: PageProps) {
  const { centerId } = await params;

  return (
    <ProfessionalModulePlaceholder
      centerId={centerId}
      moduleName="Veterinaria"
      permissionModule="veterinary"
      permissionAction="viewHistory"
    />
  );
}
