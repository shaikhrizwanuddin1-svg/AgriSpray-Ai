import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Lock, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { adminLogin } from "@/lib/auth-api";
import ThemeToggle from "@/components/ThemeToggle";

const AdminLogin = () => {
  const { isReady, user, completeLogin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && user) {
      navigate(user.role === "admin" ? "/admin/dashboard" : "/login", { replace: true });
    }
  }, [isReady, user, navigate]);

  const handleLogin = async () => {
    if (!username.trim() || !password) { setError("Enter username and password."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogin({ username: username.trim(), password });
      completeLogin({ ...res, redirectTo: "/admin/dashboard", isNewUser: false });
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="absolute right-4 top-4 z-50"><ThemeToggle /></div>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* header */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
            <Leaf className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">AgriSpray AI</h1>
          <p className="text-sm text-muted-foreground">Admin Portal</p>
        </div>

        {/* card */}
        <div className="rounded-[30px] border border-border bg-card p-6 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">Admin Access</p>
              <h2 className="mt-1 text-xl font-semibold">Sign in to Admin</h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Username</label>
              <input
                type="text"
                autoComplete="username"
                placeholder="admin"
                value={username}
                disabled={loading}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") void handleLogin(); }}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                disabled={loading}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") void handleLogin(); }}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
              />
            </div>

            <button
              onClick={() => void handleLogin()}
              disabled={loading || !username || !password}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-[0_18px_35px_hsl(var(--primary)/0.28)] transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {loading ? "Signing in…" : "Sign In as Admin"}
            </button>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Not an admin?{" "}
              <a href="/login" className="text-primary hover:underline">User login →</a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
