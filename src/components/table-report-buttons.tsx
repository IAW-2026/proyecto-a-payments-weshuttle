"use client";

import { useState } from "react";

type ReportType = "pdf" | "xlsx";

export function TableReportButtons({
  role,
  section,
}: {
  role: "admin" | "rider" | "driver";
  section: string;
}) {
  const [downloading, setDownloading] = useState<ReportType | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleDownload = async (type: ReportType) => {
    setDownloading(type);
    setStatus("Generando...");

    try {
      const response = await fetch(`/api/reports/${role}/${section}?format=${type}`);

      if (!response.ok) {
        if (response.status === 404 || response.status === 204) {
          setStatus("Sin datos.");
        } else {
          setStatus("Error.");
        }
        setDownloading(null);
        setTimeout(() => setStatus(null), 3000);
        return;
      }

      const contentDisposition = response.headers.get("content-disposition");
      let filename = `reporte-${role}-${section}.${type}`;
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus("Descargado.");
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus("Error.");
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {status ? (
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg select-none">
          {status}
        </span>
      ) : null}

      {/* PDF Icon Button */}
      <button
        type="button"
        title="Exportar tabla a PDF"
        onClick={() => handleDownload("pdf")}
        disabled={downloading !== null}
        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
          downloading === "pdf"
            ? "border-rose-300 bg-rose-50 text-rose-600 animate-pulse"
            : "border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50/20 hover:text-rose-600"
        }`}
      >
        {downloading === "pdf" ? (
          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {/* Excel Icon Button */}
      <button
        type="button"
        title="Exportar tabla a Excel"
        onClick={() => handleDownload("xlsx")}
        disabled={downloading !== null}
        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
          downloading === "xlsx"
            ? "border-emerald-300 bg-emerald-50 text-emerald-600 animate-pulse"
            : "border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/20 hover:text-emerald-600"
        }`}
      >
        {downloading === "xlsx" ? (
          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
