import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Utensils, LayoutDashboard, FileText, School, Truck, LogOut, LogIn, Menu, X } from "lucide-react";
import { cn } from "./lib/utils";
import { useAuth } from "./hooks/useAuth";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

import Dashboard from "./pages/Dashboard";
import Penilaian from "./pages/Penilaian";
import Distribusi from "./pages/Distribusi";
import Laporan from "./pages/Laporan";
import Sekolah from "./pages/Sekolah";

function BottomNav() {
  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/distribusi", icon: Truck, label: "Distribusi" },
    { to: "/penilaian", icon: Utensils, label: "Penilaian" },
    { to: "/laporan", icon: FileText, label: "Laporan" },
    { to: "/sekolah", icon: School, label: "Sekolah" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 pb-safe-area shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-50">
      <div className="flex justify-between items-center max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center py-2 px-2 text-[9px] font-bold uppercase tracking-wider transition-all min-w-[56px]",
                isActive
                  ? "text-[#10B981]"
                  : "text-slate-400 hover:text-slate-600"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-2 rounded-xl mb-0.5 transition-all",
                  isActive ? "bg-[#10B981]/10" : ""
                )}>
                  <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-2")} />
                </div>
                <span className={cn(isActive ? "font-black" : "font-semibold")}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
      setShowUserMenu(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white px-4 py-3 sticky top-0 z-40 border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-xl flex items-center justify-center shadow-sm">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800 leading-tight">SPPG SINDANG 2</h1>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Monitoring Gizi</p>
            </div>
          </div>
          
          <div className="relative">
            {!loading && (
              user ? (
                <div>
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xs font-bold">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                      </div>
                    )}
                    <Menu className="w-4 h-4 text-slate-500" />
                  </button>
                  
                  {showUserMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowUserMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50">
                        <div className="px-3 py-2 mb-2">
                          <p className="font-bold text-sm text-slate-800 truncate">{user.displayName || "User"}</p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                        <div className="border-t border-slate-100 pt-2">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button 
                  onClick={handleLogin} 
                  className="flex items-center gap-2 text-[10px] font-bold text-white bg-[#10B981] px-4 py-2.5 rounded-xl shadow-sm hover:bg-[#059669] transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              )
            )}
          </div>
        </div>
        
        {loginError && (
          <div className="max-w-lg mx-auto mt-3 p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-100">
            <p className="font-bold mb-1">Login Error:</p>
            <p className="text-[10px]">{loginError}</p>
            <p className="text-[10px] mt-2 text-red-500">
              Pastikan domain telah ditambahkan ke Firebase Auth Settings
            </p>
          </div>
        )}
      </header>
      
      <main className="max-w-lg mx-auto w-full">
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
          <Route path="/laporan" element={<Laporan />} />
          <Route path="/sekolah" element={<Sekolah />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
