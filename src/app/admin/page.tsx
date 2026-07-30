import { AdminUsersView } from "@/components/auth/AdminUsersView";
import { AdminErrorLogView } from "@/components/auth/AdminErrorLogView";

export default function AdminPage() {
  return (
    <div className="space-y-10">
      <AdminUsersView />
      <AdminErrorLogView />
    </div>
  );
}
