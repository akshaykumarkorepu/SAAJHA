import { Suspense } from "react";
import type { Metadata } from "next";
import { ResourceDetail } from "@/components/resource/resource-detail";
import { DetailSkeleton } from "@/components/saajha/skeletons";

// Static metadata keeps this route prerenderable; the client sets the resource name as the tab title.
export const metadata: Metadata = { title: "Resource" };

export default function ResourcePage({ params }: PageProps<"/resources/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: PageProps<"/resources/[id]">["params"] }) {
  const { id } = await params;
  return <ResourceDetail id={id} />;
}
