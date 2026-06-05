import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Trash2, Video, Youtube, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseSource } from "@/lib/embed";
import { deleteMedia } from "@/lib/api";
import { hexToRgb } from "@/lib/registry";

const SOURCE_META = {
  direct: { Icon: Video, label: "Direct" },
  youtube: { Icon: Youtube, label: "YouTube" },
  vimeo: { Icon: Video, label: "Vimeo" },
  embed: { Icon: Link2, label: "Embed" },
};

/**
 * VideoPlayer — fullscreen in-app overlay.
 *
 * Critical: NO external navigation is permitted. We achieve this with two layers:
 *   1) Technical: the iframe is rendered with `sandbox="allow-scripts allow-same-origin
 *      allow-presentation"`. The absence of `allow-popups` and `allow-top-navigation`
 *      means the browser blocks any attempt by the embedded site (e.g. "Watch on
 *      YouTube") to open a new tab or redirect the parent window.
 *   2) Visual: corner shields cover the spots where YouTube / Vimeo render their
 *      branding & "watch externally" affordances, so they cannot be clicked at all.
 * Right-click context menu is suppressed across the entire overlay to block "Copy
 * video URL" exits as well.
 */
export default function VideoPlayer({
  media,
  profileId,
  accentColor = "#FFFFFF",
  onClose,
  onEdit,
  onDeleted,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rgb = hexToRgb(accentColor);

  useEffect(() => {
    if (!media) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !confirmingDelete) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [media, confirmingDelete, onClose]);

  if (!media) return null;
  const source = parseSource(media);
  if (!source) return null;
  const meta = SOURCE_META[source.kind] || SOURCE_META.embed;
  const isIframe = source.kind !== "direct";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMedia(profileId, media.id);
      toast.success("Deleted");
      setConfirmingDelete(false);
      onDeleted?.();
      onClose?.();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const ActionBtn = ({ "data-testid": tid, icon: Icon, label, onClick, danger }) => (
    <button
      type="button"
      data-testid={tid}
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-10 px-3 md:px-4 rounded-full text-sm border transition-colors ${
        danger
          ? "border-white/10 text-white/60 hover:text-[#F43F5E] hover:border-[#F43F5E]/60 hover:bg-[#F43F5E]/10"
          : "border-white/10 text-white/70 hover:text-white hover:border-white/30 hover:bg-white/[0.06]"
      }`}
      aria-label={label}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div
        key="player-overlay"
        data-testid="video-player-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onContextMenu={(e) => e.preventDefault()}
        style={{ "--p-color": accentColor, "--p-rgb": rgb }}
        className="fixed inset-0 z-40 bg-[#050507]/97 backdrop-blur-xl flex flex-col"
      >
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 px-4 md:px-8 py-4 border-b border-white/[0.05]">
          <div className="min-w-0 flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] uppercase tracking-[0.2em] text-white/70 shrink-0"
              style={{ color: accentColor }}
              data-testid="player-source-badge"
            >
              <meta.Icon className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{meta.label}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 truncate">
                {media.sectionLabel}
              </p>
              <h2
                data-testid="player-title"
                className="text-base md:text-lg font-medium text-white truncate"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {media.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ActionBtn
              data-testid="player-edit-btn"
              icon={Pencil}
              label="Edit"
              onClick={() => onEdit?.(media)}
            />
            <ActionBtn
              data-testid="player-delete-btn"
              icon={Trash2}
              label="Delete"
              danger
              onClick={() => setConfirmingDelete(true)}
            />
            <button
              type="button"
              data-testid="player-close-btn"
              onClick={onClose}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 hover:bg-white/[0.06] transition-colors"
              aria-label="Close player"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {/* Player surface */}
        <div className="flex-1 flex items-center justify-center px-3 md:px-8 py-6 md:py-8">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_30px_90px_-30px_rgba(0,0,0,0.8)] border border-white/[0.05]"
            style={{
              boxShadow: `0 30px 90px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(var(--p-rgb),0.12), 0 0 60px -20px rgba(var(--p-rgb),0.45)`,
            }}
          >
            {isIframe ? (
              <iframe
                data-testid="player-iframe"
                src={source.src}
                title={media.title}
                /* Sandbox: omit allow-popups & allow-top-navigation → no exits */
                sandbox="allow-scripts allow-same-origin allow-presentation"
                referrerPolicy="strict-origin"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="w-full h-full border-0 bg-black"
              />
            ) : (
              <video
                data-testid="player-video"
                src={source.src}
                controls
                autoPlay
                playsInline
                preload="metadata"
                controlsList="nodownload noremoteplayback noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                className="w-full h-full object-contain bg-black"
              >
                Your browser does not support the video tag.
              </video>
            )}

            {/* Click-shields over branding / "watch externally" hotspots.
                These intercept pointer events on top of the iframe so users
                cannot reach YouTube/Vimeo's external-link affordances. */}
            {isIframe && (
              <>
                <div
                  data-testid="player-shield-top"
                  className="absolute top-0 left-0 right-0 h-12 md:h-14 pointer-events-auto"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-hidden
                />
                <div
                  data-testid="player-shield-bottom-right"
                  className="absolute bottom-0 right-0 w-28 h-10 md:w-36 md:h-12 pointer-events-auto"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-hidden
                />
              </>
            )}
          </motion.div>
        </div>

        {/* Description footer */}
        {media.description ? (
          <footer className="px-4 md:px-8 pb-5 md:pb-8">
            <p
              data-testid="player-description"
              className="max-w-3xl mx-auto text-sm text-white/55 leading-relaxed text-center whitespace-pre-wrap"
            >
              {media.description}
            </p>
          </footer>
        ) : (
          <div className="h-4 md:h-6" />
        )}

        <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
          <AlertDialogContent
            data-testid="player-delete-confirm-dialog"
            className="bg-[#0a0a0d] border-white/10 text-white"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this media item?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/50">
                "{media.title}" will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                data-testid="player-delete-cancel"
                className="bg-transparent border-white/15 text-white hover:bg-white/[0.05] hover:text-white"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                data-testid="player-delete-confirm"
                disabled={deleting}
                onClick={handleDelete}
                className="bg-[#E11D48] hover:bg-[#be123c] text-white"
              >
                {deleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </AnimatePresence>
  );
}
