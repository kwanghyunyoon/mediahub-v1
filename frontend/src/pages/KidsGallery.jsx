import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const LANDSCAPE = [
  "https://wallpapercat.com/w/full/7/9/9/949458-1920x1080-desktop-full-hd-mcqueen-cars-wallpaper-image.jpg",
  "https://wallpapercat.com/w/full/2/f/2/949443-1920x1080-desktop-1080p-mcqueen-cars-background-photo.jpg",
  "https://wallpapercat.com/w/full/e/c/e/949509-1946x1366-desktop-hd-mcqueen-cars-wallpaper-image.jpg",
  "https://wallpapercat.com/w/full/9/a/c/949506-3840x2160-desktop-4k-mcqueen-cars-wallpaper-photo.jpg",
  "https://wallpapercat.com/w/full/d/1/c/949637-3840x2160-desktop-4k-mcqueen-cars-background.jpg",
  "https://wallpapercat.com/w/full/1/8/e/949449-1920x1080-desktop-1080p-mcqueen-cars-wallpaper-image.jpg",
  "https://wallpapercat.com/w/full/c/4/a/949486-2000x1333-desktop-hd-mcqueen-cars-background-photo.jpg",
  "https://wallpapercat.com/w/full/4/a/5/949608-1920x1200-desktop-hd-mcqueen-cars-wallpaper-photo.jpg",
  "https://wallpapercat.com/w/full/f/9/f/949446-2560x1600-desktop-hd-mcqueen-cars-background.jpg",
  "https://wallpapercat.com/w/full/7/f/4/949639-1920x1236-desktop-hd-mcqueen-cars-wallpaper-photo.jpg",
  "https://wallpapercat.com/w/full/d/c/d/949453-2560x1600-desktop-hd-mcqueen-cars-background-photo.jpg",
  "https://wallpapercat.com/w/full/8/7/c/949640-1920x1241-desktop-hd-mcqueen-cars-wallpaper-photo.jpg",
  "https://wallpapercat.com/w/full/0/6/c/949557-3000x1688-desktop-hd-mcqueen-cars-wallpaper.jpg",
  "https://wallpapercat.com/w/full/e/d/a/949635-3840x2160-desktop-4k-mcqueen-cars-wallpaper-image.jpg",
  "https://wallpapercat.com/w/full/0/d/e/949622-1920x1200-desktop-hd-mcqueen-cars-background-photo.jpg",
];

const PORTRAIT = [
  "https://wallpapercat.com/w/full/c/b/5/949522-1536x2733-samsung-hd-mcqueen-cars-background.jpg",
  "https://wallpapercat.com/w/full/3/b/e/949444-1536x2733-mobile-hd-mcqueen-cars-background-photo.jpg",
  "https://wallpapercat.com/w/full/5/4/f/949535-2160x3840-samsung-4k-mcqueen-cars-background-image.jpg",
  "https://wallpapercat.com/w/full/e/d/c/949596-1536x2732-samsung-hd-mcqueen-cars-wallpaper-image.jpg",
  "https://wallpapercat.com/w/full/d/f/e/949543-1536x2732-mobile-hd-mcqueen-cars-background-photo.jpg",
  "https://wallpapercat.com/w/full/7/c/9/949599-1536x2732-mobile-hd-mcqueen-cars-background-photo.jpg",
  "https://wallpapercat.com/w/full/4/8/7/949560-1242x1920-mobile-hd-mcqueen-cars-wallpaper.jpg",
  "https://wallpapercat.com/w/full/7/6/2/949536-2160x3840-iphone-4k-mcqueen-cars-wallpaper-image.jpg",
  "https://wallpapercat.com/w/full/5/2/b/949601-1276x2270-samsung-hd-mcqueen-cars-background.jpg",
  "https://wallpapercat.com/w/full/4/3/e/949539-2160x3840-phone-4k-mcqueen-cars-background.jpg",
  "https://wallpapercat.com/w/full/5/d/c/949466-1536x2733-iphone-hd-mcqueen-cars-background-photo.jpg",
  "https://wallpapercat.com/w/full/7/f/8/949611-1276x2270-phone-hd-mcqueen-cars-background-photo.jpg",
  "https://wallpapercat.com/w/full/d/2/e/949534-1440x2560-iphone-hd-mcqueen-cars-background.jpg",
  "https://wallpapercat.com/w/full/a/a/1/949580-2160x3840-mobile-4k-mcqueen-cars-wallpaper.jpg",
];

function isPortraitMode() {
  return window.matchMedia("(orientation: portrait)").matches;
}

export default function KidsGallery() {
  const [portrait, setPortrait] = useState(isPortraitMode);
  const [lightboxIdx, setLightboxIdx] = useState(null); // null = closed

  const images = portrait ? PORTRAIT : LANDSCAPE;
  const aspectClass = portrait ? "aspect-[9/16]" : "aspect-video";

  // Orientation listener
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const handler = (e) => {
      setPortrait(e.matches);
      setLightboxIdx(null);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const openLightbox = (i) => setLightboxIdx(i);
  const closeLightbox = () => setLightboxIdx(null);

  const goPrev = useCallback(() => {
    setLightboxIdx((i) => (i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setLightboxIdx((i) => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  // Keyboard nav
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, goPrev, goNext]);

  // Swipe in lightbox
  const touchStartX = useRef(null);
  const onLbTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onLbTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ fontFamily: "'Nunito', Arial, sans-serif" }}>
      {/* Orientation hint */}
      <p
        className="text-center text-[10px] uppercase tracking-widest py-2"
        style={{ color: "rgba(255,255,255,0.2)", fontWeight: 800 }}
      >
        {portrait ? "📱 Portrait" : "🖥 Landscape"} · Rotate for other set
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-1.5 px-1.5 pb-4">
        {images.map((src, i) => (
          <button
            key={src}
            onClick={() => openLightbox(i)}
            className={`${aspectClass} w-full overflow-hidden rounded-xl`}
            style={{
              padding: 0,
              border: "none",
              background: "rgba(255,255,255,0.04)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              display: "block",
            }}
          >
            <img
              src={src}
              alt={`Cars wallpaper ${i + 1}`}
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transition: "opacity 0.3s ease",
              }}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.95)" }}
            onTouchStart={onLbTouchStart}
            onTouchEnd={onLbTouchEnd}
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", zIndex: 10 }}
              aria-label="Close"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>

            {/* Counter */}
            <p
              className="absolute top-4 left-4 text-[11px] font-black tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {lightboxIdx + 1} / {images.length}
            </p>

            {/* Image */}
            <motion.img
              key={lightboxIdx}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22 }}
              src={images[lightboxIdx]}
              alt={`Cars wallpaper ${lightboxIdx + 1}`}
              style={{
                maxWidth: "92vw",
                maxHeight: "82dvh",
                objectFit: "contain",
                borderRadius: "0.75rem",
                boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
              }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />

            {/* Prev / Next */}
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
