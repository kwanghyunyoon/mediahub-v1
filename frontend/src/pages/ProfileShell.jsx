import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, LogOut, Home as HomeIcon, Search as SearchIcon, Bookmark, Settings as SettingsIcon, X as XIcon } from "lucide-react";
import { useInactivityTimer } from "@/hooks/use-inactivity-timer";
import { Button } from "@/components/ui/button";
import { getIcon, hexToRgb } from "@/lib/registry";
import { listMedia, clearProfilePasscode } from "@/lib/api";
import { getMyList, toggleMyList as toggleMyListStorage } from "@/lib/mylist";
import VideoPlayer from "@/components/VideoPlayer";
import { useIsMobile } from "@/hooks/use-is-mobile";

const SECTION_TAB_MAP = {
  "Yellowstone":  "shows",
  "1883":         "shows",
  "1923":         "shows",
  "Marshals":     "shows",
  "Dutton Ranch": "shows",
  "Madison":      "shows",
  "Clips & Extras": "clips",
};

const BOTTOM_NAV_TABS = [
  { key: "home",     label: "Home",     Icon: HomeIcon     },
  { key: "search",   label: "Search",   Icon: SearchIcon   },
  { key: "list",     label: "My List",  Icon: Bookmark     },
  { key: "settings", label: "Settings", Icon: SettingsIcon },
];

const HOME_FILTERS = [
  { key: "all",   label: "All"      },
  { key: "shows", label: "TV Shows" },
  { key: "clips", label: "Clips"    },
];

// ── Bottom navigation bar ─────────────────────────────────────────────────────
function BottomNavBar({ activeTab, onTabChange, accentColor, isWestern, isNeon, isStudio }) {
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      display: "flex",
      background: isWestern ? "rgba(20,15,11,0.97)" : isNeon ? "rgba(5,4,20,0.97)" : isStudio ? "rgba(18,13,8,0.97)" : "rgba(6,6,10,0.97)",
      backdropFilter: "blur(24px)",
      borderTop: isWestern ? "1px solid #3a2a1c" : isNeon ? "1px solid #2a1845" : isStudio ? "1px solid #2d2419" : "1px solid rgba(255,255,255,0.07)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {BOTTOM_NAV_TABS.map(({ key, label, Icon }) => {
        const active = key === activeTab;
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "0.65rem 0.25rem 0.55rem",
              gap: "0.22rem",
              color: active ? accentColor : "rgba(255,255,255,0.32)",
              background: "none", border: "none", cursor: "pointer",
              transition: "color 0.15s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Icon size={active ? 22 : 20} strokeWidth={active ? 2.2 : 1.5} />
            <span style={{ fontSize: "0.58rem", fontWeight: active ? 700 : 400, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Home filter pills ─────────────────────────────────────────────────────────
function HomeFilterPills({ activeFilter, onFilterChange, accentColor, isWestern, isNeon, isStudio }) {
  return (
    <div style={{
      display: "flex", gap: "0.4rem",
      padding: "0.55rem 1.25rem",
      borderBottom: isWestern ? "1px solid #3a2a1c" : isNeon ? "1px solid #2a1845" : isStudio ? "1px solid #2d2419" : "1px solid rgba(255,255,255,0.05)",
      background: isWestern ? "rgba(26,20,16,0.6)" : isNeon ? "rgba(7,5,26,0.6)" : isStudio ? "rgba(24,18,12,0.6)" : "rgba(5,5,7,0.6)",
      flexShrink: 0,
    }}>
      {HOME_FILTERS.map(({ key, label }) => {
        const active = key === activeFilter;
        return (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            style={{
              padding: "0.28rem 0.85rem",
              borderRadius: "2rem",
              fontFamily: isWestern || isStudio ? "'Playfair Display', serif" : "Outfit, sans-serif",
              fontWeight: 600,
              fontStyle: isStudio && active ? "italic" : "normal",
              fontSize: "0.7rem",
              letterSpacing: isWestern || isStudio ? "0.01em" : "0.05em",
              textTransform: isWestern || isStudio ? "none" : "uppercase",
              color: active ? "#fff" : "rgba(255,255,255,0.42)",
              background: active ? accentColor : "rgba(255,255,255,0.05)",
              border: `1px solid ${active ? "transparent" : "rgba(255,255,255,0.08)"}`,
              cursor: "pointer",
              transition: "all 0.18s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Section Tab Nav ───────────────────────────────────────────────────────────
function SectionTabBar({ sections, accentColor, isMobile, onSelect }) {
  const [active, setActive] = useState(null);
  return (
    <div style={{
      display: "flex", gap: "0.5rem", overflowX: "auto",
      padding: isMobile ? "0.65rem 1rem" : "0.75rem 2rem",
      scrollbarWidth: "none", msOverflowStyle: "none",
      borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
    }}>
      {sections.map(({ label }) => (
        <button
          key={label}
          onClick={() => { setActive(label); onSelect(label); }}
          style={{
            flexShrink: 0,
            padding: "0.35rem 0.9rem",
            borderRadius: "2rem",
            fontFamily: "Outfit, sans-serif",
            fontWeight: 700,
            fontSize: "0.72rem",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: active === label ? "#fff" : "rgba(255,255,255,0.5)",
            background: active === label ? accentColor : "rgba(255,255,255,0.07)",
            border: `1px solid ${active === label ? "transparent" : "rgba(255,255,255,0.1)"}`,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Hero Carousel ─────────────────────────────────────────────────────────────
function ProfileHeroCarousel({ sections, accentColor, rgb, isMobile, onPlay, lastWatchedIdx, isWestern, isNeon, isStudio }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const lenRef = useRef(sections.length);
  lenRef.current = sections.length;
  const heroH = isMobile ? "clamp(220px,56vw,320px)" : "clamp(400px,50vh,560px)";

  const startAuto = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % lenRef.current), 6000);
  }, []);

  useEffect(() => { startAuto(); return () => clearInterval(timerRef.current); }, [startAuto]);

  useEffect(() => {
    if (idx >= sections.length) setIdx(0);
  }, [sections.length, idx]);

  const go = (dir) => {
    setIdx((i) => (i + dir + sections.length) % sections.length);
    startAuto();
  };

  const slide = sections[idx];
  const last = lastWatchedIdx(slide.label);
  const hasWatched = last >= 0;
  const poster = slide.items.find((m) => m.posterUrl)?.posterUrl || null;

  const headingFont = isWestern
    ? "'Playfair Display', serif"
    : isStudio
    ? "'DM Serif Display', serif"
    : "Outfit, sans-serif";

  return (
    <div
      style={{ position: "relative", width: "100%", height: heroH, overflow: "hidden", flexShrink: 0 }}
      onMouseEnter={() => clearInterval(timerRef.current)}
      onMouseLeave={startAuto}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={slide.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          style={{ position: "absolute", inset: 0 }}
        >
          {poster ? (
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${poster}')`, backgroundSize: "cover", backgroundPosition: "center top" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, rgba(${rgb},0.06) 0%, rgba(${rgb},0.28) 60%, rgba(${rgb},0.45) 100%)` }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(5,5,7,0.6) 0%, transparent 30%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,7,1) 0%, rgba(5,5,7,0.8) 25%, transparent 60%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(5,5,7,0.7) 0%, transparent 55%)" }} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: isMobile ? "1.25rem 1.25rem 1.5rem" : "2rem 3rem 2.5rem", zIndex: 2 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.4)`, borderRadius: "2rem", padding: "0.2rem 0.75rem", marginBottom: "0.8rem" }}>
          <span style={{ fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: accentColor }}>
            {slide.items.length} {slide.items.length === 1 ? "Video" : "Videos"}
          </span>
        </div>

        <h2 style={{
          fontFamily: headingFont,
          fontWeight: isWestern || isStudio ? 700 : 900,
          fontStyle: isStudio ? "italic" : "normal",
          fontSize: isMobile ? "clamp(1.5rem,6vw,2rem)" : "clamp(2rem,3.5vw,3rem)",
          color: "#fff",
          textTransform: isWestern || isStudio ? "none" : "uppercase",
          letterSpacing: isWestern || isStudio ? "-0.01em" : "0.04em",
          textShadow: isNeon
            ? "0 0 18px rgba(255,45,135,0.5), 0 0 36px rgba(0,230,255,0.2)"
            : "0 2px 24px rgba(0,0,0,0.9)",
          marginBottom: isMobile ? "0.75rem" : "0.6rem",
          lineHeight: 1.05,
        }}>
          {slide.label}
        </h2>

        {!isMobile && (
          <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.5)", marginBottom: "1.4rem", maxWidth: 440, lineHeight: 1.6, fontWeight: 500 }}>
            {hasWatched
              ? `You left off on episode ${last + 1}. Continue where you stopped.`
              : `${slide.items.length} video${slide.items.length !== 1 ? "s" : ""} ready to watch.`}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {hasWatched ? (
            <button
              onClick={() => onPlay(slide.label, last)}
              style={{ padding: isMobile ? "0.55rem 1.2rem" : "0.72rem 1.6rem", borderRadius: "0.5rem", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: isMobile ? "0.78rem" : "0.88rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: accentColor, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              ▶ Continue — Ep {last + 1}
            </button>
          ) : (
            <button
              onClick={() => onPlay(slide.label, 0)}
              style={{ padding: isMobile ? "0.55rem 1.2rem" : "0.72rem 1.6rem", borderRadius: "0.5rem", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: isMobile ? "0.78rem" : "0.88rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: accentColor, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              ▶ Watch Now
            </button>
          )}
          {!isMobile && hasWatched && (
            <button
              onClick={() => onPlay(slide.label, 0)}
              style={{ padding: "0.68rem 1.3rem", borderRadius: "0.5rem", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "rgba(255,255,255,0.78)", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", backdropFilter: "blur(8px)" }}
            >
              ↺ Start Over
            </button>
          )}
        </div>
      </div>

      {/* Arrows (desktop) */}
      {!isMobile && sections.length > 1 && (
        <>
          <button onClick={() => go(-1)} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", zIndex: 3, width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <button onClick={() => go(1)} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", zIndex: 3, width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </>
      )}

      {/* Dots */}
      {sections.length > 1 && (
        <div style={{ position: "absolute", bottom: isMobile ? "0.6rem" : "1rem", right: isMobile ? "1rem" : "3rem", zIndex: 3, display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {sections.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); startAuto(); }}
              style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 3, background: i === idx ? accentColor : "rgba(255,255,255,0.3)", border: "none", padding: 0, cursor: "pointer", transition: "all 0.3s ease" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Media Card ────────────────────────────────────────────────────────────────
function ProfileMediaCard({ item, itemIdx, lastIdx, accentColor, isMobile, inList, onToggle, onClick }) {
  const [hovered, setHovered] = useState(false);
  const cw = isMobile ? 150 : 220;
  const ch = isMobile ? 84 : 124;
  const isLast = itemIdx === lastIdx;
  const isEpisode = item.sourceType === "direct";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      style={{ flexShrink: 0, width: cw, background: "none", border: "none", padding: 0, WebkitTapHighlightColor: "transparent", cursor: "pointer", textAlign: "left", transform: hovered ? "scale(1.05)" : "scale(1)", transition: "transform 0.2s ease", zIndex: hovered ? 2 : 1, position: "relative" }}
    >
      <div style={{ position: "relative", width: cw, height: ch, borderRadius: isMobile ? "0.45rem" : "0.4rem", overflow: "hidden", outline: isLast ? `2px solid ${accentColor}` : "2px solid transparent", outlineOffset: "-2px", boxShadow: hovered ? `0 12px 40px rgba(0,0,0,0.7), 0 0 20px ${accentColor}33` : "none", transition: "box-shadow 0.2s ease" }}>
        {item.posterUrl ? (
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${item.posterUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, rgba(0,0,0,0.6) 0%, ${accentColor}33 100%)` }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(255,255,255,0.05) 0%,transparent 55%,rgba(0,0,0,0.3) 100%)" }} />

        {!isMobile && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", opacity: hovered ? 1 : 0, transition: "opacity 0.2s ease" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", paddingLeft: "0.15rem" }}>▶</div>
          </div>
        )}

        {isEpisode && (
          <div style={{ position: "absolute", top: "0.3rem", left: "0.3rem", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", borderRadius: "0.22rem", padding: "1px 5px", fontSize: "0.52rem", fontWeight: 800, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Ep {itemIdx + 1}
          </div>
        )}
        {isLast && (
          <div style={{ position: "absolute", top: "0.3rem", right: "0.3rem", background: accentColor, borderRadius: "0.22rem", padding: "1px 5px", fontSize: "0.5rem", fontWeight: 800, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>Last</div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)" }} />

        {/* Bookmark toggle */}
        {onToggle && (
          <div
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
            style={{
              position: "absolute", bottom: "0.32rem", right: "0.32rem", zIndex: 4,
              width: 24, height: 24, borderRadius: "50%",
              background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
              border: `1px solid ${inList ? accentColor : "rgba(255,255,255,0.18)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "border-color 0.15s ease",
            }}
          >
            <Bookmark
              size={11}
              fill={inList ? accentColor : "none"}
              color={inList ? accentColor : "rgba(255,255,255,0.7)"}
              strokeWidth={2}
            />
          </div>
        )}
      </div>

      <p style={{ fontFamily: "Outfit, Manrope, sans-serif", fontSize: isMobile ? "0.68rem" : "0.74rem", fontWeight: 600, color: "rgba(255,255,255,0.82)", marginTop: "0.4rem", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {item.title}
      </p>
      {item.description && (
        <p style={{ fontFamily: "Outfit, sans-serif", fontSize: isMobile ? "0.6rem" : "0.64rem", fontWeight: 500, color: "rgba(255,255,255,0.38)", marginTop: "0.2rem", lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.description}
        </p>
      )}
    </button>
  );
}

// ── Search view ───────────────────────────────────────────────────────────────
function SearchView({ media, accentColor, rgb, isMobile, isWestern, isNeon, isStudio, onPlay, myList, onToggle }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q.length >= 1
    ? media.filter((m) =>
        m.title?.toLowerCase().includes(q) ||
        m.sectionLabel?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      )
    : [];
  const px = isMobile ? "1rem" : "2rem";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: `1.25rem ${px} 0`, overflowY: "auto", scrollbarWidth: "none" }}>
      {/* Search input */}
      <div style={{ position: "relative", marginBottom: "1.25rem" }}>
        <SearchIcon size={15} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.32)", pointerEvents: "none" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, shows, clips…"
          autoFocus
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "0.72rem 2.4rem 0.72rem 2.25rem",
            borderRadius: "0.75rem",
            background: isWestern ? "rgba(255,255,255,0.05)" : isNeon ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${isWestern ? "#3a2a1c" : isNeon ? "#2a1845" : "rgba(255,255,255,0.1)"}`,
            color: "#fff",
            fontFamily: "Outfit, sans-serif",
            fontSize: "0.88rem",
            outline: "none",
          }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.38)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <XIcon size={14} />
          </button>
        )}
      </div>

      {/* States */}
      {q.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.65rem", paddingBottom: "5rem" }}>
          <SearchIcon size={42} style={{ color: "rgba(255,255,255,0.08)" }} />
          <p style={{ color: "rgba(255,255,255,0.28)", fontSize: "0.82rem", fontFamily: "Outfit, sans-serif" }}>Search episodes, clips, trailers…</p>
        </div>
      ) : results.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem", paddingBottom: "5rem" }}>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.88rem", fontFamily: "Outfit, sans-serif" }}>No results for "{query}"</p>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.28)", marginBottom: "1rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Outfit, sans-serif" }}>
            {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? "0.65rem" : "0.8rem", paddingBottom: "5.5rem" }}>
            {results.map((item) => (
              <ProfileMediaCard
                key={item.id}
                item={item}
                itemIdx={0}
                lastIdx={-1}
                accentColor={accentColor}
                isMobile={isMobile}
                inList={myList?.includes(item.id)}
                onToggle={onToggle}
                onClick={() => onPlay(item)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── My List view ─────────────────────────────────────────────────────────────
function MyListView({ media, myList, accentColor, rgb, isMobile, isWestern, isNeon, isStudio, onPlay, onToggle }) {
  const items = media.filter((m) => myList.includes(m.id));
  const px = isMobile ? "1rem" : "2rem";

  if (items.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", padding: "2rem", paddingBottom: "5rem" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.25)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bookmark size={26} style={{ color: accentColor }} strokeWidth={1.5} />
        </div>
        <p style={{ color: "#fff", fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "1rem", marginTop: "0.25rem" }}>My List</p>
        <p style={{ color: "rgba(255,255,255,0.35)", fontFamily: "Outfit, sans-serif", fontSize: "0.82rem", textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}>
          Tap the bookmark icon on any card to save it here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: `1.25rem ${px} 0` }}>
      <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.28)", marginBottom: "1rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, fontFamily: "Outfit, sans-serif" }}>
        {items.length} saved
      </p>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? "0.65rem" : "0.8rem", paddingBottom: "5.5rem" }}>
        {items.map((item) => (
          <ProfileMediaCard
            key={item.id}
            item={item}
            itemIdx={0}
            lastIdx={-1}
            accentColor={accentColor}
            isMobile={isMobile}
            inList={true}
            onToggle={onToggle}
            onClick={() => onPlay(item)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Settings view ─────────────────────────────────────────────────────────────
function SettingsView({ profile, accentColor, rgb, onExit, isMobile }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "1.5rem 1rem" : "2rem", paddingBottom: "5.5rem", scrollbarWidth: "none" }}>
      {/* Profile card */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.18)`, borderRadius: "1rem", padding: "1.1rem 1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: "1.3rem" }}>🤠</span>
        </div>
        <div>
          <p style={{ color: "#fff", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>{profile.name}</p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontFamily: "Outfit, sans-serif", fontSize: "0.72rem", marginTop: "0.1rem", textTransform: "capitalize" }}>{profile.theme || "default"} theme</p>
        </div>
      </div>

      {/* Setting rows */}
      {[
        { label: "Change PIN", note: "Coming soon", action: null },
        { label: "Report a Bug", note: "Opens feedback form", action: null },
      ].map(({ label, note }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "default" }}>
          <div>
            <p style={{ color: "#fff", fontFamily: "Outfit, sans-serif", fontWeight: 500, fontSize: "0.88rem" }}>{label}</p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "Outfit, sans-serif", fontSize: "0.7rem", marginTop: "0.1rem" }}>{note}</p>
          </div>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "1rem" }}>›</span>
        </div>
      ))}

      <button
        onClick={onExit}
        style={{ marginTop: "2rem", width: "100%", padding: "0.8rem", borderRadius: "0.75rem", background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.25)", color: "#ff6b6b", fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
      >
        Exit Profile
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileShell() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [profile, setProfile] = useState(null);
  const [media, setMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [playing, setPlaying] = useState(null);
  const [tab, setTab] = useState("home");
  const [homeFilter, setHomeFilter] = useState("all");
  const [myList, setMyList] = useState(() => getMyList(id));

  const sectionRefs = useRef({});

  useEffect(() => {
    const raw = sessionStorage.getItem(`mh_profile_${id}`);
    if (!raw) { navigate("/", { replace: true }); return; }
    setProfile(JSON.parse(raw));
  }, [id, navigate]);

  useEffect(() => {
    if (!profile) return;
    listMedia(id)
      .then(setMedia)
      .catch(() => setMedia([]))
      .finally(() => setLoadingMedia(false));
  }, [profile, id]);

  const rgb = useMemo(() => (profile ? hexToRgb(profile.color) : "255,255,255"), [profile]);

  const safeBgUrl = useMemo(() => {
    const u = profile?.backgroundUrl;
    return u && /^https?:\/\//i.test(u) ? u : null;
  }, [profile]);

  const grouped = useMemo(() => {
    if (!profile) return [];
    return profile.sections.map((label) => ({
      label,
      items: media.filter((m) => m.sectionLabel === label),
    }));
  }, [profile, media]);

  const exit = useCallback(() => {
    sessionStorage.removeItem(`mh_profile_${id}`);
    clearProfilePasscode(id);
    navigate("/");
  }, [id, navigate]);

  const { showWarning, countdown, dismiss } = useInactivityTimer({
    timeoutMs: 10 * 60 * 1000,
    warningMs: 60 * 1000,
    onLogout: exit,
  });

  const lastWatchedIdx = useCallback((label) => {
    const stored = localStorage.getItem(`mh_last_${id}_${label}`);
    return stored !== null ? parseInt(stored, 10) : -1;
  }, [id]);

  const playItem = useCallback((sectionLabel, itemIdx) => {
    const section = grouped.find((g) => g.label === sectionLabel);
    if (!section) return;
    const item = section.items[itemIdx];
    if (!item) return;
    localStorage.setItem(`mh_last_${id}_${sectionLabel}`, String(itemIdx));
    setPlaying(item);
  }, [grouped, id]);

  const handleToggleMyList = useCallback((itemId) => {
    setMyList((prev) => toggleMyListStorage(id, itemId, prev));
  }, [id]);

  const playDirect = useCallback((item) => {
    const section = grouped.find((g) => g.label === item.sectionLabel);
    if (section) {
      const idx = section.items.findIndex((m) => m.id === item.id);
      if (idx >= 0) localStorage.setItem(`mh_last_${id}_${item.sectionLabel}`, String(idx));
    }
    setPlaying(item);
  }, [grouped, id]);

  const scrollToSection = useCallback((label) => {
    sectionRefs.current[label]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (!profile) return null;

  const Icon = getIcon(profile.icon);
  const isWestern = profile.theme === "western";
  const isNeon = profile.theme === "neon";
  const isStudio = profile.theme === "studio";

  const themeBgClass = isWestern
    ? "bg-[#1a1410] bg-western-grain text-[#F5E6D3]"
    : isNeon
    ? "bg-[#07051a] bg-neon-grid text-[#f1e9ff]"
    : isStudio
    ? "bg-[#18120c] bg-studio-paper text-[#f0e5d2]"
    : "";

  const hasBg = !!safeBgUrl;
  const sectionsWithContent = grouped.filter((g) => g.items.length > 0);
  const rowPadX = isMobile ? "1rem" : "2rem";

  return (
    <div
      className={`min-h-screen flex flex-col ${themeBgClass}`}
      data-theme={profile.theme || "default"}
      data-testid="profile-shell"
      style={{
        "--p-color": profile.color,
        "--p-rgb": rgb,
        ...(hasBg && {
          backgroundImage: `linear-gradient(rgba(5,5,7,0.82) 0%, rgba(5,5,7,0.94) 100%), url(${safeBgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }),
      }}
    >
      {/* ── Top bar ── */}
      <header
        data-testid="profile-header"
        className={`flex items-center justify-between px-5 md:px-10 py-4 border-b ${
          isWestern ? "border-[#3a2a1c]" : isNeon ? "border-[#2a1845]" : isStudio ? "border-[#2d2419]" : "border-white/[0.06]"
        } z-20 relative`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            data-testid="profile-back-btn"
            onClick={exit}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-colors shrink-0"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: profile.color }}>
              <Icon className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
            </div>
            <span data-testid="profile-name-display" className="text-sm font-medium text-white/90 truncate">
              {profile.name}
            </span>
          </div>
        </div>

        <Button
          data-testid="profile-exit-btn"
          variant="ghost"
          size="sm"
          onClick={exit}
          className="text-white/50 hover:text-white hover:bg-white/[0.05] gap-1.5 px-3"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Exit</span>
        </Button>
      </header>

      {/* ── Filter pills (home tab only) ── */}
      {tab === "home" && (
        <HomeFilterPills
          activeFilter={homeFilter}
          onFilterChange={setHomeFilter}
          accentColor={profile.color}
          isWestern={isWestern}
          isNeon={isNeon}
          isStudio={isStudio}
        />
      )}

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {tab === "search" ? (
          <SearchView
            media={media}
            accentColor={profile.color}
            rgb={rgb}
            isMobile={isMobile}
            isWestern={isWestern}
            isNeon={isNeon}
            isStudio={isStudio}
            onPlay={playDirect}
            myList={myList}
            onToggle={handleToggleMyList}
          />
        ) : tab === "list" ? (
          <MyListView
            media={media}
            myList={myList}
            accentColor={profile.color}
            rgb={rgb}
            isMobile={isMobile}
            isWestern={isWestern}
            isNeon={isNeon}
            isStudio={isStudio}
            onPlay={playDirect}
            onToggle={handleToggleMyList}
          />
        ) : tab === "settings" ? (
          <SettingsView profile={profile} accentColor={profile.color} rgb={rgb} onExit={exit} isMobile={isMobile} />
        ) : loadingMedia ? (
          <p data-testid="profile-media-loading" className="text-center text-white/30 text-sm mt-16">Loading…</p>
        ) : (() => {
          const visibleGroups = homeFilter === "all"
            ? grouped
            : grouped.filter((g) => SECTION_TAB_MAP[g.label] === homeFilter);
          const visibleWithContent = visibleGroups.filter((g) => g.items.length > 0);

          if (visibleWithContent.length === 0) return (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-white/40 text-sm">No content available yet.</p>
            </div>
          );

          return (
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {/* Hero Carousel */}
            <ProfileHeroCarousel
              sections={visibleWithContent}
              accentColor={profile.color}
              rgb={rgb}
              isMobile={isMobile}
              onPlay={playItem}
              lastWatchedIdx={lastWatchedIdx}
              isWestern={isWestern}
              isNeon={isNeon}
              isStudio={isStudio}
            />

            {/* Section Tab Nav */}
            <SectionTabBar
              sections={visibleGroups}
              accentColor={profile.color}
              isMobile={isMobile}
              onSelect={scrollToSection}
            />

            {/* Content rows */}
            <div style={{ paddingBottom: "5.5rem" }}>
              {visibleGroups.map((group) => {
                const last = lastWatchedIdx(group.label);
                const hasDirectVideo = group.items.some((m) => m.sourceType === "direct");
                return (
                  <div
                    key={group.label}
                    ref={(el) => { sectionRefs.current[group.label] = el; }}
                    data-testid={`media-section-${group.label}`}
                    style={{ marginTop: isMobile ? "1.75rem" : "2.25rem" }}
                  >
                    {/* Section header */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: `0 ${rowPadX}`, marginBottom: "0.75rem", flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: isWestern ? "'Playfair Display', serif" : isStudio ? "'DM Serif Display', serif" : "Outfit, sans-serif",
                        fontWeight: isWestern || isStudio ? 700 : 800,
                        fontStyle: isStudio ? "italic" : "normal",
                        fontSize: isMobile ? "0.85rem" : "1rem",
                        color: "#fff",
                        letterSpacing: isWestern || isStudio ? "-0.01em" : "0.05em",
                        textTransform: isWestern || isStudio ? "none" : "uppercase",
                        textShadow: isNeon ? "0 0 12px rgba(255,45,135,0.4)" : "none",
                      }}>
                        {group.label}
                      </span>
                      <span style={{ marginLeft: "0.25rem", fontSize: "0.65rem", color: "rgba(255,255,255,0.28)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        {group.items.length}
                      </span>
                      {!hasDirectVideo && group.items.length > 0 && (
                        <span style={{
                          fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
                          color: profile.color,
                          background: `rgba(${rgb},0.12)`,
                          border: `1px solid rgba(${rgb},0.3)`,
                          borderRadius: "2rem", padding: "0.15rem 0.55rem",
                        }}>
                          Full Episodes Coming Soon
                        </span>
                      )}
                    </div>

                    {group.items.length === 0 ? (
                      <div style={{ padding: `0 ${rowPadX}` }}>
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: "0.5rem",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "0.6rem", padding: "0.7rem 1rem",
                        }}>
                          <span style={{ fontSize: "0.95rem" }}>🎬</span>
                          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", fontFamily: "Outfit, sans-serif", fontWeight: 500, fontStyle: "italic" }}>
                            Being uploaded soon — check back shortly.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: isMobile ? "0.55rem" : "0.75rem", overflowX: "auto", padding: `0.1rem ${rowPadX} 0.75rem`, scrollbarWidth: "none", msOverflowStyle: "none" }}>
                        {group.items.map((item, itemIdx) => (
                          <ProfileMediaCard
                            key={item.id}
                            item={item}
                            itemIdx={itemIdx}
                            lastIdx={last}
                            accentColor={profile.color}
                            isMobile={isMobile}
                            inList={myList.includes(item.id)}
                            onToggle={handleToggleMyList}
                            onClick={() => playItem(group.label, itemIdx)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}
      </main>

      {/* ── Bottom navigation ── */}
      <BottomNavBar
        activeTab={tab}
        onTabChange={setTab}
        accentColor={profile.color}
        isWestern={isWestern}
        isNeon={isNeon}
        isStudio={isStudio}
      />

      {/* ── Video player (watch-only, no edit/delete) ── */}
      <VideoPlayer
        media={playing}
        profileId={profile.id}
        accentColor={profile.color}
        onClose={() => setPlaying(null)}
      />

      {/* ── Inactivity warning ── */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            key="lock-warning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] flex items-center justify-center safe-area-override"
            style={{ backgroundColor: "rgba(5,5,7,0.88)", backdropFilter: "blur(12px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-6 px-8 py-10 rounded-3xl border border-white/[0.08] bg-[#0d0d12] max-w-sm w-full mx-4 text-center"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: profile.color }}>
                {(() => { const I = getIcon(profile.icon); return <I className="w-7 h-7 text-white" strokeWidth={1.75} />; })()}
              </div>

              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke={profile.color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - countdown / 60)}`} style={{ transition: "stroke-dashoffset 1s linear" }} />
                </svg>
                <span className="text-2xl font-mono font-semibold text-white tabular-nums">{countdown}</span>
              </div>

              <div className="space-y-1.5">
                <p className="text-lg font-medium text-white">Still watching?</p>
                <p className="text-sm text-white/50">{profile.name} will be locked due to inactivity.</p>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <button type="button" onClick={dismiss} className="w-full py-3 rounded-xl font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: profile.color }}>
                  Stay logged in
                </button>
                <button type="button" onClick={exit} className="w-full py-3 rounded-xl text-sm text-white/50 hover:text-white transition-colors">
                  Log out now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
