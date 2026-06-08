import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { listProfiles, setProfilePasscode } from "@/lib/api";
import ProfileCard from "@/components/ProfileCard";
import PasscodeDialog from "@/components/PasscodeDialog";
import ThemePicker from "@/components/ThemePicker";

const CAROUSEL_THRESHOLD = 5;

export default function Home() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selected, setSelected] = useState(null);
  const carouselRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = (p) => {
    if (selectedCard) return;
    setSelectedCard(p.id);
    setTimeout(() => {
      setSelected(p);
      setSelectedCard(null);
    }, 350);
  };

  const handleSuccess = (p, passcode) => {
    sessionStorage.setItem(`mh_profile_${p.id}`, JSON.stringify(p));
    setProfilePasscode(p.id, passcode);
    setSelected(null);
    navigate(p.theme === "kids" ? `/kids/${p.id}` : `/profile/${p.id}`);
  };

  const scrollCarousel = (dir) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  const useCarousel = profiles.length >= CAROUSEL_THRESHOLD;

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16 overflow-hidden"
      style={{
        background: "linear-gradient(160deg, var(--mh-bg-from) 0%, var(--mh-bg-to) 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, var(--mh-glow), transparent 70%)",
        }}
      />

      {/* Admin gear */}
      <button
        type="button"
        data-testid="admin-login-trigger"
        onClick={() => navigate("/admin")}
        aria-label="Admin panel"
        className="absolute top-6 right-6 w-11 h-11 rounded-full border flex items-center justify-center
                   text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-300"
        style={{ borderColor: "var(--mh-border)" }}
      >
        <Settings className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-12 md:mb-16 z-10"
      >
        <p
          className="text-[10px] md:text-xs uppercase tracking-[0.4em] mb-3 font-medium"
          style={{ color: "var(--mh-subtext)" }}
        >
          MediaHub
        </p>
        <h1
          data-testid="home-title"
          className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white/90"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Who's tuning in?
        </h1>
      </motion.div>

      {/* Profile area */}
      <div className="relative z-10 w-full max-w-5xl">
        {loading ? (
          <div className="text-center text-white/30 text-sm" data-testid="home-loading">
            Loading profiles…
          </div>
        ) : profiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
            data-testid="home-empty"
          >
            <p className="text-white/50 mb-4">No profiles yet.</p>
            <button
              type="button"
              data-testid="home-empty-admin-btn"
              onClick={() => navigate("/admin")}
              className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline transition-colors"
            >
              Create one in the admin panel →
            </button>
          </motion.div>
        ) : useCarousel ? (
          /* ── Carousel (5+ profiles) ── */
          <div className="relative">
            {/* Prev button */}
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              aria-label="Scroll left"
              className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-20
                         w-10 h-10 rounded-full items-center justify-center
                         bg-white/[0.06] border border-white/10 text-white/60
                         hover:bg-white/[0.12] hover:text-white transition-all duration-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div
              ref={carouselRef}
              data-testid="profile-grid"
              className="flex gap-5 px-4 overflow-x-auto pb-2"
              style={{
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {profiles.map((p, idx) => (
                <div
                  key={p.id}
                  style={{ scrollSnapAlign: "center", flexShrink: 0 }}
                >
                  <ProfileCard
                    profile={p}
                    index={idx}
                    onClick={handleCardClick}
                    isSelected={selectedCard === p.id}
                  />
                </div>
              ))}
            </div>

            {/* Next button */}
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              aria-label="Scroll right"
              className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20
                         w-10 h-10 rounded-full items-center justify-center
                         bg-white/[0.06] border border-white/10 text-white/60
                         hover:bg-white/[0.12] hover:text-white transition-all duration-200"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Swipe hint (mobile) */}
            <p
              className="mt-4 text-center text-[11px] md:hidden"
              style={{ color: "var(--mh-subtext)" }}
            >
              Swipe to browse
            </p>
          </div>
        ) : (
          /* ── Grid (≤4 profiles) ── */
          <div
            data-testid="profile-grid"
            className="grid grid-cols-2 gap-5 md:gap-7 justify-items-center mx-auto"
            style={{ maxWidth: "420px" }}
          >
            {profiles.map((p, idx) => (
              <ProfileCard
                key={p.id}
                profile={p}
                index={idx}
                onClick={handleCardClick}
                isSelected={selectedCard === p.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Theme picker */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <ThemePicker />
      </motion.div>

      <PasscodeDialog
        profile={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
