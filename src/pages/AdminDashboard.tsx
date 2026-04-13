import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Activity, Leaf, Droplets, Server, Wifi,
  MessageSquare, Clock, TrendingUp, UserCheck, ShieldCheck, RefreshCw,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAuth } from "@/components/AuthProvider";
import { fetchAdminStats } from "@/lib/auth-api";

type AdminStats = {
  users: { total: number; activeToday: number; activeSessions: number };
  scans: { total: number; sprayEvents: number; today: number };
  dailyScans: Array<{ day: string; scans: number }>;
  recentUsers: Array<{ id: string; mobileNumber: string; name: string | null; lastLoginAt: string | null; createdAt: string }>;
  systemStatus: { database: string; backend: string; smsProvider: string; uptime: number };
};

const formatUptime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
};

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminStats(token);
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  // auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => void load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const statCards = stats ? [
    { icon: Users, label: "Total Users", value: stats.users.total, sub: `${stats.users.activeToday} active today`, color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Wifi, label: "Active Sessions", value: stats.users.activeSessions, sub: "Currently logged in", color: "text-green-500", bg: "bg-green-500/10" },
    { icon: Leaf, label: "Total Scans", value: stats.scans.total, sub: `${stats.scans.today} scans today`, color: "text-primary", bg: "bg-primary/10" },
    { icon: Droplets, label: "Spray Events", value: stats.scans.sprayEvents, sub: `${stats.scans.total > 0 ? ((stats.scans.sprayEvents / stats.scans.total) * 100).toFixed(1) : 0}% of scans`, color: "text-orange-500", bg: "bg-orange-500/10" },
  ] : [];

  return (
    <div className="space-y-8 p-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Welcome, {user?.name ?? "Administrator"} · Last updated: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">{error}</div>
      )}

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{loading ? "—" : s.value.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xs font-medium text-primary">{loading ? "Loading..." : s.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* daily scans chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Scans — Last 7 Days</h3>
          </div>
          {stats?.dailyScans && stats.dailyScans.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.dailyScans}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="scans" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Scans" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              {loading ? "Loading chart..." : "No scan data yet"}
            </div>
          )}
        </motion.div>

        {/* system status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">System Status</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Backend API", value: stats?.systemStatus.backend ?? "—", icon: Activity, ok: true },
              { label: "Database", value: stats?.systemStatus.database ?? "—", icon: Server, ok: true },
              { label: "SMS Provider", value: stats?.systemStatus.smsProvider?.toUpperCase() ?? "—", icon: MessageSquare, ok: true },
              { label: "Uptime", value: stats ? formatUptime(stats.systemStatus.uptime) : "—", icon: Clock, ok: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{loading ? "—" : item.value}</span>
                  <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* recent users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Recent Users</h3>
          <span className="ml-auto rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium">
            {loading ? "—" : `${stats?.users.total ?? 0} total`}
          </span>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading users...</p>
        ) : stats?.recentUsers && stats.recentUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left font-semibold text-muted-foreground">Name</th>
                  <th className="pb-3 text-left font-semibold text-muted-foreground">Mobile</th>
                  <th className="pb-3 text-left font-semibold text-muted-foreground">Last Login</th>
                  <th className="pb-3 text-left font-semibold text-muted-foreground">Joined</th>
                  <th className="pb-3 text-left font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map((u) => {
                  const lastLogin = u.lastLoginAt ? new Date(u.lastLoginAt) : null;
                  const isActive = lastLogin && (Date.now() - lastLogin.getTime()) < 24 * 60 * 60 * 1000;
                  return (
                    <tr key={u.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 font-medium">{u.name ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{u.mobileNumber}</td>
                      <td className="py-3 text-muted-foreground">
                        {lastLogin ? lastLogin.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-muted-foreground"}`} />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No users registered yet.</p>
        )}
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
