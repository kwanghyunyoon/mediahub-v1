import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import Keypad from "@/components/Keypad";
import { verifyAdmin, setAdminPasscode } from "@/lib/api";

export default function AdminLogin() {
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (code) => {
    if (busy) return;
    setBusy(true);
    try {
      await verifyAdmin(code);
      setAdminPasscode(code);
      navigate("/admin/dashboard");
    } catch {
      setErrorKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative">
      <button
        type="button"
        data-testid="admin-back-home"
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-colors"
        aria-label="Back to home"
      >
        <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-full bg-[#E11D48]/15 border border-[#E11D48]/40 flex items-center justify-center mb-5">
          <ShieldAlert className="w-7 h-7 text-[#E11D48]" strokeWidth={1.5} />
        </div>
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 mb-2 font-medium">
          Master Access
        </p>
        <h1
          data-testid="admin-login-title"
          className="text-2xl md:text-3xl font-light tracking-tight text-white/90 mb-10"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Admin Panel
        </h1>

        <Keypad
          accentColor="#E11D48"
          onSubmit={handleSubmit}
          errorKey={errorKey}
          testIdPrefix="admin-keypad"
        />
      </motion.div>
    </div>
  );
}
