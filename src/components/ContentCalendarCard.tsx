import React, { useState } from "react";
import { ContentDay, SavedCalendar } from "../types";
import { Copy, Check, Calendar, Clock, Sparkles, CheckCircle } from "lucide-react";

interface ContentCalendarCardProps {
  dayInfo: ContentDay;
  productName: string;
  accessToken: string | null;
  onAlert: (msg: string, type: "success" | "error" | "info") => void;
}

export const ContentCalendarCard: React.FC<ContentCalendarCardProps> = ({
  dayInfo,
  productName,
  accessToken,
  onAlert
}) => {
  const { day, theme, visual_concept, caption, hashtags } = dayInfo;
  
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [scheduledDate, setScheduledDate] = useState(() => {
    // Current date plus 'day' offset
    const date = new Date();
    date.setDate(date.getDate() + day);
    return date.toISOString().split("T")[0];
  });
  
  const [calendarLink, setCalendarLink] = useState<string | null>(null);

  // Copy caption to clipboard helper
  const handleCopyCaption = () => {
    const textToCopy = `${caption}\n\n${hashtags.join(" ")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCaption(true);
    onAlert(`Kop teks untuk Hari ${day} berhasil disalin!`, "success");
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  // Schedule to Google Calendar (mutating)
  const handleScheduleEvent = async () => {
    if (!accessToken) {
      onAlert("Koneksi Google telah kedaluwarsa. Silakan masuk kembali.", "error");
      return;
    }

    // Step 3 Confirmation Dialog mandate:
    const confirmMsg = `Yakin ingin menjadwalkan konten Hari ${day} ("${theme}") ke Google Calendar Anda pada tanggal ${scheduledDate} pukul ${scheduledTime}?`;
    const confirmed = window.confirm(confirmMsg);
    if (!confirmed) return;

    setIsScheduling(true);

    try {
      const startDateTimeStr = `${scheduledDate}T${scheduledTime}:00`;
      const startSecs = new Date(startDateTimeStr).getTime();
      
      if (isNaN(startSecs)) {
        throw new Error("Format tanggal atau waktu tidak valid.");
      }

      const endSecs = startSecs + 30 * 60 * 1000; // 30 minutes duration
      const endDateTimeStr = new Date(endSecs).toISOString();
      const startDateTimeISO = new Date(startSecs).toISOString();

      const eventPayload = {
        summary: `[Medsos UMKM] ${productName} - Hari ${day}: ${theme}`,
        description: `📅 PERENCANA KONTEN MEDIA SOSIAL\n\n📌 **Tema:** ${theme}\n\n🎬 **Konsep Visual:**\n${visual_concept}\n\n✍️ **Caption:**\n${caption}\n\n🏷️ **Hashtags:**\n${hashtags.join(" ")}`,
        start: {
          dateTime: startDateTimeISO,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta"
        },
        end: {
          dateTime: endDateTimeStr,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta"
        },
        colorId: "5", // Yellow/Gold calendar event color for Social Media
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 30 }
          ]
        }
      };

      const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(eventPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || "Gagal membuat agenda di Google Calendar.");
      }

      const result = await response.json();
      setCalendarLink(result.htmlLink || "https://calendar.google.com");
      onAlert(`Sukses! Konten Hari ${day} telah dijadwalkan ke Google Calendar Anda!`, "success");
    } catch (error: any) {
      console.error("Calendar scheduling error:", error);
      onAlert(`Gagal menjadwalkan ke Calendar: ${error.message || error}`, "error");
    } finally {
      setIsScheduling(false);
    }
  };

  // Determine badge colors based on theme keywords with bold outlines
  const getThemeBadgeStyle = (themeName: string) => {
    const lowercase = themeName.toLowerCase();
    if (lowercase.includes("edu") || lowercase.includes("tips") || lowercase.includes("manfaat")) {
      return "bg-blue-100 text-blue-800 border-blue-400";
    }
    if (lowercase.includes("promo") || lowercase.includes("sell") || lowercase.includes("diskon") || lowercase.includes("belanja")) {
      return "bg-rose-100 text-rose-800 border-rose-400";
    }
    if (lowercase.includes("behind") || lowercase.includes("proses") || lowercase.includes("dapur") || lowercase.includes("pembuatan")) {
      return "bg-amber-100 text-amber-800 border-amber-400";
    }
    if (lowercase.includes("rekomendasi") || lowercase.includes("testi") || lowercase.includes("review")) {
      return "bg-emerald-100 text-emerald-800 border-emerald-400";
    }
    return "bg-indigo-100 text-indigo-800 border-indigo-400";
  };

  return (
    <div
      id={`content-day-card-${day}`}
      className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Visual Header */}
      <div className="px-6 py-4 bg-slate-50 border-b-2 border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white font-display font-extrabold text-sm border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            {day}
          </span>
          <h3 className="font-display font-extrabold text-gray-900 text-lg">Hari {day}</h3>
        </div>
        <span className={`px-3 py-1 font-sans text-xs font-bold rounded-full border-2 ${getThemeBadgeStyle(theme)}`}>
          {theme}
        </span>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-5">
        {/* Visual Concept Block */}
        <div>
          <h4 className="flex items-center gap-2 font-display text-xs font-extrabold text-slate-800 tracking-wider uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Ide Visual & Audio
          </h4>
          <div className="p-4 bg-slate-50 rounded-xl text-slate-800 font-sans text-sm leading-relaxed border-2 border-slate-200 italic">
            "{visual_concept}"
          </div>
        </div>

        {/* Caption Block */}
        <div id={`caption-section-day-${day}`} className="relative flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-display text-xs font-extrabold text-slate-800 tracking-wider uppercase">
              Teks Caption & CTA
            </h4>
            <button
              onClick={handleCopyCaption}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-white transition px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
            >
              {copiedCaption ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Tersalin
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Salin Caption
                </>
              )}
            </button>
          </div>
          <div className="p-4 bg-white border-2 border-slate-900 rounded-xl text-gray-800 font-sans text-sm leading-relaxed flex-1 whitespace-pre-line text-left shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            {caption}
          </div>
        </div>

        {/* Hashtags */}
        <div>
          <h4 className="font-display text-xs font-extrabold text-slate-800 tracking-wider uppercase mb-2">
            Hashtags
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-slate-50 text-slate-800 border-2 border-slate-950 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-500 hover:text-white transition duration-150"
                onClick={() => {
                  navigator.clipboard.writeText(tag);
                  onAlert(`Salin tagar "${tag}"`, "info");
                }}
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        </div>

        {/* Google Calendar Scheduler Block */}
        <div className="mt-2 pt-5 border-t-2 border-slate-900 flex flex-col gap-3 bg-slate-50/50 -mx-6 -mb-6 p-6">
          <h4 className="flex items-center gap-2 font-display text-xs font-extrabold text-gray-900 uppercase">
            <Calendar className="w-4 h-4 text-slate-900" /> Penjadwalan Google Calendar
          </h4>
          
          {calendarLink ? (
            <div className="p-4 bg-emerald-50 text-emerald-900 border-2 border-emerald-500 rounded-xl flex flex-col gap-2 shadow-[2px_2px_0px_0px_rgba(16,185,129,1)]">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
                <span>Terjadwal pada {scheduledDate} pukul {scheduledTime}!</span>
              </div>
              <a
                href={calendarLink}
                target="_blank"
                referrerPolicy="no-referrer"
                className="text-xs font-extrabold text-emerald-800 underline hover:text-emerald-950 transition-all text-left"
              >
                Buka Acara di Kalender Anda &rarr;
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider text-left">Tanggal</span>
                  <div className="relative">
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs text-gray-800 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider text-left">Waktu Post</span>
                  <div className="relative">
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs text-gray-800 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleScheduleEvent}
                disabled={isScheduling || !accessToken}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 text-white hover:bg-slate-850 active:bg-slate-900 rounded-xl text-xs font-extrabold border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScheduling ? "Menyimpan ke Kalender..." : "Jadwalkan Postingan ke Google Calendar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
