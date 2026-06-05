import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut, Plus, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getIcon, hexToRgb } from "@/lib/registry";
import { listMedia } from "@/lib/api";
import MediaCard from "@/components/MediaCard";
import MediaForm from "@/components/MediaForm";
import MediaDetailsDialog from "@/components/MediaDetailsDialog";

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
  const [details, setDetails] = useState(null);

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

  if (!profile) return null;
  const Icon = getIcon(profile.icon);

  const exit = () => {
    sessionStorage.removeItem(`mh_profile_${id}`);
    navigate("/");
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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ "--p-color": profile.color, "--p-rgb": rgb }}
    >
      {/* Top bar */}
      <header
        data-testid="profile-header"
        className="flex items-center justify-between px-5 md:px-10 py-5 border-b border-white/[0.06]"
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

      {/* Section filter pills */}
      <nav
        data-testid="profile-sections-nav"
        className="px-5 md:px-10 py-4 border-b border-white/[0.06] overflow-x-auto"
      >
        {profile.sections.length === 0 ? (
          <p className="text-xs uppercase tracking-[0.2em] text-white/30">No sections configured</p>
        ) : (
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
                      className="text-xl md:text-2xl font-light tracking-tight text-white truncate"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {group.label}
                    </h2>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-white/30">
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
                  <div
                    data-testid={`media-grid-${group.label}`}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                  >
                    {group.items.map((m, idx) => (
                      <MediaCard
                        key={m.id}
                        media={m}
                        accentColor={profile.color}
                        index={idx}
                        onClick={setDetails}
                      />
                    ))}
                  </div>
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

      {/* Details dialog */}
      <MediaDetailsDialog
        open={!!details}
        onOpenChange={(o) => !o && setDetails(null)}
        media={details}
        profileId={profile.id}
        accentColor={profile.color}
        onEdit={(m) => {
          setDetails(null);
          openEdit(m);
        }}
        onDeleted={refresh}
      />
    </div>
  );
}
