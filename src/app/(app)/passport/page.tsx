import type { Metadata } from "next";
import { ComingNext } from "@/components/shell/coming-next";

export const metadata: Metadata = { title: "Skill Passport" };

export default function Page() {
  return <ComingNext title="Skill Passport" body="Your training badges, pending certificates and what each one unlocks." />;
}
