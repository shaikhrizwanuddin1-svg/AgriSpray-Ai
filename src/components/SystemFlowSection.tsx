import { motion } from "framer-motion";
import { Camera, Server, Brain, Gauge, Droplets, LayoutDashboard } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

const SystemFlowSection = () => {
  const { t } = useI18n();

  const steps = [
    { icon: Camera, title: t("systemFlow.imageCapture"), desc: t("systemFlow.imageCaptureDesc") },
    { icon: Server, title: t("systemFlow.backendProcessing"), desc: t("systemFlow.backendProcessingDesc") },
    { icon: Brain, title: t("systemFlow.aiDetection"), desc: t("systemFlow.aiDetectionDesc") },
    { icon: Gauge, title: t("systemFlow.decisionEngine"), desc: t("systemFlow.decisionEngineDesc") },
    { icon: Droplets, title: t("systemFlow.sprayActivation"), desc: t("systemFlow.sprayActivationDesc") },
    { icon: LayoutDashboard, title: t("systemFlow.dashboard"), desc: t("systemFlow.dashboardDesc") },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group relative rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent transition-colors group-hover:bg-primary/10">
                <step.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <span className="mb-1 block text-xs font-mono text-muted-foreground">{t("systemFlow.step", { count: i + 1 })}</span>
                <h3 className="mb-1 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-2xl text-muted-foreground/30 lg:block">→</div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SystemFlowSection;
