import React, { useState } from "react";
import { SavedCalendar } from "../types";
import { Calendar, Trash2, ArrowUpRight, FolderOpen } from "lucide-react";

interface SavedPlannerListProps {
  planners: SavedCalendar[];
  onSelect: (planner: SavedCalendar) => void;
  onDelete: (id: string) => void;
}

export const SavedPlannerList: React.FC<SavedPlannerListProps> = ({ planners, onSelect, onDelete }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteClick = async (event: React.MouseEvent, id: string, name: string) => {
    event.stopPropagation();
    // Required confirmation dialog for mutating operations per task guidelines
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus kalender konten tersimpan untuk "${name}"? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  if (planners.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="font-sans font-medium text-gray-500 text-sm">Belum ada kalender konten yang disimpan.</p>
        <p className="font-sans text-xs text-gray-400 mt-1">Isi formulir pendaftaran produk dan buat rancangan kalender media sosial Anda sekarang!</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {planners.map((p) => (
        <div
          key={p.id}
          onClick={() => onSelect(p)}
          className="group relative bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col gap-2 text-left"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-display font-extrabold text-slate-900 text-base leading-tight group-hover:text-indigo-600 transition">
                {p.productName}
              </h4>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                Target: <span className="text-slate-800 font-medium">{p.targetAudience}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                disabled={deletingId === p.id}
                onClick={(e) => handleDeleteClick(e, p.id, p.productName)}
                className="p-2 rounded-xl border-2 border-slate-900 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition cursor-pointer disabled:opacity-50"
                title="Hapus Kalender"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="p-2 rounded-xl border-2 border-slate-900 bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition duration-200">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t-2 border-slate-100 text-xs text-slate-500">
            <span className="font-extrabold bg-indigo-100 text-indigo-900 px-2.5 py-1 rounded-md border border-indigo-200">
              {p.businessCategory || "Umum"}
            </span>
            <div className="flex items-center gap-1 font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDate(p.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
