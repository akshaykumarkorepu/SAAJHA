import type { Metadata } from "next";
import { ComingNext } from "@/components/shell/coming-next";

export const metadata: Metadata = { title: "My bookings" };

export default function Page() {
  return <ComingNext title="My bookings" body="Your requests, check-outs and returns will live here, each with a timeline you can trust." />;
}
