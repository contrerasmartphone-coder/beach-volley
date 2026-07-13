import React, { useState, useEffect, useRef } from "react";
import { NotificationLog } from "../types";
import { Bell, X } from "lucide-react";
import { motion } from "motion/react";

interface ToastItemProps {
  toast: NotificationLog;
  onClose: (id: string) => void;
  key?: React.Key;
}

export default function ToastItem({ toast, onClose }: ToastItemProps) {
  const [progress, setProgress] = useState(100);
  const duration = 6500; // 6.5 seconds
  const intervalTime = 50;
  const isHovered = useRef(false);

  useEffect(() => {
    const step = (intervalTime / duration) * 100;
    const interval = setInterval(() => {
      if (!isHovered.current) {
        setProgress((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            onClose(toast.id);
            return 0;
          }
          return prev - step;
        });
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [toast.id, onClose]);

  const getToastStyle = (type: NotificationLog["type"]) => {
    switch (type) {
      case "live_update":
        return {
          bg: "bg-slate-900/95 border-red-500/30 text-white shadow-red-950/20",
          accentBar: "bg-red-500",
          iconColor: "text-red-400 bg-red-950/40 border-red-800/30",
          badge: "bg-red-500/20 text-red-300 border border-red-500/30",
          label: "LIVE 🎙️",
        };
      case "result":
        return {
          bg: "bg-slate-900/95 border-amber-500/30 text-white shadow-amber-950/20",
          accentBar: "bg-amber-500",
          iconColor: "text-amber-400 bg-amber-950/40 border-amber-800/30",
          badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
          label: "RISULTATO 🏆",
        };
      case "schedule_change":
        return {
          bg: "bg-slate-900/95 border-orange-500/30 text-white shadow-orange-950/20",
          accentBar: "bg-orange-500",
          iconColor: "text-orange-400 bg-orange-950/40 border-orange-800/30",
          badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
          label: "ORARIO ⏰",
        };
      case "system":
        return {
          bg: "bg-slate-900/95 border-indigo-500/30 text-white shadow-indigo-950/20",
          accentBar: "bg-indigo-500",
          iconColor: "text-indigo-400 bg-indigo-950/40 border-indigo-800/30",
          badge: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
          label: "AVVISO 🏟️",
        };
      default:
        return {
          bg: "bg-slate-900/95 border-slate-700 text-white shadow-black/40",
          accentBar: "bg-orange-500",
          iconColor: "text-orange-400 bg-slate-850 border-slate-700",
          badge: "bg-slate-800 text-slate-300 border border-slate-700",
          label: "NOTIFICA 🏐",
        };
    }
  };

  const style = getToastStyle(toast.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9, x: 50 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: 100, transition: { duration: 0.2 } }}
      onMouseEnter={() => {
        isHovered.current = true;
      }}
      onMouseLeave={() => {
        isHovered.current = false;
      }}
      className={`pointer-events-auto w-full border rounded-2xl p-4.5 shadow-2xl flex gap-3.5 relative overflow-hidden backdrop-blur-md transition-all ${style.bg}`}
    >
      <div className={`p-2 rounded-xl border h-fit self-start shrink-0 ${style.iconColor}`}>
        <Bell className="w-4 h-4 stroke-[2.5]" />
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase font-sans ${style.badge}`}>
            {style.label}
          </span>
          <span className="text-[9px] font-bold text-slate-400 font-mono">
            {toast.time}
          </span>
        </div>
        <h5 className="font-extrabold text-xs text-white leading-tight mb-1 truncate">
          {toast.title}
        </h5>
        <p className="text-[11px] font-medium text-slate-300 leading-normal line-clamp-3">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onClose(toast.id)}
        className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all cursor-pointer"
        aria-label="Chiudi"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress Bar indicating timeout */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
        <div
          className={`h-full transition-all duration-75 ${style.accentBar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}
