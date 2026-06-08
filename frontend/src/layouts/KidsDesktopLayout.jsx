import { LogOut, Timer } from "lucide-react";
import { DEFAULT_TABS } from "./KidsLayout";

export default function KidsDesktopLayout({
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
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#08080F",
        fontFamily: "'Nunito', Arial, sans-serif",
      }}
    >
      {/* ── Sticky top navbar ── */}
      <header
        style={{
          flexShrink: 0,
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 2rem",
          gap: "2rem",
          background: "rgba(6,6,14,0.92)",
          backdropFilter: "blur(20px) saturate(1.8)",
          WebkitBackdropFilter: "blur(20px) saturate(1.8)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Logo + profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexShrink: 0 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#FF5200,#C030B0,#1E80D8,#0090E8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem",
              flexShrink: 0,
            }}
          >
            🎬
          </div>
          <div>
            <p style={{ fontFamily: "Outfit,sans-serif", fontWeight: 900, fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", lineHeight: 1, marginBottom: 2 }}>
              MediaHub
            </p>
            <p style={{ fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: "0.85rem", color: "#fff", lineHeight: 1, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profileName}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

        {/* Nav items */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.15rem", flex: 1 }}>
          {tabs.map(({ key, Icon, label }) => {
            const active = key === activeTab;
            return (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.45rem 0.9rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  fontFamily: "Outfit,sans-serif",
                  fontWeight: active ? 800 : 600,
                  fontSize: "0.82rem",
                  letterSpacing: "0.03em",
                  transition: "background 0.18s ease, color 0.18s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.6} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Right: timer + exit */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          {onTimerClick && (
            <button
              onClick={onTimerClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "9999px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: intervalMins > 0 ? "rgba(255,215,0,0.1)" : "transparent",
                color: intervalMins > 0 ? "rgba(255,215,0,0.85)" : "rgba(255,255,255,0.38)",
                cursor: "pointer",
                fontFamily: "Outfit,sans-serif",
                fontWeight: 700,
                fontSize: "0.75rem",
                letterSpacing: "0.04em",
              }}
            >
              <Timer size={14} strokeWidth={1.6} />
              {intervalMins > 0 ? `${intervalMins}m` : "OFF"}
            </button>
          )}
          <button
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "9999px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(255,255,255,0.35)",
              cursor: "pointer",
              fontFamily: "Outfit,sans-serif",
              fontWeight: 600,
              fontSize: "0.75rem",
            }}
          >
            <LogOut size={14} strokeWidth={1.6} />
            Exit
          </button>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent",
        }}
      >
        {children}
      </main>
    </div>
  );
}
