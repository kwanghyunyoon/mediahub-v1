import { useCallback, useEffect, useRef, useState } from "react";

const PRESETS = [15, 30, 45, 60];
const DEFAULT_PRESET = 30;
const WARNING_THRESHOLD = 60;

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

export default function KidsTimer({ checkinOpen }) {
  const [totalSec, setTotalSec] = useState(DEFAULT_PRESET * 60);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_PRESET * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(DEFAULT_PRESET);

  const intervalRef = useRef(null);
  const startedAtRef = useRef(null);
  const startedLeftRef = useRef(0);
  const audioCtxRef = useRef(null);
  const wasRunningRef = useRef(false);

  const pct = totalSec > 0 ? (secondsLeft / totalSec) * 100 : 100;
  const warning = secondsLeft <= WARNING_THRESHOLD && secondsLeft > 0 && running;

  // Pause / resume when checkin overlay fires
  useEffect(() => {
    if (checkinOpen && running) {
      wasRunningRef.current = true;
      pauseTimer();
    } else if (!checkinOpen && wasRunningRef.current && !running && !done) {
      wasRunningRef.current = false;
      startTimer();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { clearInterval(intervalRef.current); };
  }, []);

  const playAlarm = useCallback(() => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtxRef.current = audioCtxRef.current || new AC();
      const ctx = audioCtxRef.current;
      const scheduleHonks = () => {
        const honk = (delay, freq, dur) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.6, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + dur);
        };
        honk(0, 440, 0.25);
        honk(0.35, 540, 0.25);
        honk(0.70, 640, 0.40);
      };
      if (ctx.state === "suspended") ctx.resume().then(scheduleHonks);
      else scheduleHonks();
    } catch {}
  }, []);

  const tick = useCallback(() => {
    if (!startedAtRef.current) return;
    const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const next = Math.max(0, startedLeftRef.current - elapsed);
    setSecondsLeft((prev) => {
      if (next === prev) return prev;
      return next;
    });
    if (next <= 0) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRunning(false);
      setDone(true);
      playAlarm();
    }
  }, [playAlarm]);

  const startTimer = useCallback(() => {
    setSecondsLeft((cur) => {
      if (cur <= 0) return cur;
      startedAtRef.current = Date.now();
      startedLeftRef.current = cur;
      intervalRef.current = setInterval(tick, 400);
      setRunning(true);
      setDone(false);
      return cur;
    });
  }, [tick]);

  const pauseTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    startedAtRef.current = null;
    setRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    startedAtRef.current = null;
    wasRunningRef.current = false;
    setRunning(false);
    setDone(false);
    setSecondsLeft(totalSec);
  }, [totalSec]);

  const toggleTimer = useCallback(() => {
    if (done) { resetTimer(); return; }
    if (running) pauseTimer();
    else startTimer();
  }, [done, running, pauseTimer, startTimer, resetTimer]);

  const selectPreset = (mins) => {
    if (running) return;
    setSelectedPreset(mins);
    const s = mins * 60;
    setTotalSec(s);
    setSecondsLeft(s);
    setDone(false);
  };

  // Prime AudioContext on first touch
  const primeAudio = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtxRef.current = audioCtxRef.current || new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
    } catch {}
  };

  const carEmoji = done ? "🏆" : running ? "🏎️" : "🚗";

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-5 py-4 select-none overflow-hidden"
      onTouchStart={primeAudio}
      style={{ fontFamily: "'Nunito', Arial, sans-serif" }}
    >
      {/* Car */}
      <div
        style={{
          fontSize: "clamp(3.5rem, 14vw, 6rem)",
          marginBottom: "0.5rem",
          animation: done
            ? "carCelebrate 0.5s ease-in-out infinite alternate"
            : running
            ? "carRace 0.15s ease-in-out infinite alternate"
            : "carIdle 2s ease-in-out infinite",
        }}
      >
        {carEmoji}
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "min(100%, 340px)",
          height: 8,
          borderRadius: 4,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 4,
            background: done
              ? "#FFD700"
              : warning
              ? "linear-gradient(90deg,#FF4500,#FF6B00)"
              : "linear-gradient(90deg,#FF5200,#FF9800)",
            transition: "width 0.4s linear, background 0.5s ease",
          }}
        />
      </div>

      {/* Clock */}
      <div
        style={{
          fontFamily: "Outfit, sans-serif",
          fontWeight: 800,
          fontSize: "clamp(3.5rem, 18vw, 7rem)",
          letterSpacing: "-0.04em",
          color: done ? "#FFD700" : warning ? "#FF6B00" : "#fff",
          lineHeight: 1,
          marginBottom: "0.5rem",
          animation: warning ? "pulse 0.8s ease-in-out infinite" : done ? "pulseGold 1s ease-in-out infinite" : "none",
        }}
      >
        {fmt(secondsLeft)}
      </div>

      {done && (
        <p
          style={{
            fontSize: "1.1rem",
            fontWeight: 900,
            letterSpacing: "0.2em",
            color: "#FFD700",
            marginBottom: "1rem",
          }}
        >
          TIME'S UP! 🎉
        </p>
      )}

      {/* Preset buttons */}
      <div className="flex gap-2 mb-5 mt-1 flex-wrap justify-center">
        {PRESETS.map((mins) => (
          <button
            key={mins}
            onClick={() => selectPreset(mins)}
            disabled={running}
            style={{
              padding: "0.5rem 1.1rem",
              borderRadius: "2rem",
              fontWeight: 900,
              fontSize: "0.8rem",
              letterSpacing: "0.12em",
              border: selectedPreset === mins ? "2px solid #FF5200" : "1px solid rgba(255,255,255,0.15)",
              background: selectedPreset === mins ? "rgba(255,82,0,0.18)" : "rgba(255,255,255,0.05)",
              color: selectedPreset === mins ? "#FF8040" : running ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)",
              cursor: running ? "not-allowed" : "pointer",
              WebkitTapHighlightColor: "transparent",
              transition: "all 0.2s ease",
            }}
          >
            {mins} MIN
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-center">
        <button
          onClick={resetTimer}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "1rem",
            fontWeight: 900,
            fontSize: "0.78rem",
            letterSpacing: "0.18em",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.55)",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          RESET
        </button>
        <button
          onClick={toggleTimer}
          style={{
            padding: "0.9rem 2.2rem",
            borderRadius: "1rem",
            fontWeight: 900,
            fontSize: "0.9rem",
            letterSpacing: "0.15em",
            border: "none",
            background: done
              ? "linear-gradient(135deg,#FFD700,#FF9800)"
              : running
              ? "rgba(255,255,255,0.12)"
              : "linear-gradient(135deg,#FF5200,#FF8000)",
            color: "#fff",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            boxShadow: running ? "none" : "0 4px 24px -6px rgba(255,82,0,0.55)",
          }}
        >
          {done ? "AGAIN ⚡" : running ? "PAUSE ⏸" : secondsLeft < totalSec ? "RESUME ⚡" : "START ⚡"}
        </button>
      </div>

      <style>{`
        @keyframes carIdle {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes carRace {
          0% { transform: translateY(-3px) rotate(-2deg); }
          100% { transform: translateY(3px) rotate(2deg); }
        }
        @keyframes carCelebrate {
          0% { transform: scale(1) rotate(-8deg); }
          100% { transform: scale(1.12) rotate(8deg); }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes pulseGold {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}
