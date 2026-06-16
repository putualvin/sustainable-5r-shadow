import { PageSkeleton } from "@/components/shared/page-skeleton";

// Shown for every authenticated route while its server data loads.
export default function Loading() {
  return <PageSkeleton />;
}
