import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { Utensils, Users, School, Star, TrendingUp, Calendar, ChefHat } from "lucide-react";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { SCHOOLS } from "../constants";

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

interface DistribusiData {
  id: string;
  tanggal: string;
  sekolah: string;
  jumlahPorsi: number;
  penerima: string;
  timestamp: number;
}

const COLORS = ["#10B981", "#FF6B35", "#6366F1", "#F59E0B", "#EC4899", "#8B5CF6", "#14B8A6", "#F97316"];

export default function Dashboard() {
  const [totalPorsi, setTotalPorsi] = useState(0);
  const [totalSekolah, setTotalSekolah] = useState(0);
  const [totalPenilaian, setTotalPenilaian] = useState(0);
  const [avgRating, setAvgRating] = useState({ rasa: 0, tekstur: 0, penampilan: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<{name: string; porsi: number}[]>([]);
  const [schoolDistribution, setSchoolDistribution] = useState<{name: string; value: number}[]>([]);
  const [ratingTrend, setRatingTrend] = useState<{date: string; rating: number}[]>([]);
  const [todayPorsi, setTodayPorsi] = useState(0);
  const [recentMenu, setRecentMenu] = useState<string>("");
  const [distribusiList, setDistribusiList] = useState<DistribusiData[]>([]);

  useEffect(() => {
    const distribusiRef = ref(db, "distribusi");
    const penilaianRef = ref(db, "penilaian");

    const unsubDist = onValue(distribusiRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const items: DistribusiData[] = Object.keys(val).map((key) => ({
          id: key,
          ...val[key],
        }));
        
        setDistribusiList(items.sort((a, b) => b.timestamp - a.timestamp));
        
        // Calculate totals
        let porsiCount = 0;
        const sekolahSet = new Set<string>();
        const today = new Date();
        const todayStr = format(today, "yyyy-MM-dd");
        let todayCount = 0;
        
        // School distribution map
        const schoolMap: Record<string, number> = {};
        
        // Weekly data (last 7 days)
        const weekMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = subDays(today, i);
          weekMap[format(d, "yyyy-MM-dd")] = 0;
        }
        
        items.forEach((item) => {
          const itemPorsi = Number(item.jumlahPorsi) || 0;
          porsiCount += itemPorsi;
          if (item.sekolah) {
            sekolahSet.add(item.sekolah);
            schoolMap[item.sekolah] = (schoolMap[item.sekolah] || 0) + itemPorsi;
          }
          
          // Check for today
          const itemDate = item.timestamp ? format(new Date(item.timestamp), "yyyy-MM-dd") : item.tanggal?.substring(0, 10);
          if (itemDate === todayStr) {
            todayCount += itemPorsi;
          }
          
          // Weekly data
          if (weekMap[itemDate] !== undefined) {
            weekMap[itemDate] += itemPorsi;
          }
        });
        
        setTotalPorsi(porsiCount);
        setTotalSekolah(sekolahSet.size);
        setTodayPorsi(todayCount);
        
        // Set school distribution
        const schoolDist = Object.entries(schoolMap)
          .map(([name, value]) => ({ name: name.replace("SDN ", "").replace("SD ", "").replace("TK ", ""), value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);
        setSchoolDistribution(schoolDist);
        
        // Set weekly data
        const weeklyArr = Object.entries(weekMap).map(([date, porsi]) => ({
          name: format(parseISO(date), "EEE", { locale: id }),
          porsi
        }));
        setWeeklyData(weeklyArr);
      } else {
        setTotalPorsi(0);
        setTotalSekolah(0);
        setTodayPorsi(0);
        setSchoolDistribution([]);
        setWeeklyData([]);
        setDistribusiList([]);
      }
    });

    const unsubPenil = onValue(penilaianRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const items: PenilaianData[] = Object.keys(val).map((key) => ({
          id: key,
          ...val[key],
        })).sort((a, b) => b.timestamp - a.timestamp);
        
        setTotalPenilaian(items.length);
        
        // Get recent menu
        if (items.length > 0) {
          setRecentMenu(items[0].menu);
        }
        
        let r = 0, t = 0, p = 0;
        items.forEach((item) => {
          r += Number(item.rasa) || 0;
          t += Number(item.tekstur) || 0;
          p += Number(item.penampilan) || 0;
        });
        
        const c = items.length;
        setAvgRating({
          rasa: c > 0 ? r / c : 0,
          tekstur: c > 0 ? t / c : 0,
          penampilan: c > 0 ? p / c : 0,
          total: c > 0 ? (r + t + p) / (3 * c) : 0
        });
        
        // Rating trend (last 7 entries)
        const trendData = items.slice(0, 7).reverse().map((item) => ({
          date: format(item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal), "dd/MM"),
          rating: ((item.rasa + item.tekstur + item.penampilan) / 3)
        }));
        setRatingTrend(trendData);
      } else {
        setTotalPenilaian(0);
        setAvgRating({ rasa: 0, tekstur: 0, penampilan: 0, total: 0 });
        setRatingTrend([]);
        setRecentMenu("");
      }
      
      setLoading(false);
    });

    return () => {
      unsubDist();
      unsubPenil();
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-bold">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      
      {/* Header Info */}
      <header className="bg-gradient-to-br from-[#10B981] to-[#059669] p-5 rounded-3xl text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-5 h-5" />
          <span className="text-sm font-medium opacity-90">
            {format(new Date(), "EEEE, dd MMMM yyyy", { locale: id })}
          </span>
        </div>
        <h2 className="text-2xl font-black">Dashboard Monitoring</h2>
        <p className="text-white/80 text-sm">Program Makan Siang Gratis - SPPG Sindang 2</p>
        
        {recentMenu && (
          <div className="mt-4 bg-white/20 rounded-2xl p-3 flex items-center gap-3">
            <ChefHat className="w-5 h-5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Menu Terakhir</p>
              <p className="font-bold text-sm">{recentMenu}</p>
            </div>
          </div>
        )}
      </header>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <Utensils className="w-8 h-8 text-[#FF6B35] p-1.5 bg-orange-100 rounded-xl" />
            <span className="text-[9px] font-bold uppercase text-slate-400">Hari Ini</span>
          </div>
          <span className="text-3xl font-black text-slate-800">{todayPorsi}</span>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Porsi</span>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-[#10B981] p-1.5 bg-green-100 rounded-xl" />
            <span className="text-[9px] font-bold uppercase text-slate-400">Total</span>
          </div>
          <span className="text-3xl font-black text-slate-800">{totalPorsi.toLocaleString()}</span>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Porsi</span>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <School className="w-8 h-8 text-[#6366F1] p-1.5 bg-indigo-100 rounded-xl" />
          </div>
          <span className="text-3xl font-black text-slate-800">{totalSekolah}</span>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sekolah</span>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-8 h-8 text-amber-500 p-1.5 bg-amber-100 rounded-xl" />
          </div>
          <span className="text-3xl font-black text-slate-800">{avgRating.total > 0 ? avgRating.total.toFixed(1) : "-"}</span>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rating</span>
        </div>
      </div>

      {/* Weekly Distribution Chart */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-base font-black text-slate-800 mb-4">Distribusi Mingguan</h3>
        <div className="h-[180px]">
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#fff", 
                    border: "1px solid #e2e8f0", 
                    borderRadius: "12px",
                    fontSize: "12px"
                  }}
                  formatter={(value: number) => [`${value} Porsi`, "Distribusi"]}
                />
                <Bar dataKey="porsi" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Belum ada data
            </div>
          )}
        </div>
      </section>

      {/* Quality Overview */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-black text-slate-800">Kualitas Masakan</h3>
          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            {avgRating.total > 0 ? avgRating.total.toFixed(1) : "-"} / 5.0
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 w-20">Rasa</span>
            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#10B981] to-[#34D399] h-full rounded-full transition-all duration-500"
                style={{ width: `${(avgRating.rasa / 5) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs font-black text-slate-700 w-8 text-right">{avgRating.rasa > 0 ? avgRating.rasa.toFixed(1) : "-"}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 w-20">Tekstur</span>
            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#FF6B35] to-[#FB923C] h-full rounded-full transition-all duration-500"
                style={{ width: `${(avgRating.tekstur / 5) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs font-black text-slate-700 w-8 text-right">{avgRating.tekstur > 0 ? avgRating.tekstur.toFixed(1) : "-"}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 w-20">Penampilan</span>
            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#6366F1] to-[#818CF8] h-full rounded-full transition-all duration-500"
                style={{ width: `${(avgRating.penampilan / 5) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs font-black text-slate-700 w-8 text-right">{avgRating.penampilan > 0 ? avgRating.penampilan.toFixed(1) : "-"}</span>
          </div>
        </div>
        
        {/* Rating Trend */}
        {ratingTrend.length > 1 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 mb-3">Tren Rating</h4>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ratingTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#fff", 
                      border: "1px solid #e2e8f0", 
                      borderRadius: "12px",
                      fontSize: "11px"
                    }}
                    formatter={(value: number) => [value.toFixed(1), "Rating"]}
                  />
                  <Line type="monotone" dataKey="rating" stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981", strokeWidth: 0, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* School Distribution */}
      {schoolDistribution.length > 0 && (
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-base font-black text-slate-800 mb-4">Distribusi per Sekolah</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={schoolDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {schoolDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#fff", 
                    border: "1px solid #e2e8f0", 
                    borderRadius: "12px",
                    fontSize: "11px"
                  }}
                  formatter={(value: number) => [`${value} Porsi`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {schoolDistribution.slice(0, 6).map((school, index) => (
              <div key={school.name} className="flex items-center gap-2 text-xs">
                <div 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-slate-600 truncate">{school.name}</span>
                <span className="text-slate-400 ml-auto">{school.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-base font-black text-slate-800 mb-4">Aktivitas Terbaru</h3>
        <div className="space-y-3">
          {distribusiList.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Belum ada aktivitas
            </div>
          ) : (
            distribusiList.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center text-white shrink-0">
                  <Utensils className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">{item.sekolah}</p>
                  <p className="text-[10px] text-slate-400">
                    {format(item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal), "dd MMM, HH:mm")}
                  </p>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-sm font-black text-[#FF6B35]">{item.jumlahPorsi}</span>
                  <span className="text-[9px] text-slate-400 ml-1">porsi</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Sync Status */}
      <div className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-2xl p-4 text-white text-center shadow-lg">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-sm font-bold">Data Tersinkronisasi Real-time</span>
        </div>
      </div>
      
    </div>
  );
}
