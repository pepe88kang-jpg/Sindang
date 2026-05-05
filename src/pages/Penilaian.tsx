import { useState, useEffect, useRef } from "react";
import { ref, push, onValue, serverTimestamp, remove, update } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { db, storage } from "../firebase";
import { Star, PlusCircle, CheckCircle2, AlertCircle, Camera, X, Trash2, Image, ZoomIn, Edit2 } from "lucide-react";
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
  fotoUrl?: string;
  fotoPath?: string;
}

export default function Penilaian() {
  const { user } = useAuth();
  const [data, setData] = useState<PenilaianData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [menu, setMenu] = useState("");
  const [rasa, setRasa] = useState(0);
  const [tekstur, setTekstur] = useState(0);
  const [penampilan, setPenampilan] = useState(0);
  const [catatan, setCatatan] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [existingFotoUrl, setExistingFotoUrl] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<{type: "success"|"error", text: string} | null>(null);
  
  // Image viewer
  const [viewingImage, setViewingImage] = useState<string | null>(null);

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

  const resetForm = () => {
    setMenu("");
    setRasa(0);
    setTekstur(0);
    setPenampilan(0);
    setCatatan("");
    setFotoFile(null);
    setFotoPreview(null);
    setExistingFotoUrl(null);
    setEditingId(null);
    setShowForm(false);
    setUploadProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Ukuran file maksimal 5MB!" });
        return;
      }
      
      if (!file.type.startsWith("image/")) {
        setMessage({ type: "error", text: "Hanya file gambar yang diperbolehkan!" });
        return;
      }
      
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (item: PenilaianData) => {
    setMenu(item.menu);
    setRasa(item.rasa);
    setTekstur(item.tekstur);
    setPenampilan(item.penampilan);
    setCatatan(item.catatan || "");
    setExistingFotoUrl(item.fotoUrl || null);
    setEditingId(item.id);
    setShowForm(true);
    setFotoFile(null);
    setFotoPreview(null);
  };

  const handleDelete = async (item: PenilaianData) => {
    if (!confirm("Hapus penilaian ini?")) return;
    
    try {
      // Delete photo from storage if exists
      if (item.fotoPath && storage) {
        try {
          const photoRef = storageRef(storage, item.fotoPath);
          await deleteObject(photoRef);
        } catch (e) {
          console.log("Photo already deleted or not found");
        }
      }
      
      await remove(ref(db, `penilaian/${item.id}`));
      setMessage({ type: "success", text: "Penilaian berhasil dihapus!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Gagal menghapus data." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menu || !rasa || !tekstur || !penampilan) {
      setMessage({ type: "error", text: "Mohon lengkapi menu dan semua bintang penilaian!" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    
    try {
      let fotoUrl: string | undefined;
      let fotoPath: string | undefined;
      
      // Upload photo if selected
      if (fotoFile && storage) {
        const fileName = `penilaian/${Date.now()}_${fotoFile.name}`;
        const photoRef = storageRef(storage, fileName);
        
        setUploadProgress(30);
        await uploadBytes(photoRef, fotoFile);
        
        setUploadProgress(70);
        fotoUrl = await getDownloadURL(photoRef);
        fotoPath = fileName;
        
        setUploadProgress(100);
      } else if (existingFotoUrl) {
        // Keep existing photo
        const existingItem = data.find(d => d.id === editingId);
        fotoUrl = existingItem?.fotoUrl;
        fotoPath = existingItem?.fotoPath;
      }

      const penilaianData = {
        tanggal: new Date().toISOString(),
        menu,
        rasa,
        tekstur,
        penampilan,
        catatan,
        timestamp: serverTimestamp(),
        ...(fotoUrl && { fotoUrl }),
        ...(fotoPath && { fotoPath }),
      };

      if (editingId) {
        await update(ref(db, `penilaian/${editingId}`), penilaianData);
        setMessage({ type: "success", text: "Penilaian berhasil diperbarui!" });
      } else {
        await push(ref(db, "penilaian"), penilaianData);
        setMessage({ type: "success", text: "Penilaian berhasil disimpan!" });
      }
      
      resetForm();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving:", error);
      setMessage({ type: "error", text: "Gagal menyimpan data." });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
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
              setValue ? "cursor-pointer transition-colors active:scale-110" : "",
              star <= value ? "fill-amber-400 text-amber-400" : "text-slate-200"
            )}
            onClick={() => setValue && setValue(star)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      
      {/* Header */}
      <header className="bg-gradient-to-br from-amber-500 to-orange-500 p-5 rounded-3xl text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Penilaian Masakan</h2>
            <p className="text-white/80 text-sm">Nilai kualitas makanan hari ini</p>
          </div>
          {user ? (
            <button
              onClick={() => {
                if (showForm) resetForm();
                else setShowForm(true);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                showForm ? "bg-white/20 text-white" : "bg-white text-amber-600 shadow-sm"
              )}
            >
              {showForm ? <X className="w-4 h-4" /> : <><PlusCircle className="w-4 h-4" /> Nilai</>}
            </button>
          ) : (
            <span className="text-[10px] font-bold bg-white/20 px-3 py-2 rounded-xl">
              LOGIN UNTUK MENGISI
            </span>
          )}
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
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-5">
          <h3 className="text-sm font-black text-slate-800">
            {editingId ? "Edit Penilaian" : "Penilaian Baru"}
          </h3>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nama Menu</label>
            <input
              type="text"
              value={menu}
              onChange={(e) => setMenu(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-amber-400 transition-all font-bold text-slate-800"
              placeholder="Contoh: Nasi, Sayur Sop, Ayam Goreng"
            />
          </div>
          
          {/* Photo Upload */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Foto Makanan (Opsional)
            </label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {(fotoPreview || existingFotoUrl) ? (
              <div className="relative">
                <img
                  src={fotoPreview || existingFotoUrl || ""}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-2xl border-2 border-slate-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFotoFile(null);
                    setFotoPreview(null);
                    setExistingFotoUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 text-slate-700 rounded-xl shadow-lg text-xs font-bold flex items-center gap-1"
                >
                  <Camera className="w-3 h-3" /> Ganti
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-amber-400 hover:text-amber-500 transition-colors"
              >
                <Camera className="w-8 h-8" />
                <span className="text-xs font-bold">Tap untuk upload foto</span>
              </button>
            )}
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-center">Mengupload... {uploadProgress}%</p>
              </div>
            )}
          </div>
          
          {/* Rating Stars */}
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
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-amber-400 transition-all font-medium text-slate-800 min-h-[80px]"
              placeholder="Catatan untuk menu ini..."
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
              className="flex-1 py-3 px-4 rounded-2xl shadow-sm font-bold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : editingId ? "Perbarui" : "Simpan"}
            </button>
          </div>
        </div>
      )}

      {/* Riwayat */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-base font-black text-slate-800 mb-4">Riwayat Penilaian</h3>
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
              <Image className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-bold">Belum ada data penilaian</p>
            </div>
          ) : (
            data.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                {/* Photo */}
                {item.fotoUrl && (
                  <div 
                    className="relative mb-3 cursor-pointer group"
                    onClick={() => setViewingImage(item.fotoUrl || null)}
                  >
                    <img
                      src={item.fotoUrl}
                      alt={item.menu}
                      className="w-full h-40 object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-xl flex items-center justify-center">
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-lg text-slate-700">{item.menu}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {format(item.timestamp ? new Date(item.timestamp) : parseISO(item.tanggal), "EEEE, dd MMM yyyy", { locale: id })}
                    </span>
                  </div>
                  
                  {user && (
                    <div className="flex gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 rounded-xl bg-blue-100 text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-2 rounded-xl bg-red-100 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Rating Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-white p-3 rounded-xl text-center shadow-sm border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rasa</p>
                    <div className="flex items-center justify-center gap-1 text-sm font-black text-slate-800">
                      <span>{item.rasa}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl text-center shadow-sm border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tekstur</p>
                    <div className="flex items-center justify-center gap-1 text-sm font-black text-slate-800">
                      <span>{item.tekstur}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl text-center shadow-sm border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tampilan</p>
                    <div className="flex items-center justify-center gap-1 text-sm font-black text-slate-800">
                      <span>{item.penampilan}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </div>
                  </div>
                </div>
                
                {/* Average Rating */}
                <div className="mt-3 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-100 to-orange-100 p-2 rounded-xl">
                  <span className="text-xs font-bold text-amber-700">Rata-rata:</span>
                  <span className="text-lg font-black text-amber-600">
                    {((item.rasa + item.tekstur + item.penampilan) / 3).toFixed(1)}
                  </span>
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
                
                {item.catatan && (
                  <div className="mt-3 bg-white p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Catatan:</p>
                    <p className="text-sm italic font-medium text-slate-600">{item.catatan}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white"
            onClick={() => setViewingImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={viewingImage}
            alt="Foto makanan"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}

    </div>
  );
}
