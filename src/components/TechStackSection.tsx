import { motion } from "framer-motion";
import { Code, Cpu, Eye, Database, Cog, Smartphone } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

const TechStackSection = () => {
  const { t } = useI18n();

  const techs = [
    { icon: Cpu, name: t("techStack.tf"), desc: t("techStack.tfDesc") },
    { icon: Eye, name: t("techStack.cv"), desc: t("techStack.cvDesc") },
    { icon: Code, name: t("techStack.node"), desc: t("techStack.nodeDesc") },
    { icon: Database, name: t("techStack.postgres"), desc: t("techStack.postgresDesc") },
    { icon: Cog, name: t("techStack.arduino"), desc: t("techStack.arduinoDesc") },
    { icon: Smartphone, name: t("techStack.mobile"), desc: t("techStack.mobileDesc") },
  ];

  return (
    <div>
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-3">
        {techs.map((tItem, i) => (
          <motion.div
            key={tItem.name}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-card p-5 text-center transition-colors hover:border-primary/40"
          >
            <tItem.icon className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="mb-1 text-sm font-semibold">{tItem.name}</p>
            <p className="text-xs text-muted-foreground">{tItem.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TechStackSection;
