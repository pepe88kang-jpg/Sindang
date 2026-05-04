import { useState, useEffect } from "react";
import { ref, push, onValue, serverTimestamp } from "firebase/database";
import { format } from "date-fns";
import { db } from "../firebase";
import { Star, PlusCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";

interface PenilaianData {
  id: string;
  tanggal: string;
  menu: string;
  rasa: number;
  tekstur: number;
  penampilan: number;
  catatan: string;
  timestamp: number;
}

export default function Penilaian() {
  const { user } = useAuth();
  const [data, setData] = useState<PenilaianData[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [menu, setMenu] = useState("");
  const [rasa, setRasa] = useState(0);
  const [tekstur, setTekstur] = useState(0);
  const [penampilan, setPenampilan] = useState(0);
  const [catatan, setCatatan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    const penilaianRef = ref(db, "penilaian");
    const unsub = onValue(penilaianRef, (snapshot) => {
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
    if (!menu || !rasa || !tekstur || !penampilan) {
      setMessage({ type: 'error', text: 'Mohon lengkapi menu dan semua bintang penilaian!' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const penilaianRef = ref(db, "penilaian");
      await push(penilaianRef, {
        tanggal: new Date().toISOString(),
        menu,
        rasa,
        tekstur,
        penampilan,
        catatan,
        timestamp: serverTimestamp(),
      });
      setMessage({ type: 'success', text: 'Penilaian berhasil disimpan!' });
      
      // Reset
      setMenu("");
      setRasa(0);
      setTekstur(0);
      setPenampilan(0);
      setCatatan("");
      setShowForm(false);
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Gagal menyimpan data.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (value: number, setValue?: (val: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-8 h-8",
              setValue ? "cursor-pointer transition-colors" : "",
              star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
            onClick={() => setValue && setValue(star)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 italic">Penilaian Masakan</h2>
        {user ? (
          <button
            onClick={() => setShowForm(!showForm)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors",
              showForm ? "bg-slate-100 text-slate-500" : "bg-[#4F46E5] text-white shadow-sm"
            )}
          >
            {showForm ? "Tutup Form" : <><PlusCircle className="w-4 h-4" /> Nilai Baru</>}
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
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nama Menu</label>
            <input
              type="text"
              value={menu}
              onChange={(e) => setMenu(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#4ADE80] transition-all font-bold text-slate-800"
              placeholder="Contoh: Nasi, Sayur Sop, Ayam"
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Rasa</label>
              {renderStars(rasa, setRasa)}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tekstur</label>
              {renderStars(tekstur, setTekstur)}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Penampilan</label>
              {renderStars(penampilan, setPenampilan)}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Catatan (Opsional)</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-[#4ADE80] transition-all font-bold text-slate-800 min-h-[100px]"
              placeholder="Catatan untuk menu ini..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full flex justify-center items-center py-4 px-4 rounded-2xl shadow-sm text-[11px] uppercase tracking-widest font-black text-white bg-[#10B981] hover:bg-[#059669] transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Penilaian"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-[40px] p-6 shadow-sm border-2 border-slate-100 flex flex-col">
        <h3 className="text-xl font-black text-slate-800 italic mb-6">Riwayat Penilaian</h3>
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Belum ada data penilaian.</p>
            </div>
          ) : (
            data.map((item) => (
              <div key={item.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-lg text-slate-700">{item.menu}</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {format(item.timestamp ? new Date(item.timestamp) : new Date(item.tanggal), "dd MMM yyyy")}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white p-3 rounded-2xl text-center shadow-sm border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rasa</p>
                    <div className="flex items-center justify-center gap-1 text-sm font-black text-slate-800">
                      <span>{item.rasa}</span>
                      <Star className="w-3 h-3 fill-[#FF6B35] text-[#FF6B35]" />
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl text-center shadow-sm border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tekstur</p>
                    <div className="flex items-center justify-center gap-1 text-sm font-black text-slate-800">
                      <span>{item.tekstur}</span>
                      <Star className="w-3 h-3 fill-[#FF6B35] text-[#FF6B35]" />
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl text-center shadow-sm border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tampilan</p>
                    <div className="flex items-center justify-center gap-1 text-sm font-black text-slate-800">
                      <span>{item.penampilan}</span>
                      <Star className="w-3 h-3 fill-[#FF6B35] text-[#FF6B35]" />
                    </div>
                  </div>
                </div>
                
                {item.catatan && (
                  <div className="mt-1 bg-[#F0FDF4] p-4 rounded-2xl border border-[#4ADE80] border-dashed">
                    <p className="text-[10px] font-bold text-[#166534] uppercase tracking-widest mb-1">Catatan:</p>
                    <p className="text-sm italic font-medium text-slate-700">"{item.catatan}"</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
