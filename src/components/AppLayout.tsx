import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/I18nProvider";
import { isCompactAgronomyLocale } from "@/lib/crop-intel-display";

const AppLayout = () => {
  const { language, t } = useI18n();
  const compactLocale = isCompactAgronomyLocale(language);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border/70 bg-card/80 px-4 backdrop-blur-xl">
            <SidebarTrigger className="mr-3" />
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary)/0.8)]" />
              <span className="text-sm font-medium text-muted-foreground">
                {compactLocale ? t("app.brand") : t("app.headerTitle")}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground md:block">
                {compactLocale ? t("nav.detection") : t("app.diagnostics")}
              </div>
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_32%),radial-gradient(circle_at_bottom_right,hsl(var(--secondary)/0.12),transparent_28%)]">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
