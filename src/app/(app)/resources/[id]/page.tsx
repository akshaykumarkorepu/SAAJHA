import { Suspense } from "react";
import { ResourceDetail } from "@/components/resource/resource-detail";
import { DetailSkeleton } from "@/components/saajha/skeletons";

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
