import { redirect } from "next/navigation";
import { ModuleHiddenNotice } from "@/components/dashboard/ModuleHiddenNotice";
import { isModuleVisible } from "@/lib/modules/moduleConfig";

export default function HiddenAlumnosPage() {
  if (isModuleVisible("alumnos")) {
    redirect("/dashboard/center/students");
  }

  return <ModuleHiddenNotice />;
}
