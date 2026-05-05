import { useState, useEffect } from "react";
import { ref, push, onValue, serverTimestamp, remove, update } from "firebase/database";
import { format, parseISO, isToday, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { id } from "date-fns/locale";
import { db } from "../firebase";
import { SCHOOLS } from "../constants";
import { PlusCircle, CheckCircle2, AlertCircle, Truck, X, Trash2, Edit2, Calendar, Filter, Search, Package } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";

interface DistribusiData {
  id: string;
  tanggal: string;
  sekolah: string;
  jumlahPorsi: number;
  penerima: string;
  catatan?: string;
  timestamp: number;
}

type FilterType = "all" | "today" | "week";

export default function Distribusi() {
  const { user } = useAuth();
  const [data, setData] = useState<DistribusiData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("today");
  
  // Form State
  const [sekolah, setSekolah] = useState("");
  const [jumlahPorsi, setJumlahPorsi] = useState("");
  const [penerima, setPenerima] = useState("");
  const [catatan, setCatatan] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: "success"|"error", text: string} | null>(null);

  useEffect(() => {
    const distribusiRef = ref(db, "distribusi");
    const unsub = onValue(distribusiRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const parsed = Object.keys(val).map((key) => ({
          id: key,
          ...val[key],
        })).sort((a, b) => b.timestamp - a.timestamp);
        setData(parsed);
      } else {
        setData([]);
      }
    });

    return () => unsub();
  }, []);

  const resetForm = () => {
    setSekolah("");
    setJumlahPorsi("");
    setPenerima("");
    setCatatan("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: DistribusiData) => {
    setSekolah(item.sekolah);
    setJumlahPorsi(item.jumlahPorsi.toString());
    setPenerima(item.penerima);
    setCatatan(item.catatan || "");
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, sekolah: string) => {
    if (!confirm(`Hapus distribusi ke "${sekolah}"?`)) return;
    
    try {
      await remove(ref(db, `distribusi/${id}`));
      setMessage({ type: "success", text: "Data distribusi berhasil dihapus!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Gagal menghapus data." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sekolah || !jumlahPorsi || !penerima) {
      setMessage({ type: "error", text: "Mohon lengkapi semua field yang wajib!" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const distribusiData = {
        tanggal: new Date().toISOString(),
        sekolah,
        jumlahPorsi: Number(jumlahPorsi),
        penerima,
        catatan: catatan || "",
        timestamp: serverTimestamp(),
      };

      if (editingId) {
        await update(ref(db, `distribusi/${editingId}`), distribusiData);
        setMessage({ type: "success", text: "Data distribusi berhasil diperbarui!" });
      } else {
        await push(ref(db, "distribusi"), distribusiData);
        setMessage({ type: "success", text: "Data distribusi berhasil disimpan!" });
      }
      
      resetForm();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Gagal menyimpan data." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter data
  const filteredData = data.filter((item) => {
    const itemDate = item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal);
    const now = new Date();
    
    // Search filter
    const matchesSearch = !searchQuery || 
      item.sekolah.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.penerima.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Date filter
    let matchesDate = true;
    if (filterType === "today") {
      matchesDate = isToday(itemDate);
    } else if (filterType === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = itemDate >= weekAgo;
    }
    
    return matchesSearch && matchesDate;
  });

  // Stats
  const todayPorsi = data
    .filter((item) => {
      const itemDate = item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal);
      return isToday(itemDate);
    })
    .reduce((sum, item) => sum + (Number(item.jumlahPorsi) || 0), 0);

  const todaySchools = new Set(
    data
      .filter((item) => {
        const itemDate = item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal);
        return isToday(itemDate);
      })
      .map((item) => item.sekolah)
  ).size;

  return (
    <div className="p-4 flex flex-col gap-4">
      
      {/* Header */}
      <header className="bg-gradient-to-br from-[#10B981] to-[#059669] p-5 rounded-3xl text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Distribusi Makanan</h2>
            <p className="text-white/80 text-sm">Catat pengiriman ke sekolah</p>
          </div>
          {user ? (
            <button
              onClick={() => {
                if (showForm) resetForm();
                else setShowForm(true);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                showForm ? "bg-white/20 text-white" : "bg-white text-[#10B981] shadow-sm"
              )}
            >
              {showForm ? <X className="w-4 h-4" /> : <><PlusCircle className="w-4 h-4" /> Input</>}
            </button>
          ) : (
            <span className="text-[10px] font-bold bg-white/20 px-3 py-2 rounded-xl">
              LOGIN UNTUK MENGISI
            </span>
          )}
        </div>
        
        {/* Today Stats */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-white/20 rounded-xl p-3 text-center">
            <span className="text-2xl font-black">{todayPorsi}</span>
            <span className="block text-[9px] font-bold uppercase tracking-wider opacity-80">Porsi Hari Ini</span>
          </div>
          <div className="flex-1 bg-white/20 rounded-xl p-3 text-center">
            <span className="text-2xl font-black">{todaySchools}</span>
            <span className="block text-[9px] font-bold uppercase tracking-wider opacity-80">Sekolah</span>
          </div>
        </div>
      </header>

      {/* Message */}
      {message && (
        <div className={cn("p-4 rounded-2xl border-2 font-bold text-sm", message.type === "success" ? "bg-green-50 border-green-300 text-green-700" : "bg-red-50 border-red-300 text-red-700")}>
          <div className="flex items-center gap-2">
             {message.type === "success" ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
             <p>{message.text}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && user && (
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-sm font-black text-slate-800">
            {editingId ? "Edit Distribusi" : "Input Distribusi Baru"}
          </h3>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sekolah Tujuan *</label>
            <select
              value={sekolah}
              onChange={(e) => setSekolah(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#10B981] transition-all font-bold text-slate-800"
            >
              <option value="">Pilih Sekolah...</option>
              {SCHOOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Jumlah Porsi *</label>
              <input
                type="number"
                value={jumlahPorsi}
                onChange={(e) => setJumlahPorsi(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#10B981] transition-all font-bold text-slate-800"
                placeholder="150"
                min="1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Penerima *</label>
              <input
                type="text"
                value={penerima}
                onChange={(e) => setPenerima(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#10B981] transition-all font-bold text-slate-800"
                placeholder="Nama penerima"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Catatan (Opsional)</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#10B981] transition-all font-medium text-slate-800 min-h-[60px]"
              placeholder="Catatan tambahan..."
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
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-2xl shadow-sm font-bold text-sm text-white bg-gradient-to-r from-[#10B981] to-[#059669] disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : editingId ? "Perbarui" : "Simpan"}
            </button>
          </div>
        </div>
      )}

      {/* Filter & Search */}
      <section className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari sekolah / penerima..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#10B981]"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          {[
            { value: "today", label: "Hari Ini" },
            { value: "week", label: "7 Hari" },
            { value: "all", label: "Semua" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterType(filter.value as FilterType)}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                filterType === filter.value
                  ? "bg-[#10B981] text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {/* Log List */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-slate-800">Log Distribusi</h3>
          <span className="text-xs text-slate-400 font-medium">{filteredData.length} data</span>
        </div>
        
        <div className="space-y-3">
          {filteredData.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-bold">
                {searchQuery ? "Tidak ada data yang cocok" : "Belum ada data distribusi"}
              </p>
            </div>
          ) : (
            filteredData.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white font-black shrink-0 shadow-sm">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-black text-slate-700 truncate">{item.sekolah}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {format(item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal), "EEE, dd MMM HH:mm", { locale: id })}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[10px] font-bold text-slate-500">{item.penerima}</span>
                  </div>
                  {item.catatan && (
                    <p className="text-xs text-slate-500 mt-1 italic truncate">{item.catatan}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="bg-white shadow-sm border border-slate-200 text-[#FF6B35] px-3 py-1.5 rounded-xl text-sm font-black">
                    {item.jumlahPorsi} <span className="text-[9px] text-slate-400">porsi</span>
                  </div>
                  {user && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 rounded-lg bg-blue-100 text-blue-600"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.sekolah)}
                        className="p-1.5 rounded-lg bg-red-100 text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
