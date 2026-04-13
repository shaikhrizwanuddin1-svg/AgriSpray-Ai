import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, ShieldCheck, BarChart3, Camera, CloudRain } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import OtpLoginCard from "@/components/OtpLoginCard";
import ThemeToggle from "@/components/ThemeToggle";
import seedlingHero from "@/assets/seedling-hero.svg";
import heroFarm from "@/assets/hero-farm.jpg";

const features = [
  { icon: Camera, text: "Live leaf disease detection" },
  { icon: BarChart3, text: "Weekly scan analytics & reports" },
  { icon: CloudRain, text: "Weather-aware spray recommendations" },
  { icon: ShieldCheck, text: "Secure mobile OTP login" },
];

const Login = () => {
  const { isReady, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isReady && user) navigate("/dashboard", { replace: true });
  }, [isReady, user, navigate]);

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      {/* theme toggle top-right */}
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      {/* ── LEFT PANEL — branding ── */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden lg:flex">
        {/* background image */}
        <img
          src={heroFarm}
          alt="Green farm field at sunrise — AgriSpray AI precision agriculture"
          className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.55]"
        />
        {/* seedling watermark */}
        <img
          src={seedlingHero}
          alt=""
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-64 w-64 object-contain opacity-10"
        />
        {/* overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(4,20,8,0.82)_0%,rgba(10,40,16,0.65)_100%)]" />

        <div className="relative z-10 flex flex-1 flex-col justify-center px-14 py-16">
          {/* logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10 flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 ring-2 ring-primary/40">
              <Leaf className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">AgriSpray AI</p>
              <p className="text-xs text-white/60">Precision Agriculture Platform</p>
            </div>
          </motion.div>

          {/* headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
              Smart Pesticide
              <br />
              <span className="text-primary">Spraying System</span>
            </h1>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-white/65">
              Reduce pesticide waste by up to 60% with AI-powered leaf disease detection and real-time weather guidance.
            </p>
          </motion.div>

          {/* feature list */}
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-10 space-y-4"
          >
            {features.map(({ icon: Icon, text }, i) => (
              <motion.li
                key={text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary/20">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-white/80">{text}</span>
              </motion.li>
            ))}
          </motion.ul>

          {/* stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-12 grid grid-cols-3 gap-4"
          >
            {[
              { value: "60%", label: "Pesticide saved" },
              { value: "94%", label: "Detection accuracy" },
              { value: "45%", label: "Cost reduction" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="mt-0.5 text-xs text-white/55">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* footer */}
        <div className="relative z-10 px-14 py-6">
          <p className="text-xs text-white/35">© 2025 AgriSpray AI · Shaikh Rizwan</p>
        </div>
      </div>

      {/* ── RIGHT PANEL — OTP login ── */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 py-12 lg:w-1/2">
        {/* mobile logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col items-center gap-2 lg:hidden"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
            <Leaf className="h-7 w-7 text-primary" />
          </div>
          <p className="text-xl font-bold">AgriSpray AI</p>
          <p className="text-sm text-muted-foreground">Precision Agriculture Platform</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <OtpLoginCard />
        </motion.div>

        <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
          © 2025 AgriSpray AI · Shaikh Rizwan
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Admin?{" "}
          <a href="/admin" className="text-primary hover:underline">Sign in as Admin →</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
