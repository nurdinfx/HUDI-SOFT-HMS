import { DailyOperationsContent } from "@/components/daily-operations/daily-operations-content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Operations | HMS",
  description: "Manage daily operational expenses, lab uses, and cash flows.",
};

export default function DailyOperationsPage() {
  return <DailyOperationsContent />;
}
