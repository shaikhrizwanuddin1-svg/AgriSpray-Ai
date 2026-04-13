import { LayoutDashboard, Camera, BarChart3, GitBranch, Cpu, Leaf, Sparkles, LogOut, UserRound, Brain, ShoppingBasket, ShieldCheck } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "@/components/I18nProvider";
import { useAuth } from "@/components/AuthProvider";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const USER_NAV = [
  { key: "dashboard", url: "/dashboard", icon: LayoutDashboard },
  { key: "detection", url: "/detection", icon: Camera },
  { key: "analytics", url: "/analytics", icon: BarChart3 },
  { key: "market", url: "/market", icon: ShoppingBasket },
] as const;

const ADMIN_NAV = [
  { key: "dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { key: "detection", url: "/detection", icon: Camera },
  { key: "analytics", url: "/analytics", icon: BarChart3 },
  { key: "training", url: "/training", icon: Brain },
  { key: "system", url: "/system", icon: GitBranch },
  { key: "tech", url: "/tech", icon: Cpu },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const { t } = useI18n();
  const { user, logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? ADMIN_NAV : USER_NAV;

  const getLabel = (key: string) => {
    if (key === "tech") return t("pages.techTitle");
    if (key === "market") return "Market";
    if (key === "training") return t("nav.training");
    return t(`nav.${key}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate(isAdmin ? "/admin" : "/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_10px_30px_hsl(var(--primary)/0.28)]">
            <div className="absolute inset-0 rounded-xl bg-primary/30 blur-md" />
            <Leaf className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight">{t("app.brand")}</span>
              <span className="text-[11px] text-muted-foreground">
                {isAdmin ? "Admin Panel" : t("app.subtitle")}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("app.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className="group relative rounded-xl px-2 py-2 transition-all duration-300 hover:translate-x-1 hover:bg-muted/60"
                      activeClassName="bg-primary/10 text-primary font-medium shadow-sm before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-primary"
                    >
                      <item.icon className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                      {!collapsed && <span>{getLabel(item.key)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mx-3 mt-auto rounded-2xl border border-border/70 bg-card/70 p-3 shadow-sm backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-warning" />
              {t("app.guidedScanTitle")}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("app.guidedScanText")}</p>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {user && (
          <div className={`mb-2 flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 ${collapsed ? "justify-center" : ""}`}>
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
              {isAdmin ? <ShieldCheck className="h-4 w-4 text-primary" /> : <UserRound className="h-4 w-4 text-primary" />}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{user.name ?? "User"}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {isAdmin ? "Administrator" : user.mobileNumber}
                </p>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60 ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>{isLoggingOut ? t("sidebar.loggingOut") : t("sidebar.logout")}</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
