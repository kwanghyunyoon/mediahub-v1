import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut } from "lucide-react";
import { toast } from "sonner";
import { listMedia, clearProfilePasscode } from "@/lib/api";
import KidsVideoPlayer from "@/components/KidsVideoPlayer";
import KidsCheckinOverlay from "@/components/KidsCheckinOverlay";
import { useCheckinTimer } from "@/hooks/use-checkin-timer";
import KidsTimer from "@/pages/KidsTimer";
import KidsGallery from "@/pages/KidsGallery";

const SHOW_CONFIG = {
  "Cars by Pixar": {
    icon: "⚡",
    gradient: "linear-gradient(155deg,#5C0000 0%,#A81500 30%,#D43000 60%,#FF5200 85%,#FF7800 100%)",
    tint: "linear-gradient(to bottom,rgba(92,0,0,0.55) 0%,rgba(168,21,0,0.25) 55%,rgba(0,0,0,0) 100%)",
    accent: "#FF5200",
    glow: "rgba(255,82,0,0.55)",
    ambience: "rgba(255,65,0,0.1)",
  },
  Bluey: {
    icon: "💙",
    gradient: "linear-gradient(155deg,#071F45 0%,#0D4EA0 40%,#1A72D0 70%,#3A9FE8 100%)",
    tint: "linear-gradient(to bottom,rgba(7,31,69,0.5) 0%,rgba(13,78,160,0.2) 55%,rgba(0,0,0,0) 100%)",
    accent: "#1E80D8",
    glow: "rgba(58,159,232,0.55)",
    ambience: "rgba(28,120,210,0.1)",
  },
  SuperKitties: {
    icon: "🐱",
    gradient: "linear-gradient(155deg,#340050 0%,#6E0E98 40%,#A020C8 70%,#E040B0 100%)",
    tint: "linear-gradient(to bottom,rgba(52,0,80,0.55) 0%,rgba(110,14,152,0.2) 55%,rgba(0,0,0,0) 100%)",
    accent: "#C030B0",
    glow: "rgba(224,64,176,0.55)",
    ambience: "rgba(190,48,175,0.1)",
  },
  Pocoyo: {
    icon: "🔵",
    gradient: "linear-gradient(155deg,#002060 0%,#0050C0 40%,#0080E0 70%,#40B8FF 100%)",
    tint: "linear-gradient(to bottom,rgba(0,60,120,0.55) 0%,rgba(0,120,200,0.2) 55%,rgba(0,0,0,0) 100%)",
    accent: "#0090E8",
    glow: "rgba(64,184,255,0.55)",
    ambience: "rgba(0,140,230,0.1)",
  },
};

const FALLBACK_CONFIG = {
  icon: "🎬",
  gradient: "linear-gradient(155deg,#1a003a 0%,#4a0080 40%,#7000b8 70%,#a040e0 100%)",
  tint: "linear-gradient(to bottom,rgba(30,0,60,0.55) 0%,rgba(70,0,120,0.2) 55%,rgba(0,0,0,0) 100%)",
  accent: "#8840d0",
  glow: "rgba(136,64,208,0.55)",
  ambience: "rgba(100,40,180,0.1)",
};

function getShowConfig(label) {
  return SHOW_CONFIG[label] || FALLBACK_CONFIG;
}

const CHECKIN_OPTIONS = [0, 10, 20, 30];

export default function KidsShell() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab: "videos" | "timer" | "gallery"
  const [tab, setTab] = useState("videos");

  // Show carousel
  const [cardIdx, setCardIdx] = useState(0);
  const trackRef = useRef(null);
  const touchStart = useRef(null);

  // Action sheet
  const [actionSheet, setActionSheet] = useState(null); // section label or null

  // Video list drawer
  const [listSheet, setListSheet] = useState(null); // section label or null

  // Player state
  const [playerState, setPlayerState] = useState(null); // { playlist, startIdx, accentColor, sectionLabel }

  // Check-in overlay
  const [checkinOpen, setCheckinOpen] = useState(false);

  // Check-in timer picker
  const [pickerOpen, setPickerOpen] = useState(false);

  const fireCheckin = useCallback(() => {
    setCheckinOpen(true);
  }, []);

  const { intervalMins, setIntervalMins, scheduleCheckin } = useCheckinTimer({
    profileId: id,
    onCheckin: fireCheckin,
  });

  const handleDismissCheckin = useCallback(() => {
    setCheckinOpen(false);
    scheduleCheckin(intervalMins);
  }, [scheduleCheckin, intervalMins]);

  // Auth guard
  useEffect(() => {
    const raw = sessionStorage.getItem(`mh_profile_${id}`);
    if (!raw) { navigate("/", { replace: true }); return; }
    setProfile(JSON.parse(raw));
  }, [id, navigate]);

  // Load media
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

  // Carousel swipe
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && cardIdx < sections.length - 1) setCardIdx(cardIdx + 1);
    if (dx > 0 && cardIdx > 0) setCardIdx(cardIdx - 1);
  };

  const openPlayAll = (label) => {
    const section = sections.find((s) => s.label === label);
    if (!section) return;
    const stored = parseInt(localStorage.getItem(`mh_last_${id}_${label}`) || "0", 10);
    const startIdx = Math.min(stored, section.items.length - 1);
    setPlayerState({
      playlist: section.items,
      startIdx,
      accentColor: section.config.accent,
      sectionLabel: label,
    });
    setActionSheet(null);
  };

  const openVideoList = (label) => {
    setActionSheet(null);
    setListSheet(label);
  };

  const playFromList = (label, idx) => {
    const section = sections.find((s) => s.label === label);
    if (!section) return;
    setPlayerState({
      playlist: section.items,
      startIdx: idx,
      accentColor: section.config.accent,
      sectionLabel: label,
    });
    setListSheet(null);
  };

  const lastWatchedIdx = (label) => {
    const stored = localStorage.getItem(`mh_last_${id}_${label}`);
    return stored !== null ? parseInt(stored, 10) : -1;
  };

  if (!profile) return null;

  const activeSection = sections[cardIdx];

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "#070707", fontFamily: "'Nunito', Arial, sans-serif" }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span
          className="text-sm font-black tracking-widest uppercase text-white/80"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {profile.name}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="px-3 py-1.5 rounded-full text-xs font-black tracking-widest"
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              background: intervalMins > 0 ? "rgba(255,215,0,0.12)" : "transparent",
              color: intervalMins > 0 ? "rgba(255,215,0,0.9)" : "rgba(255,255,255,0.4)",
            }}
          >
            ⏰ {intervalMins > 0 ? `${intervalMins}m` : "OFF"}
          </button>
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)" }}
            aria-label="Exit"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* ── Main content area ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {tab === "timer" ? (
          <KidsTimer checkinOpen={checkinOpen} onCheckin={fireCheckin} onDismissCheckin={handleDismissCheckin} intervalMins={intervalMins} scheduleCheckin={scheduleCheckin} />
        ) : tab === "gallery" ? (
          <KidsGallery />
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            Loading…
          </div>
        ) : sections.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            No videos yet.
          </div>
        ) : (
          /* ── Show carousel ── */
          <div
            className="flex-1 flex flex-col items-center justify-center overflow-hidden"
            style={{
              background: `radial-gradient(ellipse 120% 52% at 50% 78%, ${activeSection?.config.ambience || "transparent"} 0%, transparent 68%)`,
            }}
          >
            {/* Cards track */}
            <div
              className="w-full overflow-hidden"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <div
                ref={trackRef}
                style={{
                  display: "flex",
                  transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
                  transform: `translateX(calc(50% - 40vw - ${cardIdx * 82}vw))`,
                }}
              >
                {sections.map((s, i) => {
                  const dist = Math.abs(i - cardIdx);
                  const scale = dist === 0 ? 1 : 0.88 - dist * 0.04;
                  const opacity = dist === 0 ? 1 : 0.5 - dist * 0.1;
                  return (
                    <div
                      key={s.label}
                      onClick={() => {
                        if (i === cardIdx) setActionSheet(s.label);
                        else setCardIdx(i);
                      }}
                      style={{
                        width: "80vw",
                        maxWidth: 520,
                        height: "clamp(260px, 55vh, 420px)",
                        flexShrink: 0,
                        marginRight: "2vw",
                        borderRadius: "1.25rem",
                        overflow: "hidden",
                        position: "relative",
                        transform: `scale(${scale})`,
                        opacity,
                        transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease",
                        cursor: "pointer",
                        WebkitTapHighlightColor: "transparent",
                        boxShadow: dist === 0 ? `0 20px 60px -15px ${s.config.glow}` : "none",
                      }}
                    >
                      {/* Background */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: s.poster
                            ? `${s.config.tint}, url('${s.poster}') center top / cover, ${s.config.gradient}`
                            : s.config.gradient,
                        }}
                      />
                      {/* Shimmer overlay */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 50%,rgba(0,0,0,0.2) 100%)",
                        }}
                      />
                      {/* Icon */}
                      <div
                        style={{
                          position: "absolute",
                          top: "1.2rem",
                          right: "1.4rem",
                          fontSize: "2.8rem",
                          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
                        }}
                      >
                        {s.config.icon}
                      </div>
                      {/* Label */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: "1.5rem",
                          left: "1.5rem",
                          right: "1.5rem",
                        }}
                      >
                        <p
                          style={{
                            fontFamily: "Outfit, sans-serif",
                            fontWeight: 700,
                            fontSize: "clamp(1.4rem,4vw,1.9rem)",
                            color: "#fff",
                            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          {s.label}
                        </p>
                        <p
                          style={{
                            fontSize: "0.72rem",
                            color: "rgba(255,255,255,0.6)",
                            letterSpacing: "0.18em",
                            fontWeight: 800,
                            marginTop: "0.2rem",
                          }}
                        >
                          {s.items.length} VIDEO{s.items.length !== 1 ? "S" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dot indicators */}
            <div className="flex gap-2 mt-4">
              {sections.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCardIdx(i)}
                  style={{
                    width: i === cardIdx ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === cardIdx ? (activeSection?.config.accent || "#fff") : "rgba(255,255,255,0.25)",
                    border: "none",
                    padding: 0,
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                  aria-label={`Show ${i + 1}`}
                />
              ))}
            </div>

            {/* Tap hint */}
            {sections.length > 0 && (
              <p
                className="mt-3 text-[10px] tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.25)", fontWeight: 800 }}
              >
                Tap card to play
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom nav ── */}
      <nav
        className="flex shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0a0a0d" }}
      >
        {[
          { key: "videos", icon: "🎬", label: "Videos" },
          { key: "timer", icon: "⏱", label: "Timer" },
          { key: "gallery", icon: "🖼", label: "Gallery" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3"
            style={{
              color: tab === item.key ? "#FFD700" : "rgba(255,255,255,0.35)",
              fontSize: "1.3rem",
              border: "none",
              background: "transparent",
              WebkitTapHighlightColor: "transparent",
              cursor: "pointer",
            }}
          >
            <span>{item.icon}</span>
            <span style={{ fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.1em" }}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* ── Action sheet (Play All / Video List) ── */}
      <AnimatePresence>
        {actionSheet && (
          <>
            <motion.div
              key="as-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              style={{ background: "rgba(0,0,0,0.55)" }}
              onClick={() => setActionSheet(null)}
            />
            <motion.div
              key="as-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-30 rounded-t-3xl overflow-hidden"
              style={{
                background: "#0d0d12",
                borderTop: `3px solid ${sections.find((s) => s.label === actionSheet)?.config.accent || "#fff"}44`,
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
            >
              <div className="px-6 pt-5 pb-2">
                <p
                  className="text-center text-xs uppercase tracking-widest mb-4"
                  style={{ color: "rgba(255,255,255,0.4)", fontWeight: 800 }}
                >
                  {actionSheet}
                </p>
                {(() => {
                  const s = sections.find((sec) => sec.label === actionSheet);
                  const last = lastWatchedIdx(actionSheet);
                  const accentColor = s?.config.accent || "#fff";
                  return (
                    <div className="flex flex-col gap-3 pb-4">
                      <button
                        onClick={() => openPlayAll(actionSheet)}
                        className="w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase"
                        style={{
                          background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor})`,
                          color: "#fff",
                          border: "none",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        {last > 0 ? `▶ RESUME FROM VIDEO ${last + 1}` : "▶ PLAY ALL"}
                      </button>
                      <button
                        onClick={() => openVideoList(actionSheet)}
                        className="w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "rgba(255,255,255,0.85)",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        ☰ VIDEO LIST
                      </button>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Video list sheet ── */}
      <AnimatePresence>
        {listSheet && (
          <>
            <motion.div
              key="list-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              style={{ background: "rgba(0,0,0,0.7)" }}
              onClick={() => setListSheet(null)}
            />
            <motion.div
              key="list-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-30 rounded-t-3xl overflow-hidden flex flex-col"
              style={{
                background: "#0d0d12",
                maxHeight: "80dvh",
                borderTop: `3px solid ${sections.find((s) => s.label === listSheet)?.config.accent || "#fff"}44`,
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
                <p className="text-xs uppercase tracking-widest font-black" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {listSheet}
                </p>
                <button onClick={() => setListSheet(null)} style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", padding: 4 }}>
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
              <div className="overflow-y-auto px-4 pb-4">
                {(() => {
                  const s = sections.find((sec) => sec.label === listSheet);
                  const last = lastWatchedIdx(listSheet);
                  const accentColor = s?.config.accent || "#fff";
                  return s?.items.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => playFromList(listSheet, i)}
                      className="w-full flex items-center gap-3 py-3 px-3 rounded-xl mb-1 text-left"
                      style={{
                        background: i === last ? `${accentColor}15` : "rgba(255,255,255,0.03)",
                        border: i === last ? `1px solid ${accentColor}40` : "1px solid transparent",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <span
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                        style={{
                          background: i === last ? accentColor : "rgba(255,255,255,0.1)",
                          color: "#fff",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{item.title}</p>
                        {item.description && (
                          <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                      {i === last && (
                        <span
                          className="shrink-0 text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full"
                          style={{ background: accentColor, color: "#fff" }}
                        >
                          LAST
                        </span>
                      )}
                    </button>
                  ));
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
    </div>
  );
}
