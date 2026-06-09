import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { parseSource } from "@/lib/embed";

export default function KidsVideoPlayer({
  playlist,
  startIdx = 0,
  accentColor = "#FF6B00",
  profileId,
  sectionLabel,
  onClose,
  checkinOpen,
}) {
  const [idx, setIdx] = useState(startIdx);
  const [videoError, setVideoError] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const videoRef = useRef(null);
  const media = playlist[idx];
  const source = media ? parseSource(media) : null;

  // Keep a stable ref to onClose so the keydown effect doesn't re-register
  // on every render when the parent passes a new arrow function.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Persist last-watched index
  useEffect(() => {
    if (sectionLabel && profileId) {
      localStorage.setItem(`mh_last_${profileId}_${sectionLabel}`, String(idx));
    }
  }, [idx, profileId, sectionLabel]);

  // Reset video error state when switching tracks
  useEffect(() => {
    setVideoError(false);
    setVideoKey((k) => k + 1);
  }, [idx]);

  // Pause/resume when check-in fires
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (checkinOpen) vid.pause();
    else if (!vid.ended) vid.play().catch(() => {});
  }, [checkinOpen]);

  // Escape key to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCloseRef.current?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (idx < playlist.length - 1) setIdx(idx + 1);
    else onClose?.();
  };
  const handleEnded = () => goNext();

  const handleVideoError = () => setVideoError(true);
  const handleRetry = () => {
    setVideoError(false);
    setVideoKey((k) => k + 1);
  };

  if (!media || !source) return null;
  const isIframe = source.kind !== "direct";

  return (
    <AnimatePresence>
      <motion.div
        key="kids-player"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onContextMenu={(e) => e.preventDefault()}
        className="fixed inset-0 z-40 flex flex-col"
        style={{ background: "#050507" }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.3em] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
              {media.sectionLabel} · {idx + 1} / {playlist.length}
            </p>
            <h2
              className="text-sm font-semibold text-white truncate"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {media.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-3 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white shrink-0"
            style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        {/* Video surface */}
        <div className="flex-1 flex items-center justify-center px-2 py-4 relative">
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden"
            style={{
              boxShadow: `0 20px 60px -20px rgba(0,0,0,0.9), 0 0 40px -10px ${accentColor}55`,
            }}
          >
            {isIframe ? (
              <iframe
                src={source.src}
                title={media.title}
                sandbox="allow-scripts allow-same-origin allow-presentation"
                referrerPolicy="strict-origin"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                className="w-full h-full border-0 bg-black"
              />
            ) : (
              <>
                <video
                  key={videoKey}
                  ref={videoRef}
                  src={source.src}
                  poster={media.posterUrl || undefined}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  controlsList="nodownload noremoteplayback noplaybackrate"
                  disablePictureInPicture
                  onEnded={handleEnded}
                  onError={handleVideoError}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-contain bg-black"
                />
                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-3">
                    <p className="text-white/50 text-sm">Failed to load video</p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="text-xs text-white/40 hover:text-white underline transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </>
            )}
            {isIframe && (
              <>
                <div className="absolute top-0 left-0 right-0 h-12 pointer-events-auto" aria-hidden
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} />
                <div className="absolute bottom-0 right-0 w-32 h-12 pointer-events-auto" aria-hidden
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} />
              </>
            )}
          </motion.div>
        </div>

        {/* Prev / Next nav */}
        <div className="flex items-center justify-center gap-4 pb-4 shrink-0">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-25"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
              fontFamily: "Nunito, Arial, sans-serif",
            }}
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button
            onClick={goNext}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
            style={{
              background: accentColor,
              color: "#fff",
              fontFamily: "Nunito, Arial, sans-serif",
            }}
          >
            {idx < playlist.length - 1 ? "Next" : "Done"} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
