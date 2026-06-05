import { motion } from "framer-motion";
import { Youtube, Video, Link2, MoreHorizontal } from "lucide-react";
import { hexToRgb } from "@/lib/registry";

const detectEmbedKind = (url) => {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  return "embed";
};

const SourceBadge = ({ media, color, withPoster }) => {
  const isDirect = media.sourceType === "direct";
  const kind = detectEmbedKind(media.sourceUrl);

  let Icon = Link2;
  let label = "Embed";
  if (isDirect) {
    Icon = Video;
    label = "Direct";
  } else if (kind === "youtube") {
    Icon = Youtube;
    label = "YouTube";
  } else if (kind === "vimeo") {
    Icon = Video;
    label = "Vimeo";
  }

  return (
    <span
      data-testid={`media-source-badge-${media.id}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.15em] font-medium border ${
        withPoster
          ? "bg-black/55 backdrop-blur-md border-white/20 text-white"
          : "bg-white/[0.06] border-white/[0.08] text-white/70"
      }`}
      style={withPoster ? undefined : { color }}
    >
      <Icon className="w-3 h-3" strokeWidth={2} />
      <span>{label}</span>
    </span>
  );
};

export default function MediaCard({ media, accentColor, index = 0, onClick }) {
  const rgb = hexToRgb(accentColor);
  const hasPoster = !!media.posterUrl;

  return (
    <motion.button
      type="button"
      data-testid={`media-card-${media.id}`}
      onClick={() => onClick?.(media)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25) }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      style={{ "--p-color": accentColor, "--p-rgb": rgb }}
      className="group relative flex flex-col w-full text-left rounded-2xl overflow-hidden
                 bg-[#101015] border border-white/[0.06]
                 transition-[border-color,box-shadow] duration-300
                 hover:border-[var(--p-color)]
                 hover:shadow-[0_18px_40px_-20px_rgba(var(--p-rgb),0.55)]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-color)]"
    >
      {/* Visual band — poster image if available, otherwise color wash */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0a0a0d]">
        {hasPoster ? (
          <>
            <img
              data-testid={`media-poster-${media.id}`}
              src={media.posterUrl}
              alt=""
              loading="lazy"
              draggable={false}
              onError={(e) => {
                // Hide the broken image so the underlying dark wash shows
                e.currentTarget.style.display = "none";
              }}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            {/* Bottom-up darken gradient so the title sits cleanly */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 55%, rgba(15,15,18,0.92) 100%)",
              }}
            />
            {/* Subtle accent-color vignette on hover */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-opacity duration-500"
              style={{
                background: `radial-gradient(circle at 30% 20%, rgba(var(--p-rgb),0.32), transparent 65%)`,
              }}
            />
          </>
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, rgba(var(--p-rgb),0.18) 0%, rgba(var(--p-rgb),0.04) 60%, transparent 100%), #0a0a0d`,
            }}
          >
            <div
              className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500"
              style={{
                background: `radial-gradient(circle at 30% 20%, rgba(var(--p-rgb),0.35), transparent 55%)`,
              }}
            />
          </div>
        )}

        <div className="absolute top-3 left-3">
          <SourceBadge media={media} color={accentColor} withPoster={hasPoster} />
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="w-8 h-8 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white/75 group-hover:text-white border border-white/15 transition-colors">
            <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-1.5 min-h-[88px]">
        <h3
          data-testid={`media-title-${media.id}`}
          className="text-[15px] font-medium text-white/90 leading-snug line-clamp-2 group-hover:text-white transition-colors"
        >
          {media.title}
        </h3>
        {media.description && (
          <p className="text-xs text-white/45 leading-relaxed line-clamp-2">
            {media.description}
          </p>
        )}
      </div>
    </motion.button>
  );
}
