import { redirect } from "next/navigation";
import { ModuleHiddenNotice } from "@/components/dashboard/ModuleHiddenNotice";
import { isModuleVisible } from "@/lib/modules/moduleConfig";

export default function HiddenStudentsPage() {
  if (isModuleVisible("alumnos")) {
    redirect("/dashboard/center/students");
  }

  return <ModuleHiddenNotice />;
}
