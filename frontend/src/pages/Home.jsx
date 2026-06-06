import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { listProfiles, setProfilePasscode } from "@/lib/api";
import ProfileCard from "@/components/ProfileCard";
import PasscodeDialog from "@/components/PasscodeDialog";

export default function Home() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSuccess = (p, passcode) => {
    sessionStorage.setItem(`mh_profile_${p.id}`, JSON.stringify(p));
    setProfilePasscode(p.id, passcode);
    setSelected(null);
    navigate(`/profile/${p.id}`);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
      {/* Cinematic background vignette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(40,40,60,0.18) 0%, rgba(5,5,8,0) 60%)",
        }}
      />

      {/* Admin gear */}
      <button
        type="button"
        data-testid="admin-login-trigger"
        onClick={() => navigate("/admin")}
        aria-label="Admin panel"
        className="absolute top-6 right-6 w-11 h-11 rounded-full border border-white/10 flex items-center justify-center
                   text-white/40 hover:text-white hover:border-white/30 hover:bg-white/[0.04] transition-colors"
      >
        <Settings className="w-5 h-5" strokeWidth={1.5} />
      </button>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 md:mb-16 z-10"
      >
        <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-white/30 mb-3 font-medium">
          MediaHub
        </p>
        <h1
          data-testid="home-title"
          className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white/90"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Who's tuning in?
        </h1>
      </motion.div>

      <div className="relative z-10 w-full max-w-5xl">
        {loading ? (
          <div className="text-center text-white/30 text-sm" data-testid="home-loading">
            Loading profiles…
          </div>
        ) : profiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
            data-testid="home-empty"
          >
            <p className="text-white/50 mb-4">No profiles yet.</p>
            <button
              type="button"
              data-testid="home-empty-admin-btn"
              onClick={() => navigate("/admin")}
              className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline transition-colors"
            >
              Create one in the admin panel →
            </button>
          </motion.div>
        ) : (
          <div
            data-testid="profile-grid"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 justify-items-center"
          >
            {profiles.map((p, idx) => (
              <ProfileCard key={p.id} profile={p} index={idx} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      <PasscodeDialog
        profile={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
