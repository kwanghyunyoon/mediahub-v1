import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, Check, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ICON_NAMES, getIcon, COLOR_SWATCHES, hexToRgb } from "@/lib/registry";
import { adminCreateProfile, adminUpdateProfile } from "@/lib/api";

const DEFAULT = {
  name: "",
  passcode: "",
  color: COLOR_SWATCHES[0].value,
  icon: "User",
  sections: ["Movies", "Music"],
};

export default function ProfileForm({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(() => ({
    name: initial?.name ?? DEFAULT.name,
    passcode: initial?.passcode ?? DEFAULT.passcode,
    color: initial?.color ?? DEFAULT.color,
    icon: initial?.icon ?? DEFAULT.icon,
    sections: initial?.sections?.length ? [...initial.sections] : [...DEFAULT.sections],
  }));
  const [newSection, setNewSection] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!/^\d{4}$/.test(form.passcode)) e.passcode = "Must be exactly 4 digits";
    if (!/^#[0-9A-Fa-f]{6}$/.test(form.color)) e.color = "Invalid color";
    if (!form.icon) e.icon = "Pick an icon";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addSection = () => {
    const v = newSection.trim();
    if (!v) return;
    if (form.sections.length >= 20) {
      toast.error("Maximum 20 sections");
      return;
    }
    set("sections", [...form.sections, v]);
    setNewSection("");
  };

  const removeSection = (idx) =>
    set("sections", form.sections.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        passcode: form.passcode,
        color: form.color,
        icon: form.icon,
        sections: form.sections,
      };
      if (isEdit) {
        await adminUpdateProfile(initial.id, payload);
        toast.success("Profile updated");
      } else {
        await adminCreateProfile(payload);
        toast.success("Profile created");
      }
      onSaved?.();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Save failed";
      toast.error(typeof msg === "string" ? msg : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const SelectedIcon = getIcon(form.icon);
  const rgb = hexToRgb(form.color);

  return (
    <motion.form
      data-testid="profile-form"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ "--p-color": form.color, "--p-rgb": rgb }}
      className="rounded-2xl bg-[#0d0d12] border border-white/[0.06] p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: form.color }}
          >
            <SelectedIcon className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-medium text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
            {isEdit ? "Edit Profile" : "New Profile"}
          </h2>
        </div>
        <button
          type="button"
          data-testid="profile-form-close"
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Name */}
      <div>
        <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 block">
          Name
        </Label>
        <Input
          data-testid="form-name-input"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Alex"
          maxLength={40}
          className="bg-[#0a0a0d] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-[var(--p-color)] focus-visible:border-[var(--p-color)]"
        />
        {errors.name && (
          <p className="mt-1.5 text-xs text-[#F43F5E]" data-testid="form-name-error">
            {errors.name}
          </p>
        )}
      </div>

      {/* Passcode */}
      <div>
        <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 block">
          4-Digit Passcode
        </Label>
        <Input
          data-testid="form-passcode-input"
          value={form.passcode}
          onChange={(e) => set("passcode", e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="0000"
          maxLength={4}
          className="bg-[#0a0a0d] border-white/10 text-white placeholder:text-white/25 font-mono tracking-[0.5em] text-center focus-visible:ring-1 focus-visible:ring-[var(--p-color)] focus-visible:border-[var(--p-color)]"
        />
        {errors.passcode && (
          <p className="mt-1.5 text-xs text-[#F43F5E]" data-testid="form-passcode-error">
            {errors.passcode}
          </p>
        )}
      </div>

      {/* Color */}
      <div>
        <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 block">
          Color Theme
        </Label>
        <div className="flex flex-wrap items-center gap-3" data-testid="color-swatches">
          {COLOR_SWATCHES.map((sw) => {
            const active = form.color.toLowerCase() === sw.value.toLowerCase();
            return (
              <button
                key={sw.value}
                type="button"
                data-testid={`color-swatch-${sw.name.toLowerCase()}`}
                onClick={() => set("color", sw.value)}
                style={{ backgroundColor: sw.value }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 ring-offset-2 ring-offset-[#0d0d12] ${
                  active ? "ring-2 ring-white" : ""
                }`}
                aria-label={sw.name}
              >
                {active && <Check className="w-4 h-4 text-white" strokeWidth={2.5} />}
              </button>
            );
          })}
          <label className="flex items-center gap-2 cursor-pointer ml-1">
            <span className="text-xs text-white/40">Custom</span>
            <input
              type="color"
              data-testid="color-custom-picker"
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
              className="w-9 h-9 rounded-full bg-transparent border border-white/15 cursor-pointer overflow-hidden p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
            />
          </label>
        </div>
      </div>

      {/* Icon */}
      <div>
        <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 block">
          Icon
        </Label>
        <div
          data-testid="icon-grid"
          className="grid grid-cols-8 sm:grid-cols-10 gap-2 max-h-44 overflow-y-auto pr-1"
        >
          {ICON_NAMES.map((name) => {
            const Icon = getIcon(name);
            const active = form.icon === name;
            return (
              <button
                key={name}
                type="button"
                data-testid={`icon-btn-${name}`}
                onClick={() => set("icon", name)}
                title={name}
                className={`aspect-square rounded-lg flex items-center justify-center border transition-colors ${
                  active
                    ? "bg-[var(--p-color)] border-transparent text-white"
                    : "bg-white/[0.03] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.07]"
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      <div>
        <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 block">
          Section Labels
        </Label>
        <div className="flex flex-wrap gap-2 mb-3" data-testid="sections-list">
          {form.sections.map((s, idx) => (
            <span
              key={`${s}-${idx}`}
              data-testid={`section-pill-${idx}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-white/[0.05] border border-white/[0.08] text-white/85"
            >
              {s}
              <button
                type="button"
                data-testid={`section-remove-${idx}`}
                onClick={() => removeSection(idx)}
                className="w-4 h-4 rounded-full flex items-center justify-center text-white/40 hover:text-white"
                aria-label={`Remove ${s}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {form.sections.length === 0 && (
            <span className="text-xs text-white/30">No sections yet</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            data-testid="section-input"
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSection();
              }
            }}
            placeholder="Add section (e.g. Movies)"
            maxLength={30}
            className="bg-[#0a0a0d] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-[var(--p-color)] focus-visible:border-[var(--p-color)]"
          />
          <Button
            type="button"
            data-testid="section-add-btn"
            onClick={addSection}
            variant="outline"
            className="bg-transparent border-white/15 text-white hover:bg-white/[0.06] hover:text-white gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
        <Button
          type="button"
          data-testid="form-cancel-btn"
          variant="ghost"
          onClick={onClose}
          className="text-white/60 hover:text-white hover:bg-white/[0.05]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          data-testid="form-submit-btn"
          disabled={saving}
          style={{ backgroundColor: form.color }}
          className="text-white hover:opacity-90 gap-2 rounded-full px-5"
        >
          {isEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Profile"}
        </Button>
      </div>
    </motion.form>
  );
}
