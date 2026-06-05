import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import ProfileShell from "@/pages/ProfileShell";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";

const Page = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    className="min-h-screen"
  >
    {children}
  </motion.div>
);

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname.split("/")[1] || "home"}>
        <Route path="/" element={<Page><Home /></Page>} />
        <Route path="/profile/:id" element={<Page><ProfileShell /></Page>} />
        <Route path="/admin" element={<Page><AdminLogin /></Page>} />
        <Route path="/admin/dashboard" element={<Page><AdminDashboard /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <div className="App min-h-screen bg-[#050507] text-white" data-testid="app-root">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#101015",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      />
    </div>
  );
}
