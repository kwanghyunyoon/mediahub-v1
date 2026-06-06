import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Plus, Sparkles, X, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { hexToRgb } from "@/lib/registry";
import { createMedia, updateMedia, oembedLookup } from "@/lib/api";
import { extractYouTubeId } from "@/lib/embed";

const DEFAULT = {
  title: "",
  description: "",
  sectionLabel: "",
  sourceType: "direct",
  sourceUrl: "",
  posterUrl: "",
};

export default function MediaForm({
  open,
  onOpenChange,
  initial,
  sections,
  defaultSection,
  profileId,
  accentColor = "#FFFFFF",
  onSaved,
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState(() => ({
    title: initial?.title ?? DEFAULT.title,
    description: initial?.description ?? DEFAULT.description,
    sectionLabel: initial?.sectionLabel ?? defaultSection ?? sections?.[0] ?? "",
    sourceType: initial?.sourceType ?? DEFAULT.sourceType,
    sourceUrl: initial?.sourceUrl ?? DEFAULT.sourceUrl,
    posterUrl: initial?.posterUrl ?? DEFAULT.posterUrl,
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const rgb = hexToRgb(accentColor);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Is the current source URL eligible for oEmbed metadata fetch?
  const canFetchMeta =
    form.sourceType === "embed" &&
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)/i.test(
      form.sourceUrl.trim()
    );

  const handleFetchMeta = async () => {
    if (!canFetchMeta || fetching) return;
    setFetching(true);
    try {
      const data = await oembedLookup(form.sourceUrl.trim());
      // Only fill empty fields — never overwrite something the user already typed.
      setForm((p) => ({
        ...p,
        title: p.title.trim() || data.title || p.title,
        description: p.description.trim() || data.description || p.description,
        posterUrl: p.posterUrl.trim() || data.thumbnail_url || p.posterUrl,
      }));
      toast.success("Metadata loaded");
    } catch (err) {
      toast.error("Could not fetch metadata");
    } finally {
      setFetching(false);
    }
  };

  // If the current source is a YouTube URL, suggest its auto-thumbnail.
  const ytId = form.sourceType === "embed" ? extractYouTubeId(form.sourceUrl) : null;
  const suggestedPoster = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : null;
  const canUseSuggestion =
    !!suggestedPoster && form.posterUrl.trim() !== suggestedPoster;

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.sectionLabel) e.sectionLabel = "Pick a section";
    if (!form.sourceUrl.trim()) e.sourceUrl = "URL is required";
    else if (!/^https?:\/\//i.test(form.sourceUrl.trim()))
      e.sourceUrl = "Must start with http:// or https://";
    if (form.posterUrl.trim() && !/^https?:\/\//i.test(form.posterUrl.trim()))
      e.posterUrl = "Must start with http:// or https://";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        sectionLabel: form.sectionLabel,
        sourceType: form.sourceType,
        sourceUrl: form.sourceUrl.trim(),
        posterUrl: form.posterUrl.trim() || null,
      };
      if (isEdit) {
        await updateMedia(profileId, initial.id, payload);
        toast.success("Media updated");
      } else {
        await createMedia(profileId, payload);
        toast.success("Media added");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Save failed";
      toast.error(typeof msg === "string" ? msg : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="media-form-dialog"
        style={{ "--p-color": accentColor, "--p-rgb": rgb }}
        className="bg-[#0a0a0d] border-white/[0.08] text-white max-w-lg p-0 overflow-hidden"
      >
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6 space-y-5"
        >
          <DialogHeader className="space-y-1">
            <DialogTitle
              className="text-xl font-light tracking-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {isEdit ? "Edit media" : "Add media"}
            </DialogTitle>
            <DialogDescription className="text-white/40 text-sm">
              {isEdit
                ? "Update the details and source for this item."
                : "Pick a section and paste a direct or embed URL."}
            </DialogDescription>
          </DialogHeader>

          {/* Title */}
          <div>
            <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 block">
              Title
            </Label>
            <Input
              data-testid="media-title-input"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={200}
              placeholder="e.g. The Grand Budapest Hotel"
              className="bg-[#0d0d12] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-[var(--p-color)] focus-visible:border-[var(--p-color)]"
            />
            {errors.title && (
              <p className="mt-1.5 text-xs text-[#F43F5E]" data-testid="media-title-error">
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 block">
              Description <span className="normal-case tracking-normal text-white/30">(optional)</span>
            </Label>
            <Textarea
              data-testid="media-description-input"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="A short note about this item…"
              className="bg-[#0d0d12] border-white/10 text-white placeholder:text-white/25 resize-none focus-visible:ring-1 focus-visible:ring-[var(--p-color)] focus-visible:border-[var(--p-color)]"
            />
          </div>

          {/* Section */}
          <div>
            <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 block">
              Section
            </Label>
            {sections.length === 0 ? (
              <p
                data-testid="media-no-sections-warning"
                className="text-xs text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg px-3 py-2"
              >
                This profile has no sections. Ask the admin to add at least one section first.
              </p>
            ) : (
              <Select
                value={form.sectionLabel}
                onValueChange={(v) => set("sectionLabel", v)}
              >
                <SelectTrigger
                  data-testid="media-section-trigger"
                  className="bg-[#0d0d12] border-white/10 text-white focus:ring-1 focus:ring-[var(--p-color)] focus:border-[var(--p-color)]"
                >
                  <SelectValue placeholder="Choose a section" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0d] border-white/10 text-white">
                  {sections.map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      data-testid={`media-section-option-${s}`}
                      className="focus:bg-white/[0.06] focus:text-white"
                    >
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.sectionLabel && (
              <p className="mt-1.5 text-xs text-[#F43F5E]" data-testid="media-section-error">
                {errors.sectionLabel}
              </p>
            )}
          </div>

          {/* Source type */}
          <div>
            <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 block">
              Source type
            </Label>
            <RadioGroup
              value={form.sourceType}
              onValueChange={(v) => set("sourceType", v)}
              className="grid grid-cols-2 gap-2"
              data-testid="media-source-type-group"
            >
              {[
                { v: "direct", label: "Direct URL", hint: "Cloudflare R2 / .mp4" },
                { v: "embed", label: "Embed URL", hint: "YouTube / Vimeo" },
              ].map((opt) => {
                const active = form.sourceType === opt.v;
                return (
                  <label
                    key={opt.v}
                    data-testid={`media-source-type-${opt.v}`}
                    className={`relative cursor-pointer rounded-xl border p-3 transition-colors ${
                      active
                        ? "border-[var(--p-color)] bg-[rgba(var(--p-rgb),0.08)]"
                        : "border-white/10 bg-[#0d0d12] hover:border-white/20"
                    }`}
                  >
                    <RadioGroupItem
                      value={opt.v}
                      className="sr-only"
                    />
                    <p className="text-sm font-medium text-white">{opt.label}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">{opt.hint}</p>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Source URL */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                {form.sourceType === "direct" ? "Video URL" : "Embed URL"}
              </Label>
              {canFetchMeta && (
                <button
                  type="button"
                  data-testid="media-fetch-meta-btn"
                  onClick={handleFetchMeta}
                  disabled={fetching}
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-[var(--p-color)] hover:opacity-80 transition-opacity disabled:opacity-40"
                >
                  <Wand2 className="w-3 h-3" />
                  {fetching ? "Fetching…" : "Fetch from URL"}
                </button>
              )}
            </div>
            <Input
              data-testid="media-source-url-input"
              value={form.sourceUrl}
              onChange={(e) => set("sourceUrl", e.target.value)}
              maxLength={2048}
              placeholder={
                form.sourceType === "direct"
                  ? "https://pub.r2.dev/.../video.mp4"
                  : "https://www.youtube.com/watch?v=…"
              }
              className="bg-[#0d0d12] border-white/10 text-white placeholder:text-white/25 font-mono text-xs focus-visible:ring-1 focus-visible:ring-[var(--p-color)] focus-visible:border-[var(--p-color)]"
            />
            {errors.sourceUrl && (
              <p className="mt-1.5 text-xs text-[#F43F5E]" data-testid="media-url-error">
                {errors.sourceUrl}
              </p>
            )}
          </div>

          {/* Poster image URL */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                Poster image{" "}
                <span className="normal-case tracking-normal text-white/30">
                  (optional)
                </span>
              </Label>
              {canUseSuggestion && (
                <button
                  type="button"
                  data-testid="media-poster-use-youtube"
                  onClick={() => set("posterUrl", suggestedPoster)}
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-[var(--p-color)] hover:opacity-80 transition-opacity"
                >
                  <Sparkles className="w-3 h-3" />
                  Use YouTube thumbnail
                </button>
              )}
            </div>
            <div className="flex gap-2 items-start">
              <div className="flex-1 min-w-0">
                <Input
                  data-testid="media-poster-url-input"
                  value={form.posterUrl}
                  onChange={(e) => set("posterUrl", e.target.value)}
                  maxLength={2048}
                  placeholder="https://images.example.com/poster.jpg"
                  className="bg-[#0d0d12] border-white/10 text-white placeholder:text-white/25 font-mono text-xs focus-visible:ring-1 focus-visible:ring-[var(--p-color)] focus-visible:border-[var(--p-color)]"
                />
                {errors.posterUrl && (
                  <p
                    className="mt-1.5 text-xs text-[#F43F5E]"
                    data-testid="media-poster-error"
                  >
                    {errors.posterUrl}
                  </p>
                )}
              </div>
              {form.posterUrl && (
                <div className="relative shrink-0">
                  <img
                    src={form.posterUrl}
                    alt=""
                    data-testid="media-poster-preview"
                    onError={(e) => {
                      e.currentTarget.style.opacity = "0.2";
                    }}
                    className="w-16 h-10 rounded-md object-cover border border-white/10 bg-black"
                  />
                  <button
                    type="button"
                    data-testid="media-poster-clear"
                    onClick={() => set("posterUrl", "")}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/80 border border-white/15 flex items-center justify-center text-white/70 hover:text-white"
                    aria-label="Clear poster"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <Button
              type="button"
              data-testid="media-form-cancel"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white/60 hover:text-white hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="media-form-submit"
              disabled={saving || sections.length === 0}
              style={{ backgroundColor: accentColor }}
              className="text-white hover:opacity-90 gap-2 rounded-full px-5"
            >
              {isEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add media"}
            </Button>
          </div>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}
