import { ProfessionalModulePlaceholder } from "@/components/dashboard/pro/ProfessionalModulePlaceholder";

type PageProps = {
  params: Promise<{
    centerId: string;
  }>;
};

export default async function ProfessionalCenterClientsPage({ params }: PageProps) {
  const { centerId } = await params;

  return (
    <ProfessionalModulePlaceholder
      centerId={centerId}
      moduleName="Clientes"
      permissionModule="clients"
      permissionAction={["viewOwners", "viewStudents"]}
    />
  );
}
