import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  initAuth,
  signInWithGoogle,
  logoutUser,
  saveBusinessProfile,
  loadBusinessProfiles,
  saveCalendar,
  loadSavedCalendars,
  deleteCalendarProfile,
  getCachedAccessToken
} from "./firebase";
import { BusinessProfile, ContentDay, SavedCalendar } from "./types";
import { GoogleSignInButton } from "./components/GoogleSignInButton";
import { ContentCalendarCard } from "./components/ContentCalendarCard";
import { SavedPlannerList } from "./components/SavedPlannerList";
import {
  Sparkles,
  Calendar,
  Users,
  MessageSquare,
  Bookmark,
  LogOut,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  Eye,
  CheckCircle,
  TrendingUp,
  Briefcase
} from "lucide-react";

// List of fun, reassuring loading messages during content generation
const LOADING_MESSAGES = [
  "Menganalisis profil produk Anda...",
  "Memilah demografi target audiens...",
  "Memformulasi hook promosi interaktif...",
  "Merancang ide visual Instagram & TikTok...",
  "Menambahkan tagar trending lokal Indonesia...",
  "Menyusun tata bahasa caption terbaik...",
  "Menyelesaikan draf kalender konten 7 hari..."
];

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  // Form states
  const [productName, setProductName] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [businessCategory, setBusinessCategory] = useState("Food & Beverage");
  const [tone, setTone] = useState("Casual & Akrab");

  // App running states
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  // Results & History
  const [generatedCalendar, setGeneratedCalendar] = useState<ContentDay[] | null>(null);
  const [savedCalendars, setSavedCalendars] = useState<SavedCalendar[]>([]);
  const [activeTab, setActiveTab] = useState<"buat" | "arsip">("buat");

  // Toast alert system
  const [alert, setAlert] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const triggerAlert = (message: string, type: "success" | "error" | "info") => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert(null);
    }, 4500);
  };

  // Auth initialization
  useEffect(() => {
    const unsub = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setAuthChecking(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setAuthChecking(false);
      }
    );
    return () => unsub();
  }, []);

  // Fetch histories when user signs in
  useEffect(() => {
    if (user) {
      fetchUserHistory();
    }
  }, [user]);

  // Loading message rotator
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3500);
    } else {
      setLoadingMsgIndex(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const fetchUserHistory = async () => {
    try {
      const plans = await loadSavedCalendars();
      setSavedCalendars(plans);

      // Pre-fill form from the latest saved business profile if exists
      const profiles = await loadBusinessProfiles();
      if (profiles.length > 0) {
        const latestPrf = profiles[0];
        setProductName(latestPrf.productName || "");
        setTargetAudience(latestPrf.targetAudience || "");
        if (latestPrf.businessCategory) setBusinessCategory(latestPrf.businessCategory);
        if (latestPrf.tone) setTone(latestPrf.tone);
      }
    } catch (err) {
      console.error("Gagal meload arsip:", err);
    }
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    setErrorText(null);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        triggerAlert("Selamat datang! Berhasil masuk dengan Google.", "success");
      }
    } catch (err: any) {
      console.error(err);
      setErrorText("Gagal masuk dengan Google. Pastikan mengizinkan pop-up.");
      triggerAlert("Autentikasi gagal.", "error");
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setAccessToken(null);
    setGeneratedCalendar(null);
    setSavedCalendars([]);
    triggerAlert("Berhasil keluar akun.", "info");
  };

  // Generate 7-day content plan securely calling Node.js Express API
  const handleGenerateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !targetAudience.trim()) {
      setErrorText("Nama Produk / Merek dan Target Audiens wajib diisi.");
      return;
    }

    setIsGenerating(true);
    setErrorText(null);
    setGeneratedCalendar(null);

    // Save business profile details in Firestore background so it repopulates next login
    try {
      await saveBusinessProfile({
        id: "active_profile",
        productName: productName.trim(),
        targetAudience: targetAudience.trim(),
        businessCategory,
        tone
      });
    } catch (dbErr) {
      console.error("Gagal menyimpan profil bisnis:", dbErr);
    }

    try {
      const response = await fetch("/api/generate-calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productName,
          targetAudience,
          businessCategory,
          tone
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal membuat rencana konten. Silakan coba sesaat lagi.");
      }

      if (result.success && Array.isArray(result.data)) {
        setGeneratedCalendar(result.data);
        triggerAlert("Rencana konten 7 Hari berhasil dibuat!", "success");
        // Scroll smoothly to results
        setTimeout(() => {
          document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        throw new Error("Format draf kalender tidak disesuaikan dengan benar.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Terdapat kendala jaringan. Silakan hubungi admin.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert currently running draft to saved content planner database
  const handleSaveDraft = async () => {
    if (!generatedCalendar) return;
    try {
      const calendarId = "calendar_" + Date.now();
      await saveCalendar({
        id: calendarId,
        productName: productName.trim(),
        targetAudience: targetAudience.trim(),
        businessCategory,
        tone,
        items: generatedCalendar
      });
      triggerAlert("Kalender konten berhasil disimpan ke Arsip Anda!", "success");
      fetchUserHistory();
    } catch (dbErr: any) {
      console.error(dbErr);
      triggerAlert("Gagal menyimpan draf.", "error");
    }
  };

  const handleSelectHistory = (selected: SavedCalendar) => {
    setProductName(selected.productName);
    setTargetAudience(selected.targetAudience);
    if (selected.businessCategory) setBusinessCategory(selected.businessCategory);
    if (selected.tone) setTone(selected.tone);
    setGeneratedCalendar(selected.items);
    setActiveTab("buat");
    triggerAlert(`Load kalender konten: ${selected.productName}`, "info");
    
    // Scroll smoothly to results
    setTimeout(() => {
      document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteCalendarProfile(id);
      setSavedCalendars((prev) => prev.filter((p) => p.id !== id));
      triggerAlert("Kalender berhasil dihapus.", "success");
    } catch (err) {
      triggerAlert("Gagal menghapus kalender.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 flex flex-col selection:bg-indigo-100 font-sans">
      
      {/* HEADER BAR */}
      <header id="main-header" className="bg-white border-b-4 border-slate-900 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h1 className="font-display font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-none">
                UMKM Social Media Manager
              </h1>
              <p className="font-sans text-[10px] text-gray-500 font-bold tracking-wide uppercase mt-1">
                AI 7-Day Content Planner
              </p>
            </div>
          </div>

          {/* User Profile / Status */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-white pl-3 pr-2 py-1.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 leading-none">{user.displayName || "Admin UMKM"}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5 font-medium">{user.email}</p>
                </div>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Avatar"}
                    className="w-8 h-8 rounded-full border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 border-2 border-slate-900">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>

        </div>
      </header>
 
      {/* BODY CONTENT OVERVIEW */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {authChecking ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-gray-500">Mempersiapkan sistem planner...</p>
          </div>
        ) : !user ? (
          
          /* SIGN-IN LANDING SECTION */
          <div id="welcome-landing" className="max-w-2xl mx-auto py-12 text-center flex flex-col gap-8 justify-center items-center">
            <div className="space-y-4">
              <div className="inline-flex p-3 bg-indigo-100 text-indigo-800 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] mb-2">
                <Calendar className="w-8 h-8" />
              </div>
              <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-slate-900 tracking-tight">
                Kelola Konten Sosial Media UMKM Anda Secara Otomatis
              </h2>
              <p className="text-gray-600 text-sm sm:text-base max-w-lg mx-auto font-semibold leading-relaxed">
                Platform asisten AI yang dirancang khusus untuk memformulasi caption memikat, ide konten visual kreatif, tagar trending lokal, dan integrasi jadwal ke <b>Google Calendar</b> Anda dalam hitungan detik.
              </p>
            </div>

            {/* Auth panel */}
            <div className="bg-white p-8 rounded-3xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] w-full max-w-md flex flex-col gap-6">
              <div className="text-center space-y-1">
                <h3 className="font-display font-extrabold text-slate-900 text-xl">Mulai Sekarang</h3>
                <p className="text-xs text-slate-500 font-bold">Masuk dengan akun Google untuk memulai integrasi kalender Anda.</p>
              </div>

              <GoogleSignInButton onSignIn={handleSignIn} isLoading={signingIn} />

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 border-t-2 border-slate-100 pt-4 font-bold">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Terjamin aman & rahasia melalui Google OAuth</span>
              </div>
            </div>

            {/* Micro Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl mt-6">
              <div className="p-5 bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-2.5 text-left">
                <div className="p-2 bg-pink-100 text-pink-700 rounded-xl w-fit border-2 border-slate-900"><Sparkles className="w-4 h-4" /></div>
                <h4 className="font-display font-bold text-slate-900 text-sm">Automasi Kecerdasan Buatan</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">Mendukung formula penulisan pemasaran bahasa Indonesia, sesuai dengan demografi lokal Anda.</p>
              </div>
              <div className="p-5 bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-2.5 text-left">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl w-fit border-2 border-slate-900"><Calendar className="w-4 h-4" /></div>
                <h4 className="font-display font-bold text-slate-900 text-sm">Penjadwalan Google Sync</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">Hubungkan draf hari demi hari ke Google Calendar utama Anda sebagai alarm pengingat upload.</p>
              </div>
              <div className="p-5 bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-2.5 text-left">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl w-fit border-2 border-slate-900"><Users className="w-4 h-4" /></div>
                <h4 className="font-display font-bold text-slate-900 text-sm">Target Audiens Relevan</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">Optimasi interaksi visual dan promosi produk yang langsung membidik kebutuhan calon konsumen.</p>
              </div>
            </div>

          </div>
        ) : (
          
          /* MAIN SERVICE CONSOLE */
          <div className="flex flex-col gap-8">
            
            {/* TABS SELECTOR */}
            <div id="tabs-dashboard" className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] self-center">
              <button
                onClick={() => setActiveTab("buat")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-150 cursor-pointer ${
                  activeTab === "buat"
                    ? "bg-slate-900 text-white border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Sparkles className="w-4 h-4" /> Buat Kalender Konten
              </button>
              <button
                onClick={() => setActiveTab("arsip")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-150 cursor-pointer ${
                  activeTab === "arsip"
                    ? "bg-slate-900 text-white border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Bookmark className="w-4 h-4" /> Arsip Tersimpan ({savedCalendars.length})
              </button>
            </div>

            {/* TAB CONTENTS 1: BUAT KONTEN */}
            {activeTab === "buat" ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* PROFIL INPUT FORM PANEL */}
                <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-6">
                  
                  <div className="text-left">
                    <h3 className="font-display font-black text-slate-800 text-xl flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-600" /> Profil Produk UMKM
                    </h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">Lengkapi informasi produk Anda agar asisten AI dapat merancang kampanye terbaik.</p>
                  </div>

                  <form onSubmit={handleGenerateCalendar} className="flex flex-col gap-5 text-left">
                    
                    {/* input productName */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="input-product" className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                        Nama Produk / Merek Usaha
                      </label>
                      <input
                        id="input-product"
                        type="text"
                        required
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="Contoh: Kopi Susu Gula Aren, Kripik Tempe Renyah"
                        className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl font-sans text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                      />
                    </div>

                    {/* input targetAudience */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="input-audience" className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                        Target Audiens Konsumen
                      </label>
                      <textarea
                        id="input-audience"
                        required
                        rows={3}
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="Contoh: Mahasiswa, pekerja kantoran muda yang membutuhkan asupan energi di sela-sela aktivitas."
                        className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl font-sans text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition resize-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                      />
                    </div>

                    {/* dropdown businessCategory */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="input-category" className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                        Kategori Bisnis
                      </label>
                      <select
                        id="input-category"
                        value={businessCategory}
                        onChange={(e) => setBusinessCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl font-sans text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                      >
                        <option value="Food & Beverage">Makanan & Minuman (F&B)</option>
                        <option value="Fashion & Apparels">Pakaian & Fashion</option>
                        <option value="Beauty & Personal Care">Kecantikan & Kosmetik</option>
                        <option value="Handicrafts & Home Decor">Kriya, Kerajinan & Dekorasi</option>
                        <option value="Services & Consultancy">Jasa Layanan</option>
                        <option value="Other">Lainnya, Umum</option>
                      </select>
                    </div>

                    {/* dropdown Tone */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="input-tone" className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                        Karakter / Gaya Komunikasi (Tone of Voice)
                      </label>
                      <select
                        id="input-tone"
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl font-sans text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                      >
                        <option value="Casual & Akrab">Akrab, Ramah & Gaul (Casual)</option>
                        <option value="Profesional & Terpercaya">Profesional, Informatif & Meyakinkan</option>
                        <option value="Humoris & Viral">Humoris, Kekinian & Berpotensi Viral</option>
                        <option value="Estetik & Puitis">Estetis, Tenang & Menginspirasi</option>
                        <option value="Persuasif & Hard Selling">Persuasif & Mengajak Belanja Langsung</option>
                      </select>
                    </div>

                    <button
                      id="btn-generate"
                      type="submit"
                      disabled={isGenerating}
                      className="w-full mt-4 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-sans font-black text-sm tracking-wide rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all justify-center items-center flex gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4.5 h-4.5 animate-spin" /> Sedang Mengolah...
                        </>
                      ) : (
                        <>
                          Generasikan Rencana Konten 7-Hari <ArrowRight className="w-4.5 h-4.5" />
                        </>
                      )}
                    </button>

                  </form>

                  {/* General Errors Show */}
                  {errorText ? (
                    <div className="p-4 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl text-xs text-left font-extrabold leading-relaxed">
                      {errorText}
                    </div>
                  ) : null}

                </div>

                {/* VISUAL REPORT AND PLANNER ZONE */}
                <div id="draft-report-pane" className="lg:col-span-7 flex flex-col gap-6">
                  
                  {isGenerating ? (
                    /* BEUTIFUL GENERATING WAIT SCREEN */
                    <div className="bg-white p-12 rounded-3xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col items-center justify-center min-h-[450px] gap-6">
                      <div className="relative flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                        <Sparkles className="w-6 h-6 text-indigo-600 absolute animate-pulse" />
                      </div>
                      
                      <div className="space-y-4 text-center">
                        <h4 className="font-display font-black text-indigo-600 text-lg">Sedang Merancang Campaign Konten Anda</h4>
                        <div className="h-6 overflow-hidden flex items-center justify-center">
                          <p className="text-slate-900 text-sm font-extrabold animate-bounce">
                            {LOADING_MESSAGES[loadingMsgIndex]}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">Gemini AI memformulasi taktik postingan media sosial berdasarkan demografi pembeli terpilih...</p>
                      </div>
                    </div>
                  ) : generatedCalendar ? (
                    
                    /* RESULTS CONTAINER */
                    <div id="results-section" className="flex flex-col gap-6 text-left">
                      
                      <div className="bg-slate-900 text-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-black tracking-wider text-indigo-300">Draf Siap Digunakan</span>
                          <h3 className="font-display font-extrabold text-lg leading-tight">Kalender Konten 7-Hari: {productName}</h3>
                          <p className="text-xs text-slate-400 font-medium">Aransemen tema, ide visual, draf teks promosi mandiri, dan tagar trending.</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveDraft}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-black border-2 border-slate-900 rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5"
                          >
                            <Bookmark className="w-3.5 h-3.5" /> Simpan Ke Arsip
                          </button>
                        </div>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {generatedCalendar.map((day) => (
                          <ContentCalendarCard
                            key={day.day}
                            dayInfo={day}
                            productName={productName}
                            accessToken={accessToken}
                            onAlert={triggerAlert}
                          />
                        ))}
                      </div>

                    </div>
                  ) : (
                    /* BLANK CONTENT VIEW */
                    <div className="bg-white p-12 rounded-3xl border-2 border-slate-900 border-dashed flex flex-col items-center justify-center min-h-[450px] text-center gap-4">
                      <div className="p-4 bg-slate-50 rounded-full text-indigo-600 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                        <Calendar className="w-8 h-8 text-slate-800" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-display font-extrabold text-slate-950 text-lg animate-pulse">Mulai Rencana Konten Medsos</h4>
                        <p className="text-sm text-slate-600 font-bold max-w-sm leading-relaxed">Isi data profil produk di panel formulir sebelah kiri dan klik tombol <b>Generasikan</b> untuk memulai perancangan campaign.</p>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            ) : (
              
              /* TAB CONTENTS 2: ARSIP PLANNERS */
              <div id="vault-archived-section" className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* List of planners in left pane */}
                <div className="md:col-span-12 lg:col-span-5 flex flex-col gap-4">
                  <div className="text-left">
                    <h3 className="font-display font-black text-slate-900 text-lg">Arsip Kalender Konten</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">Draf kampanye promosi terpilih yang pernah Anda buat.</p>
                  </div>

                  <SavedPlannerList
                    planners={savedCalendars}
                    onSelect={handleSelectHistory}
                    onDelete={handleDeleteHistory}
                  />
                </div>

                {/* Welcome instruction on right pane */}
                <div className="md:col-span-12 lg:col-span-7 bg-indigo-50/70 border-2 border-indigo-200 p-8 rounded-3xl text-left flex flex-col gap-4 justify-center shadow-[4px_4px_0px_0px_rgba(99,102,241,1)]">
                  <div className="p-3 bg-white text-indigo-600 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] rounded-2xl w-fit"><FolderOpen className="w-6 h-6" /></div>
                  <h3 className="font-display font-extrabold text-slate-900 text-lg">Cara menggunakan Arsip Kalender</h3>
                  <div className="space-y-3 font-sans text-xs text-slate-700 font-bold leading-relaxed list-decimal pl-4">
                    <p>1. Klik entri di daftar arsip di sebelah kiri untuk melihat rincian rencana 7 hari di tab generator.</p>
                    <p>2. Anda dapat melihat caption lengkap, meng-copy teks kampanye, ataupun menjadwalkannya ulang ke Google Calendar.</p>
                    <p>3. Draf yang dihapus dari Arsip tidak dapat dikembalikan, mohon lakukan dengan teliti.</p>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}
      </main>

      {/* FOOTER BAR */}
      <footer id="main-footer" className="mt-auto bg-white border-t-4 border-slate-900 py-6 text-center text-xs text-slate-600 font-bold font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 UMKM Social Media Manager. Didukung secara penuh oleh Google Gemini AI.</p>
          <div className="flex items-center gap-4 text-slate-650">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-800">Google Calendar Connected via OAuth</span>
            </span>
          </div>
        </div>
      </footer>

      {/* TOAST SYSTEM POPUP */}
      {alert && (
        <div
          id="toast-alert"
          className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 select-none transition-all duration-300 z-50 flex items-center gap-3 animate-slide-in max-w-sm ${
            alert.type === "success"
              ? "bg-emerald-50 text-emerald-950"
              : alert.type === "error"
              ? "bg-red-50 text-red-950"
              : "bg-indigo-50 text-indigo-950"
          }`}
        >
          <CheckCircle className={`w-5 h-5 flex-shrink-0 ${alert.type === "success" ? "text-emerald-700" : alert.type === "error" ? "text-red-700" : "text-indigo-700"}`} />
          <div className="text-left font-sans text-xs font-black leading-relaxed">
            {alert.message}
          </div>
        </div>
      )}

    </div>
  );
}
