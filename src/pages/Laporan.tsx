import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { FileText, Download, Filter, Calendar, FileSpreadsheet, TrendingUp, School, Utensils, Star } from "lucide-react";
import { cn } from "../lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface PenilaianData {
  id: string;
  tanggal: string;
  menu: string;
  rasa: number;
  tekstur: number;
  penampilan: number;
  catatan: string;
  timestamp: number;
  fotoUrl?: string;
}

interface DistribusiData {
  id: string;
  tanggal: string;
  sekolah: string;
  jumlahPorsi: number;
  penerima: string;
  timestamp: number;
}

type ReportType = "distribusi" | "penilaian" | "ringkasan";
type DateFilter = "all" | "today" | "week" | "month" | "custom";

export default function Laporan() {
  const [reportType, setReportType] = useState<ReportType>("ringkasan");
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const [distribusiData, setDistribusiData] = useState<DistribusiData[]>([]);
  const [penilaianData, setPenilaianData] = useState<PenilaianData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");

  useEffect(() => {
    const distribusiRef = ref(db, "distribusi");
    const penilaianRef = ref(db, "penilaian");

    const unsubDist = onValue(distribusiRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const items = Object.keys(val).map((key) => ({
          id: key,
          ...val[key],
        })).sort((a, b) => b.timestamp - a.timestamp);
        setDistribusiData(items);
      } else {
        setDistribusiData([]);
      }
    });

    const unsubPenil = onValue(penilaianRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const items = Object.keys(val).map((key) => ({
          id: key,
          ...val[key],
        })).sort((a, b) => b.timestamp - a.timestamp);
        setPenilaianData(items);
      } else {
        setPenilaianData([]);
      }
      setLoading(false);
    });

    return () => {
      unsubDist();
      unsubPenil();
    };
  }, []);

  const getFilteredData = <T extends { tanggal: string; timestamp?: number }>(data: T[]): T[] => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return data.filter((item) => {
      const itemDate = item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal);
      
      switch (dateFilter) {
        case "today":
          return itemDate >= todayStart;
        case "week":
          return itemDate >= weekStart;
        case "month":
          return isWithinInterval(itemDate, { start: monthStart, end: monthEnd });
        case "custom":
          if (customDateStart && customDateEnd) {
            const start = parseISO(customDateStart);
            const end = parseISO(customDateEnd);
            end.setHours(23, 59, 59, 999);
            return itemDate >= start && itemDate <= end;
          }
          return true;
        default:
          return true;
      }
    });
  };

  const filteredDistribusi = getFilteredData(distribusiData);
  const filteredPenilaian = getFilteredData(penilaianData);

  // Calculate stats
  const totalPorsi = filteredDistribusi.reduce((sum, item) => sum + (Number(item.jumlahPorsi) || 0), 0);
  const uniqueSchools = new Set(filteredDistribusi.map(item => item.sekolah)).size;
  const avgRating = filteredPenilaian.length > 0 
    ? filteredPenilaian.reduce((sum, item) => sum + (item.rasa + item.tekstur + item.penampilan) / 3, 0) / filteredPenilaian.length
    : 0;

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN SPPG SINDANG 2", pageWidth / 2, 18, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Program Makan Siang Gratis - Monitoring Gizi", pageWidth / 2, 28, { align: "center" });
      doc.text(`Periode: ${getFilterLabel()}`, pageWidth / 2, 35, { align: "center" });
      
      let yPos = 50;
      
      // Summary Stats
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Ringkasan", 14, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Porsi Terdistribusi: ${totalPorsi.toLocaleString()} porsi`, 14, yPos);
      yPos += 7;
      doc.text(`Jumlah Sekolah: ${uniqueSchools} sekolah`, 14, yPos);
      yPos += 7;
      doc.text(`Rata-rata Rating Kualitas: ${avgRating > 0 ? avgRating.toFixed(2) : "-"} / 5.0`, 14, yPos);
      yPos += 7;
      doc.text(`Total Penilaian: ${filteredPenilaian.length} entri`, 14, yPos);
      yPos += 15;

      if (reportType === "distribusi" || reportType === "ringkasan") {
        // Distribusi Table
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Data Distribusi", 14, yPos);
        yPos += 5;
        
        const distribusiRows = filteredDistribusi.map(item => [
          format(item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal), "dd/MM/yyyy HH:mm"),
          item.sekolah,
          item.jumlahPorsi.toString(),
          item.penerima
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [["Tanggal", "Sekolah", "Jumlah Porsi", "Penerima"]],
          body: distribusiRows,
          theme: "striped",
          headStyles: { fillColor: [16, 185, 129], textColor: 255 },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      if (reportType === "penilaian" || reportType === "ringkasan") {
        // Check if need new page
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }
        
        // Penilaian Table
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Data Penilaian Masakan", 14, yPos);
        yPos += 5;
        
        const penilaianRows = filteredPenilaian.map(item => [
          format(item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal), "dd/MM/yyyy"),
          item.menu,
          item.rasa.toString(),
          item.tekstur.toString(),
          item.penampilan.toString(),
          ((item.rasa + item.tekstur + item.penampilan) / 3).toFixed(1)
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [["Tanggal", "Menu", "Rasa", "Tekstur", "Penampilan", "Rata-rata"]],
          body: penilaianRows,
          theme: "striped",
          headStyles: { fillColor: [255, 107, 53], textColor: 255 },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Dicetak pada: ${format(new Date(), "dd MMMM yyyy, HH:mm", { locale: id })} - Halaman ${i} dari ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      doc.save(`Laporan_SPPG_Sindang2_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Gagal membuat PDF. Silakan coba lagi.");
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ["LAPORAN SPPG SINDANG 2"],
        ["Program Makan Siang Gratis - Monitoring Gizi"],
        [""],
        ["Periode:", getFilterLabel()],
        ["Tanggal Export:", format(new Date(), "dd MMMM yyyy, HH:mm", { locale: id })],
        [""],
        ["RINGKASAN"],
        ["Total Porsi Terdistribusi", totalPorsi],
        ["Jumlah Sekolah", uniqueSchools],
        ["Rata-rata Rating", avgRating > 0 ? avgRating.toFixed(2) : "-"],
        ["Total Penilaian", filteredPenilaian.length],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Ringkasan");

      // Distribusi sheet
      if (reportType === "distribusi" || reportType === "ringkasan") {
        const distribusiHeaders = ["No", "Tanggal", "Waktu", "Sekolah", "Jumlah Porsi", "Penerima"];
        const distribusiRows = filteredDistribusi.map((item, index) => {
          const date = item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal);
          return [
            index + 1,
            format(date, "dd/MM/yyyy"),
            format(date, "HH:mm"),
            item.sekolah,
            item.jumlahPorsi,
            item.penerima
          ];
        });
        const distribusiWs = XLSX.utils.aoa_to_sheet([distribusiHeaders, ...distribusiRows]);
        XLSX.utils.book_append_sheet(wb, distribusiWs, "Distribusi");
      }

      // Penilaian sheet
      if (reportType === "penilaian" || reportType === "ringkasan") {
        const penilaianHeaders = ["No", "Tanggal", "Menu", "Rasa", "Tekstur", "Penampilan", "Rata-rata", "Catatan"];
        const penilaianRows = filteredPenilaian.map((item, index) => {
          const date = item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal);
          return [
            index + 1,
            format(date, "dd/MM/yyyy"),
            item.menu,
            item.rasa,
            item.tekstur,
            item.penampilan,
            ((item.rasa + item.tekstur + item.penampilan) / 3).toFixed(1),
            item.catatan || "-"
          ];
        });
        const penilaianWs = XLSX.utils.aoa_to_sheet([penilaianHeaders, ...penilaianRows]);
        XLSX.utils.book_append_sheet(wb, penilaianWs, "Penilaian");
      }

      // Per-school summary
      const schoolSummary: Record<string, number> = {};
      filteredDistribusi.forEach(item => {
        schoolSummary[item.sekolah] = (schoolSummary[item.sekolah] || 0) + item.jumlahPorsi;
      });
      
      const schoolHeaders = ["No", "Sekolah", "Total Porsi"];
      const schoolRows = Object.entries(schoolSummary)
        .sort((a, b) => b[1] - a[1])
        .map(([school, porsi], index) => [index + 1, school, porsi]);
      const schoolWs = XLSX.utils.aoa_to_sheet([schoolHeaders, ...schoolRows]);
      XLSX.utils.book_append_sheet(wb, schoolWs, "Per Sekolah");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(blob, `Laporan_SPPG_Sindang2_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Gagal membuat Excel. Silakan coba lagi.");
    } finally {
      setExporting(false);
    }
  };

  const getFilterLabel = (): string => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return format(now, "dd MMMM yyyy", { locale: id });
      case "week":
        return "7 Hari Terakhir";
      case "month":
        return format(now, "MMMM yyyy", { locale: id });
      case "custom":
        if (customDateStart && customDateEnd) {
          return `${format(parseISO(customDateStart), "dd/MM/yy")} - ${format(parseISO(customDateEnd), "dd/MM/yy")}`;
        }
        return "Custom";
      default:
        return "Semua Data";
    }
  };

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
      
      {/* Header */}
      <header className="bg-gradient-to-br from-[#FF6B35] to-[#F97316] p-5 rounded-3xl text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6" />
          <h2 className="text-xl font-black">Laporan & Export</h2>
        </div>
        <p className="text-white/80 text-sm">Generate laporan dalam format PDF atau Excel</p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
          <Utensils className="w-5 h-5 text-[#10B981] mx-auto mb-1" />
          <span className="text-lg font-black text-slate-800">{totalPorsi.toLocaleString()}</span>
          <span className="block text-[9px] font-bold text-slate-400 uppercase">Porsi</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
          <School className="w-5 h-5 text-[#6366F1] mx-auto mb-1" />
          <span className="text-lg font-black text-slate-800">{uniqueSchools}</span>
          <span className="block text-[9px] font-bold text-slate-400 uppercase">Sekolah</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
          <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <span className="text-lg font-black text-slate-800">{avgRating > 0 ? avgRating.toFixed(1) : "-"}</span>
          <span className="block text-[9px] font-bold text-slate-400 uppercase">Rating</span>
        </div>
      </div>

      {/* Report Type Selection */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-black text-slate-800">Jenis Laporan</h3>
        </div>
        <div className="flex gap-2">
          {[
            { value: "ringkasan", label: "Ringkasan" },
            { value: "distribusi", label: "Distribusi" },
            { value: "penilaian", label: "Penilaian" },
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => setReportType(type.value as ReportType)}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                reportType === type.value
                  ? "bg-[#10B981] text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      {/* Date Filter */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-black text-slate-800">Filter Periode</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { value: "all", label: "Semua" },
            { value: "today", label: "Hari Ini" },
            { value: "week", label: "7 Hari" },
            { value: "month", label: "Bulan Ini" },
            { value: "custom", label: "Custom" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setDateFilter(filter.value as DateFilter)}
              className={cn(
                "py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                dateFilter === filter.value
                  ? "bg-[#FF6B35] text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        
        {dateFilter === "custom" && (
          <div className="flex gap-2 mt-3">
            <div className="flex-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Dari</label>
              <input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Sampai</label>
              <input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium"
              />
            </div>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500">
            <span className="font-bold">Periode:</span> {getFilterLabel()}
          </p>
          <p className="text-xs text-slate-500">
            <span className="font-bold">Data:</span> {filteredDistribusi.length} distribusi, {filteredPenilaian.length} penilaian
          </p>
        </div>
      </section>

      {/* Export Buttons */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-800 mb-4">Export Laporan</h3>
        <div className="flex gap-3">
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-red-500 text-white font-bold text-sm shadow-sm hover:bg-red-600 transition-all disabled:opacity-50"
          >
            <FileText className="w-5 h-5" />
            <span>{exporting ? "Memproses..." : "PDF"}</span>
          </button>
          <button
            onClick={exportToExcel}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-green-600 text-white font-bold text-sm shadow-sm hover:bg-green-700 transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>{exporting ? "Memproses..." : "Excel"}</span>
          </button>
        </div>
      </section>

      {/* Preview Data */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-800 mb-4">Preview Data</h3>
        
        {(reportType === "distribusi" || reportType === "ringkasan") && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Distribusi Terbaru</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {filteredDistribusi.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm">
                  <div>
                    <p className="font-bold text-slate-700">{item.sekolah}</p>
                    <p className="text-[10px] text-slate-400">
                      {format(item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal), "dd/MM/yy HH:mm")}
                    </p>
                  </div>
                  <span className="font-black text-[#FF6B35]">{item.jumlahPorsi} porsi</span>
                </div>
              ))}
              {filteredDistribusi.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">Tidak ada data</p>
              )}
            </div>
          </div>
        )}
        
        {(reportType === "penilaian" || reportType === "ringkasan") && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Penilaian Terbaru</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {filteredPenilaian.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm">
                  <div>
                    <p className="font-bold text-slate-700">{item.menu}</p>
                    <p className="text-[10px] text-slate-400">
                      {format(item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal), "dd/MM/yy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="font-black text-slate-700">
                      {((item.rasa + item.tekstur + item.penampilan) / 3).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
              {filteredPenilaian.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">Tidak ada data</p>
              )}
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
