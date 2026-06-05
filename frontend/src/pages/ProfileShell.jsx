import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut } from "lucide-react";
import { getIcon, hexToRgb } from "@/lib/registry";
import { Button } from "@/components/ui/button";

export default function ProfileShell() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem(`mh_profile_${id}`);
    if (!raw) {
      navigate("/", { replace: true });
      return;
    }
    setProfile(JSON.parse(raw));
  }, [id, navigate]);

  const rgb = useMemo(() => (profile ? hexToRgb(profile.color) : "255,255,255"), [profile]);

  if (!profile) return null;
  const Icon = getIcon(profile.icon);

  const exit = () => {
    sessionStorage.removeItem(`mh_profile_${id}`);
    navigate("/");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ "--p-color": profile.color, "--p-rgb": rgb }}
    >
      {/* Top bar */}
      <header
        data-testid="profile-header"
        className="flex items-center justify-between px-5 md:px-10 py-5 border-b border-white/[0.06]"
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            data-testid="profile-back-btn"
            onClick={exit}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: profile.color }}
            >
              <Icon className="w-4 h-4 text-white" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">Profile</span>
              <span
                data-testid="profile-name-display"
                className="text-sm md:text-base font-medium text-white/90"
              >
                {profile.name}
              </span>
            </div>
          </div>
        </div>

        <Button
          data-testid="profile-exit-btn"
          variant="ghost"
          size="sm"
          onClick={exit}
          className="text-white/50 hover:text-white hover:bg-white/[0.05] gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Exit</span>
        </Button>
      </header>

      {/* Section nav */}
      <nav
        data-testid="profile-sections-nav"
        className="px-5 md:px-10 py-5 border-b border-white/[0.06] overflow-x-auto"
      >
        {profile.sections.length === 0 ? (
          <p className="text-xs uppercase tracking-[0.2em] text-white/30">No sections configured</p>
        ) : (
          <div className="flex items-center gap-2 md:gap-3 min-w-max">
            {profile.sections.map((label, idx) => {
              const active = idx === activeSection;
              return (
                <button
                  key={`${label}-${idx}`}
                  type="button"
                  data-testid={`section-tab-${idx}`}
                  onClick={() => setActiveSection(idx)}
                  className={`relative px-4 md:px-5 py-2 rounded-full text-sm transition-colors duration-300 whitespace-nowrap ${
                    active
                      ? "text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="active-section-pill"
                      className="absolute inset-0 rounded-full border"
                      style={{
                        backgroundColor: `rgba(var(--p-rgb), 0.14)`,
                        borderColor: `rgba(var(--p-rgb), 0.5)`,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Empty content placeholder */}
      <main className="flex-1 flex items-center justify-center p-8">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          data-testid="profile-content-placeholder"
          className="text-center max-w-md"
        >
          <div
            className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: `rgba(var(--p-rgb), 0.1)`,
              border: `1px solid rgba(var(--p-rgb), 0.3)`,
            }}
          >
            <Icon className="w-9 h-9" style={{ color: profile.color }} strokeWidth={1.5} />
          </div>
          <h2
            className="text-2xl md:text-3xl font-light tracking-tight text-white/90 mb-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {profile.sections[activeSection] || "Welcome"}
          </h2>
          <p className="text-sm text-white/40 leading-relaxed">
            This section is ready for media. Content modules will live here in upcoming releases.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
