import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { CopyPlus, Utensils, LayoutDashboard } from "lucide-react";
import { cn } from "./lib/utils";
import { useAuth } from "./hooks/useAuth";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

import Dashboard from "./pages/Dashboard";
import Penilaian from "./pages/Penilaian";
import Distribusi from "./pages/Distribusi";

function BottomNav() {
  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/penilaian", icon: Utensils, label: "Penilaian" },
    { to: "/distribusi", icon: CopyPlus, label: "Distribusi" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-100 px-4 pb-safe-area shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-full py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
                isActive
                  ? "text-[#10B981]"
                  : "text-slate-400 hover:text-slate-800"
              )
            }
          >
            <item.icon className="w-5 h-5 mb-1 stroke-[2.5]" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  console.log("[v0] Layout rendered - loading:", loading, "user:", user?.email);

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      setLoginError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-[#1E293B] font-sans pb-24 overflow-x-hidden">
      <header className="bg-white px-6 py-4 sticky top-0 z-40 border-b-4 border-[#4ADE80] shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="bg-[#FF6B35] text-white px-4 py-2 rounded-2xl inline-block rotate-[-2deg] shadow-md">
             <h1 className="text-lg font-black tracking-tighter">SPPG SINDANG 2</h1>
          </div>
          <div>
            {!loading && (
              user ? (
                <button onClick={handleLogout} className="text-[10px] font-bold text-[#FF6B35] tracking-widest uppercase bg-orange-50 px-3 py-2 rounded-xl border-2 border-orange-200 hover:bg-orange-100 transition-colors">
                  Logout
                </button>
              ) : (
                <button onClick={handleLogin} className="text-[10px] font-bold text-[#10B981] tracking-widest uppercase bg-green-50 px-3 py-2 rounded-xl border-2 border-green-200 hover:bg-green-100 transition-colors">
                  Login / Signup
                </button>
              )
            )}
          </div>
        </div>
        {loginError && (
          <div className="max-w-md mx-auto mt-4 p-3 bg-red-100 text-red-700 text-xs rounded-xl font-bold border border-red-200">
            Login Error: {loginError} <br/><br/>
            Pastikan menambahkan domain berikut ke "Authorized domains" di Firebase Console (Authentication &gt; Settings):<br/>
            1. ais-dev-u7myr3ukwh2oe2yse5ja3v-788702615199.asia-east1.run.app<br/>
            2. ais-pre-u7myr3ukwh2oe2yse5ja3v-788702615199.asia-east1.run.app
          </div>
        )}
      </header>
      <main className="max-w-md mx-auto w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/penilaian" element={<Penilaian />} />
          <Route path="/distribusi" element={<Distribusi />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
