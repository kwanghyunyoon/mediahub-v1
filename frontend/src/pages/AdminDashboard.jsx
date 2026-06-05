import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, LogOut, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminListProfiles,
  adminDeleteProfile,
  clearAdminPasscode,
  getAdminPasscode,
} from "@/lib/api";
import { getIcon } from "@/lib/registry";
import { Button } from "@/components/ui/button";
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
import ProfileForm from "@/components/ProfileForm";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | profile object
  const [toDelete, setToDelete] = useState(null);

  // Gate route
  useEffect(() => {
    if (!getAdminPasscode()) {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await adminListProfiles();
      setProfiles(data);
    } catch (e) {
      if (e?.response?.status === 401) {
        clearAdminPasscode();
        navigate("/admin", { replace: true });
        return;
      }
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    clearAdminPasscode();
    navigate("/");
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await adminDeleteProfile(toDelete.id);
      toast.success(`Deleted "${toDelete.name}"`);
      setToDelete(null);
      refresh();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="min-h-screen px-4 sm:px-8 lg:px-12 py-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            data-testid="admin-dashboard-back"
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-[0.4em] text-white/30">MediaHub</span>
            <h1
              data-testid="admin-dashboard-title"
              className="text-xl md:text-2xl font-light tracking-tight text-white"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Admin Panel
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-testid="admin-new-profile-btn"
            onClick={() => setEditing("new")}
            className="bg-white text-black hover:bg-white/90 gap-2 rounded-full"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Profile</span>
          </Button>
          <Button
            data-testid="admin-logout-btn"
            variant="ghost"
            onClick={logout}
            className="text-white/50 hover:text-white hover:bg-white/[0.05] gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile list */}
        <section className="lg:col-span-7" data-testid="admin-profile-list">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-4">
            Profiles {profiles.length > 0 && `· ${profiles.length}`}
          </p>

          {loading ? (
            <p className="text-white/30 text-sm" data-testid="admin-list-loading">Loading…</p>
          ) : profiles.length === 0 ? (
            <div
              data-testid="admin-list-empty"
              className="border border-dashed border-white/10 rounded-2xl p-10 text-center"
            >
              <p className="text-white/60 mb-2">No profiles yet</p>
              <p className="text-sm text-white/40">Create your first profile to get started.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {profiles.map((p) => {
                  const Icon = getIcon(p.icon);
                  return (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      data-testid={`admin-row-${p.id}`}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-[#101015] border border-white/[0.06] hover:border-white/15 transition-colors"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: p.color }}
                      >
                        <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{p.name}</p>
                        <p className="text-xs text-white/40 truncate">
                          {p.sections.length} section{p.sections.length !== 1 ? "s" : ""}
                          {p.sections.length > 0 && (
                            <span className="text-white/30"> · {p.sections.join(" · ")}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          data-testid={`admin-edit-${p.id}`}
                          onClick={() => setEditing(p)}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          data-testid={`admin-delete-${p.id}`}
                          onClick={() => setToDelete(p)}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {/* Form panel */}
        <section className="lg:col-span-5">
          <div className="lg:sticky lg:top-8">
            {editing ? (
              <ProfileForm
                key={editing === "new" ? "new" : editing.id}
                initial={editing === "new" ? null : editing}
                onClose={() => setEditing(null)}
                onSaved={() => {
                  setEditing(null);
                  refresh();
                }}
              />
            ) : (
              <div
                data-testid="admin-form-empty"
                className="border border-dashed border-white/10 rounded-2xl p-10 text-center"
              >
                <p className="text-white/60 mb-2">Select a profile to edit</p>
                <p className="text-sm text-white/40">…or create a new one.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent
          data-testid="delete-confirm-dialog"
          className="bg-[#0a0a0d] border-white/10 text-white"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete profile?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This will permanently remove "{toDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-testid="delete-cancel-btn"
              className="bg-transparent border-white/15 text-white hover:bg-white/[0.05] hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-confirm-btn"
              onClick={confirmDelete}
              className="bg-[#E11D48] hover:bg-[#be123c] text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
