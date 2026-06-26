import { requirePageRole } from "@/lib/auth";
import { AdminNotificationTracker } from "@/components/admin-notification-tracker";

export const runtime = "nodejs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure that only admins can access any admin sub-routes
  await requirePageRole(["admin"]);

  return (
    <>
      <AdminNotificationTracker />
      {children}
    </>
  );
}
