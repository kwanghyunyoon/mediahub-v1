import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import ProfileShell from "@/pages/ProfileShell";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";

export default function App() {
  return (
    <div className="App min-h-screen bg-[#050507] text-white" data-testid="app-root">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile/:id" element={<ProfileShell />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
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
