import { useCallback, useRef, useState } from "react";

export function useCheckinTimer({ profileId, onCheckin }) {
  const [intervalMins, setIntervalMinsState] = useState(() => {
    const stored = localStorage.getItem(`mh_checkin_${profileId}`);
    return stored ? parseInt(stored, 10) : 0;
  });
  const timerRef = useRef(null);

  const clearCheckin = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const scheduleCheckin = useCallback(
    (mins) => {
      clearCheckin();
      if (mins > 0) {
        timerRef.current = setTimeout(onCheckin, mins * 60 * 1000);
      }
    },
    [clearCheckin, onCheckin],
  );

  const setIntervalMins = useCallback(
    (mins) => {
      setIntervalMinsState(mins);
      localStorage.setItem(`mh_checkin_${profileId}`, String(mins));
      scheduleCheckin(mins);
    },
    [profileId, scheduleCheckin],
  );

  return { intervalMins, setIntervalMins, scheduleCheckin, clearCheckin };
}
