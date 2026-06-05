import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete } from "lucide-react";
import { hexToRgb } from "@/lib/registry";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export default function Keypad({
  accentColor = "#FFFFFF",
  onSubmit,
  errorKey = 0,
  testIdPrefix = "keypad",
}) {
  const [digits, setDigits] = useState("");
  const [shaking, setShaking] = useState(false);
  const submittedRef = useRef(false);
  const rgb = hexToRgb(accentColor);

  const reset = useCallback(() => {
    setDigits("");
    submittedRef.current = false;
  }, []);

  // Trigger shake when parent reports an error
  useEffect(() => {
    if (errorKey > 0) {
      setShaking(true);
      const t = setTimeout(() => {
        setShaking(false);
        reset();
      }, 450);
      return () => clearTimeout(t);
    }
  }, [errorKey, reset]);

  const push = useCallback(
    (d) => {
      setDigits((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + d;
        if (next.length === 4 && !submittedRef.current) {
          submittedRef.current = true;
          // submit on next tick so UI updates first
          setTimeout(() => onSubmit?.(next), 120);
        }
        return next;
      });
    },
    [onSubmit]
  );

  const backspace = useCallback(() => {
    submittedRef.current = false;
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (/^[0-9]$/.test(e.key)) push(e.key);
      else if (e.key === "Backspace") backspace();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [push, backspace]);

  return (
    <div
      style={{ "--p-color": accentColor, "--p-rgb": rgb }}
      className="flex flex-col items-center"
    >
      {/* Dots */}
      <motion.div
        data-testid={`${testIdPrefix}-dots`}
        animate={shaking ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className="flex space-x-4 mb-10"
      >
        {[0, 1, 2, 3].map((i) => {
          const filled = i < digits.length;
          return (
            <div
              key={i}
              data-testid={`${testIdPrefix}-dot-${i}`}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                shaking
                  ? "bg-red-500 border-red-500"
                  : filled
                  ? "border-[var(--p-color)] bg-[var(--p-color)] shadow-[0_0_18px_rgba(var(--p-rgb),0.6)]"
                  : "border-white/15 bg-transparent"
              }`}
            />
          );
        })}
      </motion.div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <AnimatePresence>
          {KEYS.map((k, idx) => {
            if (k === "")
              return <div key={`empty-${idx}`} className="w-16 h-16 md:w-20 md:h-20" />;
            if (k === "back")
              return (
                <motion.button
                  key="back"
                  type="button"
                  data-testid={`${testIdPrefix}-btn-back`}
                  onClick={backspace}
                  whileTap={{ scale: 0.92 }}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center
                             text-white/50 hover:text-white/90 bg-white/[0.03] border border-white/[0.06]
                             hover:bg-white/[0.07] hover:border-white/15 transition-colors duration-200"
                  aria-label="Backspace"
                >
                  <Delete className="w-5 h-5" strokeWidth={1.5} />
                </motion.button>
              );
            return (
              <motion.button
                key={k}
                type="button"
                data-testid={`${testIdPrefix}-btn-${k}`}
                onClick={() => push(k)}
                whileTap={{ scale: 0.92 }}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center
                           text-2xl font-light text-white/85
                           bg-white/[0.03] border border-white/[0.06]
                           hover:bg-white/[0.07] hover:border-white/15 hover:text-white
                           transition-colors duration-200"
              >
                {k}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
