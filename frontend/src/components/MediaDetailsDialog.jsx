import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, ExternalLink, Youtube, Video, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { hexToRgb } from "@/lib/registry";
import { deleteMedia } from "@/lib/api";

const detectEmbedKind = (url) => {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  return "embed";
};

export default function MediaDetailsDialog({
  open,
  onOpenChange,
  media,
  profileId,
  accentColor = "#FFFFFF",
  onEdit,
  onDeleted,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const rgb = hexToRgb(accentColor);

  if (!media) return null;

  const isDirect = media.sourceType === "direct";
  const kind = detectEmbedKind(media.sourceUrl);
  let Icon = Link2;
  let label = "Embed";
  if (isDirect) {
    Icon = Video;
    label = "Direct video";
  } else if (kind === "youtube") {
    Icon = Youtube;
    label = "YouTube";
  } else if (kind === "vimeo") {
    Icon = Video;
    label = "Vimeo";
  }

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteMedia(profileId, media.id);
      toast.success("Deleted");
      setConfirmingDelete(false);
      onDeleted?.();
      onOpenChange(false);
    } catch {
      toast.error("Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-testid="media-details-dialog"
          style={{ "--p-color": accentColor, "--p-rgb": rgb }}
          className="bg-[#0a0a0d] border-white/[0.08] text-white max-w-lg p-0 overflow-hidden"
        >
          {/* Hero band */}
          <div
            className="relative aspect-[16/8] w-full overflow-hidden"
            style={{
              background: `linear-gradient(135deg, rgba(var(--p-rgb),0.30) 0%, rgba(var(--p-rgb),0.06) 70%, transparent 100%), #08080b`,
            }}
          >
            <div
              className="absolute inset-0 opacity-50"
              style={{
                background: `radial-gradient(circle at 25% 25%, rgba(var(--p-rgb),0.4), transparent 60%)`,
              }}
            />
            <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} strokeWidth={2} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-white/80">
                {label}
              </span>
            </div>
            <div className="absolute top-4 right-4 inline-flex items-center px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/70">
              {media.sectionLabel}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-6 space-y-5"
          >
            <DialogHeader className="space-y-1.5">
              <DialogTitle
                data-testid="media-details-title"
                className="text-2xl font-light tracking-tight"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {media.title}
              </DialogTitle>
              {media.description ? (
                <DialogDescription
                  data-testid="media-details-description"
                  className="text-white/55 text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {media.description}
                </DialogDescription>
              ) : (
                <DialogDescription className="text-white/30 text-sm italic">
                  No description.
                </DialogDescription>
              )}
            </DialogHeader>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1.5">
                Source
              </p>
              <a
                data-testid="media-details-source-link"
                href={media.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-mono text-white/70 hover:text-white break-all"
              >
                <span className="break-all">{media.sourceUrl}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              </a>
            </div>

            <p className="text-[11px] text-white/30">
              Player coming soon. For now this is a details-only view.
            </p>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
              <Button
                type="button"
                data-testid="media-details-delete"
                variant="ghost"
                onClick={() => setConfirmingDelete(true)}
                className="text-white/50 hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  data-testid="media-details-close"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="text-white/60 hover:text-white hover:bg-white/[0.05]"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  data-testid="media-details-edit"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit?.(media);
                  }}
                  style={{ backgroundColor: accentColor }}
                  className="text-white hover:opacity-90 gap-2 rounded-full px-4"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent
          data-testid="media-delete-confirm-dialog"
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
              data-testid="media-delete-cancel"
              className="bg-transparent border-white/15 text-white hover:bg-white/[0.05] hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="media-delete-confirm"
              disabled={busy}
              onClick={handleDelete}
              className="bg-[#E11D48] hover:bg-[#be123c] text-white"
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
