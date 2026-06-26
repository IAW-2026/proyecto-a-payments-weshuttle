import { redirect } from "next/navigation";

export default function DriverSettlementsPage() {
  redirect("/driver/trips?tab=cobros");
}
