import { redirect } from "next/navigation";
import { ModuleHiddenNotice } from "@/components/dashboard/ModuleHiddenNotice";
import { isModuleVisible } from "@/lib/modules/moduleConfig";

export default function HiddenPaddocksPage() {
  if (isModuleVisible("paddocks")) {
    redirect("/dashboard/center/paddocks");
  }

  return <ModuleHiddenNotice />;
}
