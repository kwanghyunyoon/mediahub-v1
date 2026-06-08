import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, LogOut, Plus, Library, GripVertical, Check, X as XIcon } from "lucide-react";
import { useInactivityTimer } from "@/hooks/use-inactivity-timer";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getIcon, hexToRgb } from "@/lib/registry";
import { listMedia, reorderMedia, reorderSections, clearProfilePasscode } from "@/lib/api";
import MediaForm from "@/components/MediaForm";
import VideoPlayer from "@/components/VideoPlayer";
import SortableMediaCard from "@/components/SortableMediaCard";

// Sortable wrapper for a section pill (used in "Reorder sections" mode).
function SortableSectionPill({ id, label }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : 1,
      }}
      {...attributes}
      {...listeners}
      data-testid={`reorder-pill-${id}`}
      className={`inline-flex items-center gap-2 px-4 md:px-5 py-2 rounded-full text-sm whitespace-nowrap cursor-grab active:cursor-grabbing border ${
        isDragging
          ? "bg-white/[0.08] border-white/30 text-white"
          : "bg-white/[0.03] border-white/10 text-white/80 hover:border-white/20"
      }`}
    >
      <GripVertical className="w-3.5 h-3.5 text-white/40" />
      {label}
    </div>
  );
}

export default function ProfileShell() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  const [media, setMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  const [activeSection, setActiveSection] = useState("__all__");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // media object when editing
  const [defaultSection, setDefaultSection] = useState(null);
  const [playing, setPlaying] = useState(null); // media object currently in player

  // Section-reorder mode (profile-shell)
  const [reorderingSections, setReorderingSections] = useState(false);
  const [draftSections, setDraftSections] = useState([]);

  useEffect(() => {
    const raw = sessionStorage.getItem(`mh_profile_${id}`);
    if (!raw) {
      navigate("/", { replace: true });
      return;
    }
    setProfile(JSON.parse(raw));
  }, [id, navigate]);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoadingMedia(true);
    try {
      const items = await listMedia(id);
      setMedia(items);
    } catch {
      setMedia([]);
    } finally {
      setLoadingMedia(false);
    }
  }, [id]);

  useEffect(() => {
    if (profile) refresh();
  }, [profile, refresh]);

  const rgb = useMemo(() => (profile ? hexToRgb(profile.color) : "255,255,255"), [profile]);

  // Group media by section label (only sections present in profile.sections show as groups in order)
  const grouped = useMemo(() => {
    if (!profile) return [];
    const groups = profile.sections.map((label) => ({
      label,
      items: media.filter((m) => m.sectionLabel === label),
    }));
    if (activeSection === "__all__") return groups;
    return groups.filter((g) => g.label === activeSection);
  }, [profile, media, activeSection]);

  // All hooks must run unconditionally on every render — keep above the early-return.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const exit = useCallback(() => {
    sessionStorage.removeItem(`mh_profile_${id}`);
    clearProfilePasscode(id);
    navigate("/");
  }, [id, navigate]);

  const { showWarning, countdown, dismiss } = useInactivityTimer({
    timeoutMs: 10 * 60 * 1000, // 10 minutes
    warningMs: 60 * 1000,       // warn 1 minute before
    onLogout: exit,
  });

  if (!profile) return null;
  const Icon = getIcon(profile.icon);
  const isWestern = profile.theme === "western";
  const isNeon = profile.theme === "neon";
  const isStudio = profile.theme === "studio";

  const themeBgClass = isWestern
    ? "bg-[#1a1410] bg-western-grain text-[#F5E6D3]"
    : isNeon
    ? "bg-[#07051a] bg-neon-grid text-[#f1e9ff]"
    : isStudio
    ? "bg-[#18120c] bg-studio-paper text-[#f0e5d2]"
    : "";

  const themeBorderClass =
    isWestern
      ? "border-[#3a2a1c]"
      : isNeon
      ? "border-[#2a1845]"
      : isStudio
      ? "border-[#2d2419]"
      : "border-white/[0.06]";

  const handleDragEnd = (sectionLabel) => (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setMedia((prev) => {
      const sectionItems = prev.filter((m) => m.sectionLabel === sectionLabel);
      const ids = sectionItems.map((m) => m.id);
      const oldIdx = ids.indexOf(active.id);
      const newIdx = ids.indexOf(over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      const reordered = arrayMove(sectionItems, oldIdx, newIdx);
      reorderMedia(profile.id, sectionLabel, reordered.map((m) => m.id)).catch(() =>
        toast.error("Reorder failed")
      );
      const others = prev.filter((m) => m.sectionLabel !== sectionLabel);
      return [...others, ...reordered.map((m, i) => ({ ...m, order: i }))];
    });
  };

  const openAdd = (sectionLabel = null) => {
    setEditing(null);
    setDefaultSection(sectionLabel);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setDefaultSection(null);
    setFormOpen(true);
  };

  const hasBg = !!profile.backgroundUrl;

  return (
    <div
      className={`min-h-screen flex flex-col ${themeBgClass}`}
      data-theme={profile.theme || "default"}
      style={{
        "--p-color": profile.color,
        "--p-rgb": rgb,
        ...(hasBg && {
          backgroundImage: `linear-gradient(rgba(5,5,7,0.82) 0%, rgba(5,5,7,0.94) 100%), url(${profile.backgroundUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }),
      }}
    >
      {/* Cinematic hero banner — western theme only */}
      {isWestern && (
        <section
          data-testid="western-hero-banner"
          className="relative w-full overflow-hidden border-b border-[#3a2a1c]"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('${profile.backgroundUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2000&q=80"}')`,
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(20,12,8,0.20) 0%, rgba(20,12,8,0.55) 55%, #1a1410 100%), linear-gradient(90deg, rgba(20,12,8,0.65) 0%, transparent 60%)",
            }}
          />
          <div aria-hidden className="absolute inset-0 bg-vignette opacity-80" />

          <div className="relative px-5 md:px-10 lg:px-16 pt-16 pb-12 md:pt-24 md:pb-16 lg:pt-32 lg:pb-24 max-w-7xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C2410C]/15 border border-[#C2410C]/40 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#F5E6D3] font-semibold">
                Featured Profile
              </span>
            </div>
            <h1
              data-testid="western-hero-title"
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-[#F5E6D3] leading-[0.95] tracking-tight max-w-3xl"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Westwood<br />
              <span className="italic text-[#D4A574]">Ranch</span>
            </h1>
            <p
              data-testid="western-hero-subtitle"
              className="mt-6 max-w-xl text-base md:text-lg text-[#F5E6D3]/70 leading-relaxed"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Dust on the boots. Whiskey on the breath. A reel of golden-hour rides,
              long shadows, and stories carved into the canyon walls.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.3em] text-[#D4A574] font-semibold">
              <span>Best Moments</span>
              <span className="w-1 h-1 rounded-full bg-[#D4A574]/50" />
              <span>Classic Scenes</span>
              <span className="w-1 h-1 rounded-full bg-[#D4A574]/50" />
              <span>Hidden Gems</span>
            </div>
          </div>
        </section>
      )}

      {/* Top bar */}
      <header
        data-testid="profile-header"
        className={`flex items-center justify-between px-5 md:px-10 py-5 border-b ${
          isWestern ? "border-[#3a2a1c]" : "border-white/[0.06]"
        }`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            data-testid="profile-back-btn"
            onClick={exit}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-colors shrink-0"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: profile.color }}
            >
              <Icon className="w-4 h-4 text-white" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">Profile</span>
              <span
                data-testid="profile-name-display"
                className="text-sm md:text-base font-medium text-white/90 truncate"
              >
                {profile.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            data-testid="media-add-btn-header"
            onClick={() => openAdd(null)}
            disabled={profile.sections.length === 0}
            style={{ backgroundColor: profile.color }}
            className="text-white hover:opacity-90 gap-2 rounded-full px-4"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add media</span>
          </Button>
          <Button
            data-testid="profile-exit-btn"
            variant="ghost"
            size="sm"
            onClick={exit}
            className="text-white/50 hover:text-white hover:bg-white/[0.05] gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </Button>
        </div>
      </header>

      {/* Section filter pills (or sortable list in reorder mode) */}
      <nav
        data-testid="profile-sections-nav"
        className={`px-5 md:px-10 py-4 border-b overflow-x-auto ${themeBorderClass}`}
      >
        {profile.sections.length === 0 ? (
          <p className="text-xs uppercase tracking-[0.2em] text-white/30">No sections configured</p>
        ) : reorderingSections ? (
          /* --- Reorder mode --- */
          <div className="flex items-center gap-3 min-w-max">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-medium pr-1">
              Drag to reorder
            </span>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => {
                const { active, over } = e;
                if (!over || active.id === over.id) return;
                const oldIdx = draftSections.indexOf(active.id);
                const newIdx = draftSections.indexOf(over.id);
                if (oldIdx < 0 || newIdx < 0) return;
                setDraftSections(arrayMove(draftSections, oldIdx, newIdx));
              }}
            >
              <SortableContext
                items={draftSections}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex items-center gap-2">
                  {draftSections.map((s) => (
                    <SortableSectionPill key={s} id={s} label={s} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button
              type="button"
              data-testid="sections-reorder-cancel"
              onClick={() => {
                setReorderingSections(false);
                setDraftSections([]);
              }}
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-colors"
              aria-label="Cancel reorder"
            >
              <XIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="sections-reorder-save"
              onClick={async () => {
                try {
                  await reorderSections(profile.id, draftSections);
                  const next = { ...profile, sections: [...draftSections] };
                  setProfile(next);
                  sessionStorage.setItem(`mh_profile_${id}`, JSON.stringify(next));
                  toast.success("Section order saved");
                  setReorderingSections(false);
                  setDraftSections([]);
                } catch {
                  toast.error("Save failed");
                }
              }}
              style={{ backgroundColor: profile.color }}
              className="h-9 px-4 rounded-full text-sm text-white hover:opacity-90 inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          </div>
        ) : (
          /* --- Normal filter mode --- */
          <div className="flex items-center gap-2 min-w-max">
            {[{ key: "__all__", label: "All" }, ...profile.sections.map((s) => ({ key: s, label: s }))].map(
              (tab, idx) => {
                const active = tab.key === activeSection;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    data-testid={
                      tab.key === "__all__" ? "section-tab-all" : `section-tab-${idx - 1}`
                    }
                    onClick={() => setActiveSection(tab.key)}
                    className={`relative px-4 md:px-5 py-2 rounded-full text-sm transition-colors duration-300 whitespace-nowrap ${
                      active ? "text-white" : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="active-section-pill"
                        className="absolute inset-0 rounded-full border"
                        style={{
                          backgroundColor: `rgba(var(--p-rgb), 0.14)`,
                          borderColor: `rgba(var(--p-rgb), 0.5)`,
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative">{tab.label}</span>
                  </button>
                );
              }
            )}
            <button
              type="button"
              data-testid="sections-reorder-start"
              onClick={() => {
                setDraftSections([...profile.sections]);
                setReorderingSections(true);
              }}
              className="ml-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-white/40 hover:text-white/80 transition-colors px-2 py-1"
              title="Reorder sections"
            >
              <GripVertical className="w-3.5 h-3.5" />
              Reorder
            </button>
          </div>
        )}
      </nav>

      {/* Main: media library */}
      <main className="flex-1 px-5 md:px-10 py-8 md:py-10">
        {profile.sections.length === 0 ? (
          <div
            data-testid="profile-no-sections"
            className="max-w-md mx-auto text-center mt-12 border border-dashed border-white/10 rounded-2xl p-10"
          >
            <Library className="w-8 h-8 mx-auto text-white/30 mb-3" strokeWidth={1.5} />
            <p className="text-white/70 mb-1">No sections in this profile</p>
            <p className="text-sm text-white/40">
              Add section labels in the admin panel before adding media.
            </p>
          </div>
        ) : loadingMedia ? (
          <p
            data-testid="profile-media-loading"
            className="text-center text-white/30 text-sm mt-12"
          >
            Loading media…
          </p>
        ) : (
          <div className="space-y-10 md:space-y-12 max-w-7xl mx-auto">
            {grouped.map((group) => (
              <section
                key={group.label}
                data-testid={`media-section-${group.label}`}
                className="space-y-4"
              >
                <header className="flex items-baseline justify-between gap-4">
                  <div className="flex items-baseline gap-3 min-w-0">
                    <h2
                      className={`truncate ${
                        isWestern
                          ? "text-3xl md:text-4xl font-bold text-[#F5E6D3]"
                          : "text-xl md:text-2xl font-light tracking-tight text-white"
                      }`}
                      style={{
                        fontFamily: isWestern
                          ? "'Playfair Display', serif"
                          : "Outfit, sans-serif",
                      }}
                    >
                      {group.label}
                    </h2>
                    <span
                      className={`text-[11px] uppercase tracking-[0.2em] ${
                        isWestern ? "text-[#D4A574]/70" : "text-white/30"
                      }`}
                    >
                      {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-testid={`section-add-${group.label}`}
                    onClick={() => openAdd(group.label)}
                    className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </header>

                {group.items.length === 0 ? (
                  <div
                    data-testid={`media-empty-${group.label}`}
                    className="border border-dashed border-white/[0.08] rounded-2xl px-6 py-8 text-center"
                  >
                    <p className="text-sm text-white/40">
                      No media in {group.label} yet.
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd(group.label)}
                  >
                    <SortableContext
                      items={group.items.map((m) => m.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div
                        data-testid={`media-grid-${group.label}`}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                      >
                        {group.items.map((m, idx) => (
                          <SortableMediaCard
                            key={m.id}
                            media={m}
                            accentColor={profile.color}
                            index={idx}
                            onClick={setPlaying}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit form */}
      {formOpen && (
        <MediaForm
          open={formOpen}
          onOpenChange={(o) => {
            setFormOpen(o);
            if (!o) {
              setEditing(null);
              setDefaultSection(null);
            }
          }}
          initial={editing}
          sections={profile.sections}
          defaultSection={defaultSection}
          profileId={profile.id}
          accentColor={profile.color}
          onSaved={refresh}
        />
      )}

      {/* Fullscreen in-app video player */}
      <VideoPlayer
        media={playing}
        profileId={profile.id}
        accentColor={profile.color}
        onClose={() => setPlaying(null)}
        onEdit={(m) => {
          setPlaying(null);
          openEdit(m);
        }}
        onDeleted={refresh}
      />

      {/* Inactivity lock screen warning */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            key="lock-warning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] flex items-center justify-center safe-area-override"
            style={{ backgroundColor: "rgba(5,5,7,0.88)", backdropFilter: "blur(12px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-6 px-8 py-10 rounded-3xl border border-white/[0.08] bg-[#0d0d12] max-w-sm w-full mx-4 text-center"
            >
              {/* Profile icon */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: profile.color }}
              >
                {(() => { const I = getIcon(profile.icon); return <I className="w-7 h-7 text-white" strokeWidth={1.75} />; })()}
              </div>

              {/* Countdown ring */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke={profile.color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - countdown / 60)}`}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <span className="text-2xl font-mono font-semibold text-white tabular-nums">
                  {countdown}
                </span>
              </div>

              <div className="space-y-1.5">
                <p className="text-lg font-medium text-white">Still watching?</p>
                <p className="text-sm text-white/50">
                  {profile.name} will be locked due to inactivity.
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  onClick={dismiss}
                  className="w-full py-3 rounded-xl font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: profile.color }}
                >
                  Stay logged in
                </button>
                <button
                  type="button"
                  onClick={exit}
                  className="w-full py-3 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                >
                  Log out now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
