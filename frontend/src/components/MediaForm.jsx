import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Plus } from "lucide-react";
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
import { createMedia, updateMedia } from "@/lib/api";

const DEFAULT = {
  title: "",
  description: "",
  sectionLabel: "",
  sourceType: "direct",
  sourceUrl: "",
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
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const rgb = hexToRgb(accentColor);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.sectionLabel) e.sectionLabel = "Pick a section";
    if (!form.sourceUrl.trim()) e.sourceUrl = "URL is required";
    else if (!/^https?:\/\//i.test(form.sourceUrl.trim()))
      e.sourceUrl = "Must start with http:// or https://";
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
            <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 block">
              {form.sourceType === "direct" ? "Video URL" : "Embed URL"}
            </Label>
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
