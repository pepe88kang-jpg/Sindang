import { useState, useEffect } from "react";
import { ref, onValue, push, remove, update, serverTimestamp } from "firebase/database";
import { db } from "../firebase";
import { SCHOOLS } from "../constants";
import { School, Plus, Trash2, Edit2, Users, MapPin, Phone, Save, X, Search, ChevronRight, Utensils } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";

interface SekolahData {
  id: string;
  nama: string;
  alamat: string;
  kontak: string;
  jumlahSiswa: number;
  jenjang: "TK" | "KB" | "SD" | "SMP" | "SMA" | "MTS" | "MA";
  timestamp: number;
}

interface DistribusiData {
  sekolah: string;
  jumlahPorsi: number;
}

const JENJANG_OPTIONS = [
  { value: "KB", label: "KB (Kelompok Bermain)" },
  { value: "TK", label: "TK (Taman Kanak-kanak)" },
  { value: "SD", label: "SD (Sekolah Dasar)" },
  { value: "MTS", label: "MTS (Madrasah Tsanawiyah)" },
  { value: "SMP", label: "SMP (Sekolah Menengah Pertama)" },
  { value: "MA", label: "MA (Madrasah Aliyah)" },
  { value: "SMA", label: "SMA (Sekolah Menengah Atas)" },
];

const JENJANG_COLORS: Record<string, string> = {
  KB: "bg-pink-100 text-pink-700",
  TK: "bg-purple-100 text-purple-700",
  SD: "bg-blue-100 text-blue-700",
  MTS: "bg-teal-100 text-teal-700",
  SMP: "bg-green-100 text-green-700",
  MA: "bg-amber-100 text-amber-700",
  SMA: "bg-orange-100 text-orange-700",
};

export default function Sekolah() {
  const { user } = useAuth();
  const [sekolahList, setSekolahList] = useState<SekolahData[]>([]);
  const [distribusiStats, setDistribusiStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJenjang, setSelectedJenjang] = useState<string>("");
  
  // Form state
  const [formData, setFormData] = useState({
    nama: "",
    alamat: "",
    kontak: "",
    jumlahSiswa: "",
    jenjang: "SD" as SekolahData["jenjang"],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: "success" | "error"; text: string} | null>(null);

  useEffect(() => {
    const sekolahRef = ref(db, "sekolah");
    const distribusiRef = ref(db, "distribusi");

    const unsubSekolah = onValue(sekolahRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const items = Object.keys(val).map((key) => ({
          id: key,
          ...val[key],
        })).sort((a, b) => a.nama.localeCompare(b.nama));
        setSekolahList(items);
      } else {
        // Initialize with default schools
        const defaultSchools: Omit<SekolahData, "id">[] = SCHOOLS.map((name) => {
          let jenjang: SekolahData["jenjang"] = "SD";
          if (name.startsWith("TK") || name.includes("TK ")) jenjang = "TK";
          else if (name.startsWith("KB") || name.includes("KB ")) jenjang = "KB";
          else if (name.startsWith("SMP") || name.includes("SMP ")) jenjang = "SMP";
          else if (name.startsWith("SMA") || name.includes("SMA ")) jenjang = "SMA";
          else if (name.startsWith("MTS") || name.includes("MTS")) jenjang = "MTS";
          else if (name.startsWith("MA") || name.includes("MA ")) jenjang = "MA";
          
          return {
            nama: name,
            alamat: "Kec. Sindang, Kab. Indramayu",
            kontak: "-",
            jumlahSiswa: 0,
            jenjang,
            timestamp: Date.now(),
          };
        });
        
        // Only set empty list, don't auto-create
        setSekolahList([]);
      }
      setLoading(false);
    });

    const unsubDistribusi = onValue(distribusiRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const stats: Record<string, number> = {};
        Object.values(val).forEach((item: any) => {
          if (item.sekolah) {
            stats[item.sekolah] = (stats[item.sekolah] || 0) + (Number(item.jumlahPorsi) || 0);
          }
        });
        setDistribusiStats(stats);
      }
    });

    return () => {
      unsubSekolah();
      unsubDistribusi();
    };
  }, []);

  const resetForm = () => {
    setFormData({
      nama: "",
      alamat: "",
      kontak: "",
      jumlahSiswa: "",
      jenjang: "SD",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (sekolah: SekolahData) => {
    setFormData({
      nama: sekolah.nama,
      alamat: sekolah.alamat,
      kontak: sekolah.kontak,
      jumlahSiswa: sekolah.jumlahSiswa.toString(),
      jenjang: sekolah.jenjang,
    });
    setEditingId(sekolah.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      setMessage({ type: "error", text: "Nama sekolah harus diisi!" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    
    try {
      const data = {
        nama: formData.nama.trim(),
        alamat: formData.alamat.trim() || "-",
        kontak: formData.kontak.trim() || "-",
        jumlahSiswa: Number(formData.jumlahSiswa) || 0,
        jenjang: formData.jenjang,
        timestamp: serverTimestamp(),
      };

      if (editingId) {
        await update(ref(db, `sekolah/${editingId}`), data);
        setMessage({ type: "success", text: "Data sekolah berhasil diperbarui!" });
      } else {
        await push(ref(db, "sekolah"), data);
        setMessage({ type: "success", text: "Sekolah baru berhasil ditambahkan!" });
      }
      
      resetForm();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Gagal menyimpan data." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus sekolah "${nama}"?`)) return;
    
    try {
      await remove(ref(db, `sekolah/${id}`));
      setMessage({ type: "success", text: "Sekolah berhasil dihapus!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Gagal menghapus data." });
    }
  };

  const initializeDefaultSchools = async () => {
    if (!confirm("Tambahkan semua sekolah dari daftar default?")) return;
    
    setIsSubmitting(true);
    try {
      for (const name of SCHOOLS) {
        let jenjang: SekolahData["jenjang"] = "SD";
        if (name.startsWith("TK") || name.includes("TK ")) jenjang = "TK";
        else if (name.startsWith("KB") || name.includes("KB ")) jenjang = "KB";
        else if (name.startsWith("SMP") || name.includes("SMP ")) jenjang = "SMP";
        else if (name.startsWith("SMA") || name.includes("SMA ")) jenjang = "SMA";
        else if (name.startsWith("MTS") || name.includes("MTS")) jenjang = "MTS";
        else if (name.startsWith("MA") || name.includes("MA ")) jenjang = "MA";
        
        await push(ref(db, "sekolah"), {
          nama: name,
          alamat: "Kec. Sindang, Kab. Indramayu",
          kontak: "-",
          jumlahSiswa: 0,
          jenjang,
          timestamp: serverTimestamp(),
        });
      }
      setMessage({ type: "success", text: "Semua sekolah berhasil ditambahkan!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Gagal menambahkan sekolah." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter sekolah
  const filteredSekolah = sekolahList.filter((sekolah) => {
    const matchesSearch = sekolah.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          sekolah.alamat.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJenjang = !selectedJenjang || sekolah.jenjang === selectedJenjang;
    return matchesSearch && matchesJenjang;
  });

  // Calculate totals
  const totalSiswa = sekolahList.reduce((sum, s) => sum + s.jumlahSiswa, 0);
  const totalPorsi = Object.values(distribusiStats).reduce((sum, v) => sum + v, 0);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-bold">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      
      {/* Header */}
      <header className="bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] p-5 rounded-3xl text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <School className="w-6 h-6" />
          <h2 className="text-xl font-black">Manajemen Sekolah</h2>
        </div>
        <p className="text-white/80 text-sm">Kelola daftar sekolah penerima makan siang gratis</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
          <School className="w-5 h-5 text-[#6366F1] mx-auto mb-1" />
          <span className="text-lg font-black text-slate-800">{sekolahList.length}</span>
          <span className="block text-[9px] font-bold text-slate-400 uppercase">Sekolah</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
          <Users className="w-5 h-5 text-[#10B981] mx-auto mb-1" />
          <span className="text-lg font-black text-slate-800">{totalSiswa.toLocaleString()}</span>
          <span className="block text-[9px] font-bold text-slate-400 uppercase">Siswa</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
          <Utensils className="w-5 h-5 text-[#FF6B35] mx-auto mb-1" />
          <span className="text-lg font-black text-slate-800">{totalPorsi.toLocaleString()}</span>
          <span className="block text-[9px] font-bold text-slate-400 uppercase">Porsi</span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={cn(
          "p-4 rounded-2xl border-2 font-bold text-sm",
          message.type === "success" 
            ? "bg-green-50 border-green-300 text-green-700" 
            : "bg-red-50 border-red-300 text-red-700"
        )}>
          {message.text}
        </div>
      )}

      {/* Search & Filter */}
      <section className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari sekolah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#6366F1]"
            />
          </div>
          {user && (
            <button
              onClick={() => setShowForm(!showForm)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                showForm 
                  ? "bg-slate-100 text-slate-500" 
                  : "bg-[#6366F1] text-white shadow-sm"
              )}
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          )}
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          <button
            onClick={() => setSelectedJenjang("")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-all",
              !selectedJenjang ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"
            )}
          >
            Semua
          </button>
          {JENJANG_OPTIONS.map((j) => (
            <button
              key={j.value}
              onClick={() => setSelectedJenjang(j.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-all",
                selectedJenjang === j.value 
                  ? "bg-slate-800 text-white" 
                  : "bg-slate-100 text-slate-500"
              )}
            >
              {j.value}
            </button>
          ))}
        </div>
      </section>

      {/* Form */}
      {showForm && user && (
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-800 mb-4">
            {editingId ? "Edit Sekolah" : "Tambah Sekolah Baru"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Nama Sekolah *
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#6366F1] transition-all font-bold text-slate-800"
                placeholder="Contoh: SDN 1 Sindang"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Jenjang
                </label>
                <select
                  value={formData.jenjang}
                  onChange={(e) => setFormData(prev => ({ ...prev, jenjang: e.target.value as SekolahData["jenjang"] }))}
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#6366F1] transition-all font-bold text-slate-800"
                >
                  {JENJANG_OPTIONS.map((j) => (
                    <option key={j.value} value={j.value}>{j.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Jumlah Siswa
                </label>
                <input
                  type="number"
                  value={formData.jumlahSiswa}
                  onChange={(e) => setFormData(prev => ({ ...prev, jumlahSiswa: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#6366F1] transition-all font-bold text-slate-800"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Alamat
              </label>
              <input
                type="text"
                value={formData.alamat}
                onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#6366F1] transition-all font-bold text-slate-800"
                placeholder="Alamat sekolah"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Kontak
              </label>
              <input
                type="text"
                value={formData.kontak}
                onChange={(e) => setFormData(prev => ({ ...prev, kontak: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#6366F1] transition-all font-bold text-slate-800"
                placeholder="Nomor telepon atau email"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 text-slate-500 font-bold text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#6366F1] text-white font-bold text-sm shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? "Menyimpan..." : editingId ? "Perbarui" : "Simpan"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Initialize Button */}
      {sekolahList.length === 0 && user && (
        <button
          onClick={initializeDefaultSchools}
          disabled={isSubmitting}
          className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-bold text-sm shadow-lg disabled:opacity-50"
        >
          {isSubmitting ? "Menambahkan..." : "Tambahkan Sekolah Default"}
        </button>
      )}

      {/* School List */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-800 mb-4">
          Daftar Sekolah ({filteredSekolah.length})
        </h3>
        <div className="space-y-3">
          {filteredSekolah.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              {searchQuery || selectedJenjang ? "Tidak ada sekolah yang cocok" : "Belum ada data sekolah"}
            </div>
          ) : (
            filteredSekolah.map((sekolah) => (
              <div key={sekolah.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase",
                        JENJANG_COLORS[sekolah.jenjang] || "bg-slate-100 text-slate-600"
                      )}>
                        {sekolah.jenjang}
                      </span>
                      <h4 className="font-black text-slate-800 truncate">{sekolah.nama}</h4>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {sekolah.jumlahSiswa} siswa
                      </span>
                      <span className="flex items-center gap-1">
                        <Utensils className="w-3 h-3" />
                        {distribusiStats[sekolah.nama] || 0} porsi
                      </span>
                    </div>
                    
                    {sekolah.alamat && sekolah.alamat !== "-" && (
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{sekolah.alamat}</span>
                      </p>
                    )}
                  </div>
                  
                  {user && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(sekolah)}
                        className="p-2 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sekolah.id, sekolah.nama)}
                        className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-amber-700 font-medium">
            Login untuk menambah atau mengedit data sekolah
          </p>
        </div>
      )}

    </div>
  );
}
