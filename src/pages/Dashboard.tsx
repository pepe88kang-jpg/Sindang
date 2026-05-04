import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { Utensils, Truck, Star, TrendingUp } from "lucide-react";

interface PenilaianData {
  id: string;
  rasa: number;
  tekstur: number;
  penampilan: number;
}

interface DistribusiData {
  id: string;
  jumlahPorsi: number;
  sekolah: string;
}

export default function Dashboard() {
  const [totalPorsi, setTotalPorsi] = useState(0);
  const [totalSekolah, setTotalSekolah] = useState(0);
  const [avgRating, setAvgRating] = useState({ rasa: 0, tekstur: 0, penampilan: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const distribusiRef = ref(db, "distribusi");
    const penilaianRef = ref(db, "penilaian");

    let porsiCount = 0;
    const sekolahSet = new Set<string>();

    const unsubDist = onValue(distribusiRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        Object.keys(val).forEach((key) => {
          const item = val[key] as DistribusiData;
          porsiCount += Number(item.jumlahPorsi) || 0;
          if (item.sekolah) sekolahSet.add(item.sekolah);
        });
      }
      setTotalPorsi(porsiCount);
      setTotalSekolah(sekolahSet.size);
      
      // Stop loading if both are checked, simple handling
      setTimeout(() => setLoading(false), 500);
    });

    const unsubPenil = onValue(penilaianRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        let r = 0, t = 0, p = 0;
        const keys = Object.keys(val);
        keys.forEach((key) => {
          const item = val[key] as PenilaianData;
          r += Number(item.rasa) || 0;
          t += Number(item.tekstur) || 0;
          p += Number(item.penampilan) || 0;
        });
        const c = keys.length;
        setAvgRating({
          rasa: r / c,
          tekstur: t / c,
          penampilan: p / c,
          total: (r + t + p) / (3 * c)
        });
      }
    });

    return () => {
      unsubDist();
      unsubPenil();
    };
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Memuat data...</div>;
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      
      {/* Header Info */}
      <header>
        <h2 className="text-3xl font-black text-slate-800">Laporan Harian</h2>
        <p className="text-slate-500 font-medium">Monitoring SPPG Sindang 2 Singalodra</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border-2 border-slate-100 text-center flex flex-col justify-center items-center">
          <span className="block text-4xl font-black text-[#FF6B35] mb-1">{totalPorsi}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Porsi</span>
        </div>
        
        <div className="bg-white p-5 rounded-3xl shadow-sm border-2 border-slate-100 text-center flex flex-col justify-center items-center">
          <span className="block text-4xl font-black text-[#4ADE80] mb-1">{totalSekolah}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sekolah Tujuan</span>
        </div>
      </div>

      {/* Quality Overview */}
      <section className="bg-white rounded-[40px] p-6 shadow-sm border-2 border-slate-100 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800 italic">Kualitas Masakan</h3>
          <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            {avgRating.total > 0 ? avgRating.total.toFixed(1) : '-'} / 5.0
          </span>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <div className="flex justify-between text-[11px] mb-2">
              <span className="text-slate-400 font-bold uppercase tracking-widest">Rasa</span>
              <span className="text-slate-800 font-black text-sm">{avgRating.rasa > 0 ? avgRating.rasa.toFixed(1) : '-'}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-[#4ADE80] h-2 rounded-full transition-all duration-500"
                style={{ width: `${(avgRating.rasa / 5) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <div className="flex justify-between text-[11px] mb-2">
              <span className="text-slate-400 font-bold uppercase tracking-widest">Tekstur</span>
              <span className="text-slate-800 font-black text-sm">{avgRating.tekstur > 0 ? avgRating.tekstur.toFixed(1) : '-'}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-[#FF6B35] h-2 rounded-full transition-all duration-500"
                style={{ width: `${(avgRating.tekstur / 5) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <div className="flex justify-between text-[11px] mb-2">
              <span className="text-slate-400 font-bold uppercase tracking-widest">Penampilan</span>
              <span className="text-slate-800 font-black text-sm">{avgRating.penampilan > 0 ? avgRating.penampilan.toFixed(1) : '-'}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-[#4F46E5] h-2 rounded-full transition-all duration-500"
                style={{ width: `${(avgRating.penampilan / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-2 p-5 bg-[#6366F1] rounded-3xl text-white text-center shadow-lg transform rotate-[1deg]">
         <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2 block">Laporan Real-time</span>
         <div className="text-lg font-black tracking-tight flex items-center justify-center gap-2">
           <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
           Data Tersinkronisasi Otomatis
         </div>
      </div>
      
    </div>
  );
}
