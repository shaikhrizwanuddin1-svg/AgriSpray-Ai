import { motion } from "framer-motion";
import { Brain, Droplets, Leaf, LogIn, ScanSearch, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/components/I18nProvider";
import seedlingHero from "@/assets/seedling-hero.svg";
import diseasedLeaf from "@/assets/diseased-leaf.jpg";
import healthyLeaf from "@/assets/healthy-leaf.jpg";

const HeroSection = () => {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={seedlingHero}
          alt="Young crop seedling at sunrise"
          className="h-full w-full scale-[1.06] transform-gpu object-cover object-center brightness-[0.72] contrast-150 saturate-140"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,9,6,0.96)_0%,rgba(6,13,9,0.88)_30%,rgba(7,15,10,0.72)_58%,rgba(7,15,10,0.84)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(255,232,154,0.16),transparent_18%),radial-gradient(circle_at_74%_24%,rgba(68,171,90,0.12),transparent_22%),radial-gradient(circle_at_50%_115%,rgba(0,0,0,0.88),transparent_42%)]" />
        <div className="absolute -left-12 top-16 h-52 w-52 animate-float rounded-full bg-[#f6e2a4]/10 blur-3xl" />
        <div className="absolute bottom-12 right-12 h-44 w-44 animate-float-delayed rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 backdrop-blur-sm shadow-[0_0_30px_hsl(var(--primary)/0.18)]">
              <Leaf className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary-foreground/90">{t("hero.badge")}</span>
            </div>

            <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
              {t("hero.titleLine1")}
              <br />
              <span className="text-primary">{t("hero.titleLine2")}</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/72 md:text-xl">{t("hero.description")}</p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/detection"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[0_18px_35px_hsl(var(--primary)/0.35)] transition-all duration-300 hover:-translate-y-1 hover:bg-primary/90"
              >
                <Brain className="h-5 w-5" />
                {t("hero.tryDetection")}
              </Link>
              <Link
                to="/system"
                className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-6 py-3 font-semibold text-primary-foreground backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-primary-foreground/20"
              >
                <Droplets className="h-5 w-5" />
                {t("hero.howItWorks")}
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { label: t("hero.statSaved"), value: "60%" },
                { label: t("hero.statAccuracy"), value: "94%" },
                { label: t("hero.statCost"), value: "45%" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-primary-foreground/10 bg-card/10 px-5 py-4 backdrop-blur-md">
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="mt-1 text-sm text-primary-foreground/65">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 max-w-2xl rounded-[28px] border border-primary-foreground/10 bg-card/10 p-5 text-primary-foreground backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ScanSearch className="h-4 w-4 text-primary" />
                  {t("hero.flowTitle")}
                </div>
                <div className="rounded-full bg-primary/20 px-2 py-1 text-[11px] text-primary">{t("hero.realtime")}</div>
              </div>
              <div className="space-y-3">
                {[
                  [t("hero.flowStep1"), t("hero.flowStep1Text")],
                  [t("hero.flowStep2"), t("hero.flowStep2Text")],
                  [t("hero.flowStep3"), t("hero.flowStep3Text")],
                ].map(([title, subtitle], index) => (
                  <div key={title} className="flex items-start gap-3 rounded-2xl border border-primary-foreground/10 bg-background/10 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">{index + 1}</div>
                    <div>
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="text-xs text-primary-foreground/70">{subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs">
                <Sparkles className="h-4 w-4 animate-pulse text-warning" />
                {t("hero.flowNote")}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="flex w-full flex-col items-center justify-center gap-4 lg:justify-self-end"
          >
            {/* leaf preview cards */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <div className="overflow-hidden rounded-2xl border border-green-500/30 bg-card/20 backdrop-blur">
                <img
                  src={healthyLeaf}
                  alt="Healthy crop leaf — no disease detected"
                  className="h-36 w-full object-cover"
                />
                <p className="px-3 py-2 text-xs font-semibold text-green-400">✓ Healthy Leaf</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-red-500/30 bg-card/20 backdrop-blur">
                <img
                  src={diseasedLeaf}
                  alt="Diseased crop leaf — disease detected, spray recommended"
                  className="h-36 w-full object-cover"
                />
                <p className="px-3 py-2 text-xs font-semibold text-red-400">⚠ Disease Detected</p>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-[0_18px_35px_hsl(var(--primary)/0.35)] transition-all duration-300 hover:-translate-y-1 hover:bg-primary/90"
            >
              <LogIn className="h-5 w-5" />
              Login / Get Started
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
