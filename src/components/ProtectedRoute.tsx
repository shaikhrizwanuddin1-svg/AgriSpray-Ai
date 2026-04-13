import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

const ProtectedRoute = () => {
  const { isReady, user } = useAuth();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-2xl border border-border bg-card px-6 py-4 text-sm text-muted-foreground shadow-sm">
          Restoring your AgriSpray session...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
