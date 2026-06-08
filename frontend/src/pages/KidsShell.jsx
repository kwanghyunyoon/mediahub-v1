import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { listMedia, clearProfilePasscode } from "@/lib/api";
import KidsLayout, { DEFAULT_TABS } from "@/layouts/KidsLayout";
import KidsDesktopLayout from "@/layouts/KidsDesktopLayout";
import KidsVideoPlayer from "@/components/KidsVideoPlayer";
import KidsCheckinOverlay from "@/components/KidsCheckinOverlay";
import { useCheckinTimer } from "@/hooks/use-checkin-timer";
import { useIsMobile } from "@/hooks/use-is-mobile";

const SHOW_CONFIG = {
  "Cars by Pixar": {
    icon: "⚡",
    gradient: "linear-gradient(155deg,#5C0000 0%,#A81500 30%,#D43000 60%,#FF5200 85%,#FF7800 100%)",
    tint: "linear-gradient(to top,rgba(7,7,7,0.95) 0%,rgba(7,7,7,0.35) 50%,transparent 100%)",
    accent: "#FF5200",
    glow: "rgba(255,82,0,0.55)",
  },
  Bluey: {
    icon: "💙",
    gradient: "linear-gradient(155deg,#071F45 0%,#0D4EA0 40%,#1A72D0 70%,#3A9FE8 100%)",
    tint: "linear-gradient(to top,rgba(7,7,7,0.95) 0%,rgba(7,7,7,0.35) 50%,transparent 100%)",
    accent: "#1E80D8",
    glow: "rgba(58,159,232,0.55)",
  },
  SuperKitties: {
    icon: "🐱",
    gradient: "linear-gradient(155deg,#340050 0%,#6E0E98 40%,#A020C8 70%,#E040B0 100%)",
    tint: "linear-gradient(to top,rgba(7,7,7,0.95) 0%,rgba(7,7,7,0.35) 50%,transparent 100%)",
    accent: "#C030B0",
    glow: "rgba(224,64,176,0.55)",
  },
  Pocoyo: {
    icon: "🔵",
    gradient: "linear-gradient(155deg,#002060 0%,#0050C0 40%,#0080E0 70%,#40B8FF 100%)",
    tint: "linear-gradient(to top,rgba(7,7,7,0.95) 0%,rgba(7,7,7,0.35) 50%,transparent 100%)",
    accent: "#0090E8",
    glow: "rgba(64,184,255,0.55)",
  },
};

const FALLBACK_CONFIG = {
  icon: "🎬",
  gradient: "linear-gradient(155deg,#1a003a 0%,#4a0080 40%,#7000b8 70%,#a040e0 100%)",
  tint: "linear-gradient(to top,rgba(7,7,7,0.95) 0%,rgba(7,7,7,0.35) 50%,transparent 100%)",
  accent: "#8840d0",
  glow: "rgba(136,64,208,0.55)",
};

function getShowConfig(label) {
  return SHOW_CONFIG[label] || FALLBACK_CONFIG;
}

const CHECKIN_OPTIONS = [0, 10, 20, 30];

const TABS = DEFAULT_TABS;

function VideoCard({ item, idx, last, section, isMobile, onPlay }) {
  const [hovered, setHovered] = useState(false);
  const cw = isMobile ? 136 : 220;
  const ch = isMobile ? 77 : 124;
  const accent = section.config.accent;

  return (
    <button
      key={item.id}
      onClick={onPlay}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      style={{
        flexShrink: 0,
        width: cw,
        background: "none",
        border: "none",
        padding: 0,
        WebkitTapHighlightColor: "transparent",
        cursor: "pointer",
        textAlign: "left",
        transform: hovered ? "scale(1.05)" : "scale(1)",
        transition: "transform 0.2s ease",
        zIndex: hovered ? 2 : 1,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          width: cw,
          height: ch,
          borderRadius: isMobile ? "0.45rem" : "0.35rem",
          overflow: "hidden",
          outline: idx === last ? `2px solid ${accent}` : "2px solid transparent",
          outlineOffset: "-2px",
          boxShadow: hovered ? `0 12px 40px rgba(0,0,0,0.7), 0 0 20px ${accent}33` : "none",
          transition: "box-shadow 0.2s ease",
        }}
      >
        {item.posterUrl ? (
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${item.posterUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: section.config.gradient }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 55%,rgba(0,0,0,0.35) 100%)" }} />

        {/* Hover overlay with play button */}
        {!isMobile && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(255,255,255,0.92)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", paddingLeft: "0.15rem",
            }}>▶</div>
          </div>
        )}

        <div style={{ position: "absolute", top: "0.3rem", left: "0.3rem", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", borderRadius: "0.22rem", padding: "1px 5px", fontSize: "0.55rem", fontWeight: 800, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Ep {idx + 1}
        </div>
        {idx === last && (
          <div style={{ position: "absolute", top: "0.3rem", right: "0.3rem", background: accent, borderRadius: "0.22rem", padding: "1px 5px", fontSize: "0.52rem", fontWeight: 800, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Last
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)" }} />
      </div>

      <p style={{ fontFamily: "Nunito, Arial, sans-serif", fontSize: isMobile ? "0.68rem" : "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.82)", marginTop: "0.4rem", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {item.title}
      </p>
      {item.description && (
        <p style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.32)", marginTop: "0.1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.description}
        </p>
      )}
    </button>
  );
}

function HeroCarousel({ sections, isMobile, playAll, playSection, lastWatchedIdx }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const bg = isMobile ? "#070707" : "#08080F";
  const heroH = isMobile ? "clamp(220px,56vw,340px)" : "clamp(440px,52vh,580px)";

  const startAuto = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % sections.length), 6000);
  }, [sections.length]);

  useEffect(() => {
    startAuto();
    return () => clearInterval(timerRef.current);
  }, [startAuto]);

  const go = (dir) => {
    setIdx((i) => (i + dir + sections.length) % sections.length);
    startAuto();
  };

  const slide = sections[idx];
  const last = lastWatchedIdx(slide.label);
  const hasWatched = last >= 0;

  return (
    <div
      style={{ position: "relative", width: "100%", height: heroH, overflow: "hidden", flexShrink: 0 }}
      onMouseEnter={() => clearInterval(timerRef.current)}
      onMouseLeave={startAuto}
    >
      {/* Animated slide */}
      <AnimatePresence mode="sync">
        <motion.div
          key={slide.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          style={{ position: "absolute", inset: 0 }}
        >
          <div style={{ position: "absolute", inset: 0, background: slide.poster ? `url('${slide.poster}') center top / cover no-repeat` : slide.config.gradient }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${bg}88 0%, transparent 30%)` }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${bg} 0%, ${bg}cc 22%, transparent 58%)` }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${bg}cc 0%, transparent 50%)` }} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: isMobile ? "1.25rem 1.25rem 1.5rem" : "2rem 3rem 2.5rem", zIndex: 2 }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: `${slide.config.accent}28`, border: `1px solid ${slide.config.accent}55`, borderRadius: "2rem", padding: "0.2rem 0.75rem", marginBottom: "0.8rem" }}>
          <span style={{ fontSize: "0.9rem" }}>{slide.config.icon}</span>
          <span style={{ fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: slide.config.accent }}>
            {slide.items.length} {slide.items.length === 1 ? "Video" : "Videos"}
          </span>
        </div>

        <h2 style={{ fontFamily: "Outfit,sans-serif", fontWeight: 900, fontSize: isMobile ? "clamp(1.5rem,6vw,2rem)" : "clamp(2rem,3.5vw,3rem)", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em", textShadow: "0 2px 24px rgba(0,0,0,0.9)", marginBottom: isMobile ? "0.75rem" : "0.65rem", lineHeight: 1 }}>
          {slide.label}
        </h2>

        {!isMobile && (
          <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.55)", marginBottom: "1.4rem", maxWidth: 480, lineHeight: 1.6, fontWeight: 500 }}>
            {hasWatched
              ? `You left off on episode ${last + 1}. Pick up where you stopped.`
              : `${slide.items.length} episode${slide.items.length !== 1 ? "s" : ""} ready to watch.`}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {hasWatched ? (
            <button
              onClick={() => playSection(slide.label, last)}
              style={{ padding: isMobile ? "0.55rem 1.2rem" : "0.75rem 1.75rem", borderRadius: "0.5rem", fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: isMobile ? "0.78rem" : "0.9rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: slide.config.accent, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              ▶ Continue Watching — Ep {last + 1}
            </button>
          ) : (
            <button
              onClick={() => playAll(slide.label)}
              style={{ padding: isMobile ? "0.55rem 1.2rem" : "0.75rem 1.75rem", borderRadius: "0.5rem", fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: isMobile ? "0.78rem" : "0.9rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: slide.config.accent, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              ▶ Watch Now
            </button>
          )}
          {!isMobile && hasWatched && (
            <button
              onClick={() => playAll(slide.label)}
              style={{ padding: "0.72rem 1.4rem", borderRadius: "0.5rem", fontFamily: "Outfit,sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.16)", cursor: "pointer", backdropFilter: "blur(8px)" }}
            >
              ↺ Start Over
            </button>
          )}
        </div>
      </div>

      {/* Prev / Next arrows (desktop) */}
      {!isMobile && sections.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", zIndex: 3, width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >‹</button>
          <button
            onClick={() => go(1)}
            style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", zIndex: 3, width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >›</button>
        </>
      )}

      {/* Dot indicators */}
      {sections.length > 1 && (
        <div style={{ position: "absolute", bottom: isMobile ? "0.6rem" : "1rem", right: isMobile ? "1rem" : "3rem", zIndex: 3, display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {sections.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); startAuto(); }}
              style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 3, background: i === idx ? slide.config.accent : "rgba(255,255,255,0.3)", border: "none", padding: 0, cursor: "pointer", transition: "all 0.3s ease" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StreamingContent({ sections, isMobile, playAll, playSection, lastWatchedIdx }) {
  const bg = isMobile ? "#070707" : "#08080F";
  const rowPadX = isMobile ? "1rem" : "2rem";

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: bg, scrollbarWidth: "none" }}>

      {/* ── Hero carousel ── */}
      <HeroCarousel
        sections={sections}
        isMobile={isMobile}
        playAll={playAll}
        playSection={playSection}
        lastWatchedIdx={lastWatchedIdx}
      />

      {/* ── Content rows ── */}
      <div style={{ paddingBottom: isMobile ? "2rem" : "3rem" }}>
        {sections.map((section) => {
          const last = lastWatchedIdx(section.label);
          return (
            <div key={section.label} style={{ marginTop: isMobile ? "1.75rem" : "2.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: `0 ${rowPadX}`, marginBottom: "0.75rem" }}>
                <span style={{ fontSize: isMobile ? "1rem" : "1.1rem" }}>{section.config.icon}</span>
                <span style={{ fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: isMobile ? "0.82rem" : "1rem", color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {section.label}
                </span>
                <span style={{ marginLeft: "auto", fontSize: isMobile ? "0.6rem" : "0.72rem", color: "rgba(255,255,255,0.28)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {section.items.length} Videos
                </span>
              </div>
              <div style={{ display: "flex", gap: isMobile ? "0.55rem" : "0.75rem", overflowX: "auto", padding: `0.1rem ${rowPadX} 0.75rem`, scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {section.items.map((item, i) => (
                  <VideoCard
                    key={item.id}
                    item={item}
                    idx={i}
                    last={last}
                    section={section}
                    isMobile={isMobile}
                    onPlay={() => playSection(section.label, i)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComingSoon({ label }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <span style={{ fontSize: "2.5rem", opacity: 0.4 }}>🚧</span>
      <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
        {label} — Coming Soon
      </p>
    </div>
  );
}

export default function KidsShell() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("home");
  const [playerState, setPlayerState] = useState(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isMobile = useIsMobile();
  const Layout = isMobile ? KidsLayout : KidsDesktopLayout;

  const fireCheckin = useCallback(() => setCheckinOpen(true), []);

  const { intervalMins, setIntervalMins, scheduleCheckin } = useCheckinTimer({
    profileId: id,
    onCheckin: fireCheckin,
  });

  const handleDismissCheckin = useCallback(() => {
    setCheckinOpen(false);
    scheduleCheckin(intervalMins);
  }, [scheduleCheckin, intervalMins]);

  useEffect(() => {
    const raw = sessionStorage.getItem(`mh_profile_${id}`);
    if (!raw) { navigate("/", { replace: true }); return; }
    setProfile(JSON.parse(raw));
  }, [id, navigate]);

  useEffect(() => {
    if (!profile) return;
    listMedia(id)
      .then(setMedia)
      .catch(() => { setMedia([]); toast.error("Failed to load media"); })
      .finally(() => setLoading(false));
  }, [profile, id]);

  const sections = useMemo(() => {
    if (!profile) return [];
    return profile.sections
      .map((label) => ({
        label,
        items: media.filter((m) => m.sectionLabel === label),
        config: getShowConfig(label),
        poster: media.find((m) => m.sectionLabel === label)?.posterUrl || null,
      }))
      .filter((s) => s.items.length > 0);
  }, [profile, media]);

  const handleLogout = () => {
    clearProfilePasscode(id);
    sessionStorage.removeItem(`mh_profile_${id}`);
    navigate("/", { replace: true });
  };

  const lastWatchedIdx = (label) => {
    const stored = localStorage.getItem(`mh_last_${id}_${label}`);
    return stored !== null ? parseInt(stored, 10) : -1;
  };

  const playSection = (label, startIdx) => {
    const section = sections.find((s) => s.label === label);
    if (!section) return;
    setPlayerState({
      playlist: section.items,
      startIdx,
      accentColor: section.config.accent,
      sectionLabel: label,
    });
  };

  const playAll = (label) => {
    const last = lastWatchedIdx(label);
    const section = sections.find((s) => s.label === label);
    if (!section) return;
    const startIdx = last >= 0 ? Math.min(last, section.items.length - 1) : 0;
    playSection(label, startIdx);
  };

  if (!profile) return null;

  // Hero = first section that has a last-watched entry, otherwise first section
  const heroSection =
    sections.find((s) => lastWatchedIdx(s.label) >= 0) || sections[0] || null;
  const heroLast = heroSection ? lastWatchedIdx(heroSection.label) : -1;

  return (
    <>
      <Layout
        profileName={profile.name}
        intervalMins={intervalMins}
        onTimerClick={() => setPickerOpen(true)}
        onLogout={handleLogout}
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
      >
        {tab !== "home" ? (
          <ComingSoon label={TABS.find((t) => t.key === tab)?.label || tab} />
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            Loading…
          </div>
        ) : sections.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            No videos yet.
          </div>
        ) : (
          <StreamingContent
            sections={sections}
            isMobile={isMobile}
            playAll={playAll}
            playSection={playSection}
            lastWatchedIdx={lastWatchedIdx}
          />
        )}
      </Layout>

      {/* ── Check-in timer picker ── */}
      <AnimatePresence>
        {pickerOpen && (
          <>
            <motion.div
              key="picker-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={() => setPickerOpen(false)}
            />
            <motion.div
              key="picker-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl overflow-hidden"
              style={{
                background: "#0d0d12",
                borderTop: "3px solid rgba(255,215,0,0.3)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
            >
              <div className="px-6 pt-5 pb-6">
                <p className="text-center text-xs uppercase tracking-widest mb-4 font-black" style={{ color: "rgba(255,215,0,0.6)" }}>
                  ⏰ Check-in Reminder
                </p>
                <div className="flex flex-col gap-2">
                  {CHECKIN_OPTIONS.map((mins) => (
                    <button
                      key={mins}
                      onClick={() => { setIntervalMins(mins); setPickerOpen(false); }}
                      className="w-full py-3.5 rounded-2xl font-black text-sm tracking-widest uppercase"
                      style={{
                        background: intervalMins === mins ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.04)",
                        border: intervalMins === mins ? "1px solid rgba(255,215,0,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        color: intervalMins === mins ? "rgba(255,215,0,0.9)" : "rgba(255,255,255,0.6)",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      {mins === 0 ? "OFF — NO REMINDERS" : `EVERY ${mins} MINUTES`}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Video Player ── */}
      {playerState && (
        <KidsVideoPlayer
          {...playerState}
          profileId={id}
          checkinOpen={checkinOpen}
          onClose={() => setPlayerState(null)}
        />
      )}

      {/* ── Check-in overlay ── */}
      <KidsCheckinOverlay open={checkinOpen} onDismiss={handleDismissCheckin} />
    </>
  );
}
