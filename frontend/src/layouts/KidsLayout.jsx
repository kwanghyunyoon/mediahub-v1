import { Home, Search, Bookmark, Settings } from "lucide-react";
import { LogOut } from "lucide-react";

export const DEFAULT_TABS = [
  { key: "home",     Icon: Home,     label: "Home"     },
  { key: "search",   Icon: Search,   label: "Search"   },
  { key: "list",     Icon: Bookmark, label: "My List"  },
  { key: "settings", Icon: Settings, label: "Settings" },
];

export default function KidsLayout({
  profileName,
  intervalMins = 0,
  onTimerClick,
  onLogout,
  tabs = DEFAULT_TABS,
  activeTab,
  onTabChange,
  children,
}) {
  return (
    <>
      {/* ── Main shell ── */}
      <div
        className="fixed inset-0 flex flex-col"
        style={{ background: "#070707", fontFamily: "'Nunito', Arial, sans-serif" }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span
            className="text-sm font-black tracking-widest uppercase text-white/80"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {profileName}
          </span>
          <div className="flex items-center gap-2">
            {onTimerClick && (
              <button
                onClick={onTimerClick}
                className="px-3 py-1.5 rounded-full text-xs font-black tracking-widest"
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: intervalMins > 0 ? "rgba(255,215,0,0.12)" : "transparent",
                  color: intervalMins > 0 ? "rgba(255,215,0,0.9)" : "rgba(255,255,255,0.4)",
                }}
              >
                ⏰ {intervalMins > 0 ? `${intervalMins}m` : "OFF"}
              </button>
            )}
            <button
              onClick={onLogout}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)" }}
              aria-label="Exit"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {children}
        </div>

        {/* Spacer so content isn't hidden behind floating nav */}
        <div style={{ height: 84, flexShrink: 0 }} />
      </div>

      {/* ── Floating pill nav ── */}
      <nav
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "6px 8px",
          borderRadius: 9999,
          background: "rgba(10, 10, 16, 0.82)",
          backdropFilter: "blur(24px) saturate(1.8)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.75), 0 6px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          width: "max-content",
          maxWidth: "calc(100vw - 32px)",
        }}
      >
        {tabs.map(({ key, Icon, label }) => {
          const active = key === activeTab;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                padding: "8px 18px",
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                background: active ? "rgba(255,255,255,0.11)" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.38)",
                transition: "background 0.2s ease, color 0.2s ease",
                outline: "none",
                boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
              }}
              aria-label={label}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.2 : 1.6}
                style={{ transition: "stroke-width 0.2s ease" }}
              />
              <span
                style={{
                  fontSize: "0.5rem",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
