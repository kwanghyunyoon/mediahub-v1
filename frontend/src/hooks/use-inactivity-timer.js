import { useCallback, useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];

/**
 * Fires onLogout after `timeoutMs` of inactivity.
 * Shows a warning overlay `warningMs` before logout so the user can dismiss it.
 * Any activity resets the full timer.
 */
export function useInactivityTimer({ timeoutMs, warningMs = 60_000, onLogout }) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(Math.round(warningMs / 1000));

  const timers = useRef({ warning: null, logout: null, tick: null });
  const onLogoutRef = useRef(onLogout);
  useEffect(() => { onLogoutRef.current = onLogout; }, [onLogout]);

  const clearAll = useCallback(() => {
    clearTimeout(timers.current.warning);
    clearTimeout(timers.current.logout);
    clearInterval(timers.current.tick);
  }, []);

  const reset = useCallback(() => {
    clearAll();
    setShowWarning(false);

    timers.current.warning = setTimeout(() => {
      setShowWarning(true);
      setCountdown(Math.round(warningMs / 1000));

      timers.current.tick = setInterval(() => {
        setCountdown((c) => Math.max(0, c - 1));
      }, 1000);

      timers.current.logout = setTimeout(() => {
        onLogoutRef.current();
      }, warningMs);
    }, timeoutMs - warningMs);
  }, [clearAll, timeoutMs, warningMs]);

  const resetRef = useRef(reset);
  useEffect(() => { resetRef.current = reset; }, [reset]);

  useEffect(() => {
    reset();
    return clearAll;
  }, [reset, clearAll]);

  useEffect(() => {
    const handler = () => resetRef.current();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handler));
  }, []);

  return { showWarning, countdown, dismiss: reset };
}
