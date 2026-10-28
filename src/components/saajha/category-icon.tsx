import { Activity, Camera, DoorOpen, Printer, type LucideProps } from "lucide-react";
import type { Category } from "@/lib/types";

export const CATEGORY_META: Record<Category, { label: string; Icon: React.ComponentType<LucideProps> }> = {
  fabrication: { label: "Fabrication", Icon: Printer },
  test_measurement: { label: "Test & Measurement", Icon: Activity },
  media: { label: "Media", Icon: Camera },
  space: { label: "Spaces", Icon: DoorOpen },
};

export function CategoryIcon({ category, ...props }: { category: Category } & LucideProps) {
  const { Icon } = CATEGORY_META[category];
  return <Icon strokeWidth={1.75} aria-hidden="true" {...props} />;
}
