import { ProfessionalModulePlaceholder } from "@/components/dashboard/pro/ProfessionalModulePlaceholder";

type PageProps = {
  params: Promise<{
    centerId: string;
  }>;
};

export default async function ProfessionalCenterClassesPage({ params }: PageProps) {
  const { centerId } = await params;

  return (
    <ProfessionalModulePlaceholder
      centerId={centerId}
      moduleName="Clases"
      permissionModule="classes"
      permissionAction="viewClasses"
    />
  );
}
