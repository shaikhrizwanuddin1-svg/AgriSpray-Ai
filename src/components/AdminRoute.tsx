import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

const AdminRoute = () => {
  const { isReady, user } = useAuth();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-2xl border border-border bg-card px-6 py-4 text-sm text-muted-foreground shadow-sm">
          Restoring session...
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};

export default AdminRoute;
