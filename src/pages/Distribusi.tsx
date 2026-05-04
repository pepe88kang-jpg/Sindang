import { useState, useEffect } from "react";
import { ref, push, onValue, serverTimestamp } from "firebase/database";
import { format } from "date-fns";
import { db } from "../firebase";
import { SCHOOLS } from "../constants";
import { PlusCircle, CheckCircle2, AlertCircle, Truck } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";

interface DistribusiData {
  id: string;
  tanggal: string;
  sekolah: string;
  jumlahPorsi: number;
  penerima: string;
  timestamp: number;
}

export default function Distribusi() {
  const { user } = useAuth();
  const [data, setData] = useState<DistribusiData[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [sekolah, setSekolah] = useState("");
  const [jumlahPorsi, setJumlahPorsi] = useState("");
  const [penerima, setPenerima] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sekolah || !jumlahPorsi || !penerima) {
      setMessage({ type: 'error', text: 'Mohon lengkapi semua field!' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const distribusiRef = ref(db, "distribusi");
      await push(distribusiRef, {
        tanggal: new Date().toISOString(),
        sekolah,
        jumlahPorsi: Number(jumlahPorsi),
        penerima,
        timestamp: serverTimestamp(),
      });
      setMessage({ type: 'success', text: 'Data distribusi berhasil disimpan!' });
      
      // Reset
      setSekolah("");
      setJumlahPorsi("");
      setPenerima("");
      setShowForm(false);
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Gagal menyimpan data.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 italic">Distribusi Makanan</h2>
        {user ? (
          <button
            onClick={() => setShowForm(!showForm)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors",
              showForm ? "bg-slate-100 text-slate-500" : "bg-[#4F46E5] text-white shadow-sm"
            )}
          >
            {showForm ? "Tutup Form" : <><PlusCircle className="w-4 h-4" /> Distribusi</>}
          </button>
        ) : (
          <span className="text-[10px] font-bold text-[#FF6B35] bg-orange-50 px-3 py-2 rounded-xl border border-orange-200">
            LOGIN UNTUK MENGISI
          </span>
        )}
      </div>

      {message && (
        <div className={cn("p-4 rounded-3xl border-2 font-bold text-sm", message.type === 'success' ? "bg-green-50 border-[#4ADE80] text-green-700" : "bg-red-50 border-red-300 text-red-700")}>
          <div className="flex items-center gap-2">
             {message.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
             <p>{message.text}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-[40px] shadow-sm border-2 border-slate-100 space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sekolah Tujuan</label>
            <select
              value={sekolah}
              onChange={(e) => setSekolah(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#4ADE80] transition-all font-bold text-slate-800"
            >
              <option value="">Pilih Sekolah...</option>
              {SCHOOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Jumlah Porsi</label>
            <input
              type="number"
              value={jumlahPorsi}
              onChange={(e) => setJumlahPorsi(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#4ADE80] transition-all font-bold text-slate-800"
              placeholder="Contoh: 150"
              min="1"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nama Penerima / Supir</label>
            <input
              type="text"
              value={penerima}
              onChange={(e) => setPenerima(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#4ADE80] transition-all font-bold text-slate-800"
              placeholder="Nama yang menerima atau mengirim"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full flex justify-center items-center py-4 px-4 rounded-2xl shadow-sm text-[11px] uppercase tracking-widest font-black text-white bg-[#10B981] hover:bg-[#059669] transition-all disabled:opacity-50 mt-2"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Distribusi"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-[40px] p-6 shadow-sm border-2 border-slate-100 flex flex-col">
        <h3 className="text-xl font-black text-slate-800 italic mb-6">Log Sekolah</h3>
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Belum ada data distribusi.</p>
            </div>
          ) : (
            data.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-[#4ADE80] flex items-center justify-center text-white font-black shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-black text-slate-700 truncate">{item.sekolah}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                    {format(item.timestamp ? new Date(item.timestamp) : new Date(item.tanggal), "dd MMM yyyy, HH:mm")} WIB
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                   <div className="bg-white shadow-sm border border-slate-100 text-[#FF6B35] px-3 py-1.5 rounded-xl text-xs font-black">
                     {item.jumlahPorsi} Porsi
                   </div>
                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.penerima}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
