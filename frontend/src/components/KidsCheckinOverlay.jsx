import { useEffect, useRef, useState } from "react";

const HOLD_MS = 2000;

export default function KidsCheckinOverlay({ open, onDismiss }) {
  const [fillPct, setFillPct] = useState(0);
  const holdStart = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!open) {
      cancelAnimationFrame(rafRef.current);
      setFillPct(0);
      holdStart.current = null;
    }
  }, [open]);

  const startHold = (e) => {
    e.preventDefault();
    holdStart.current = Date.now();
    const tick = () => {
      const pct = Math.min(((Date.now() - holdStart.current) / HOLD_MS) * 100, 100);
      setFillPct(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onDismiss?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopHold = () => {
    cancelAnimationFrame(rafRef.current);
    holdStart.current = null;
    setFillPct(0);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
      style={{ background: "rgba(5,5,8,0.97)", backdropFilter: "blur(12px)" }}
    >
      <div style={{ fontSize: "5rem", marginBottom: "1.5rem" }}>👋</div>
      <h1
        style={{
          fontFamily: "'Nunito', Arial, sans-serif",
          fontWeight: 900,
          fontSize: "clamp(1.4rem, 6vw, 2rem)",
          letterSpacing: "0.15em",
          color: "#fff",
          marginBottom: "0.5rem",
          textAlign: "center",
        }}
      >
        TIME TO CHECK IN!
      </h1>
      <p
        style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: "0.85rem",
          letterSpacing: "0.2em",
          marginBottom: "3rem",
          fontFamily: "'Nunito', Arial, sans-serif",
          fontWeight: 700,
        }}
      >
        Go find a grown-up!
      </p>
      <button
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "1rem",
          border: "2px solid rgba(255,215,0,0.35)",
          padding: "1.2rem 2rem",
          minWidth: "260px",
          background: "rgba(255,215,0,0.07)",
          color: "#fff",
          fontFamily: "'Nunito', Arial, sans-serif",
          fontWeight: 900,
          fontSize: "0.78rem",
          letterSpacing: "0.18em",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,215,0,0.28)",
            transformOrigin: "left",
            transform: `scaleX(${fillPct / 100})`,
            transition: "none",
          }}
        />
        <span style={{ position: "relative", zIndex: 1 }}>PARENTS — HOLD TO CONTINUE</span>
      </button>
    </div>
  );
}
