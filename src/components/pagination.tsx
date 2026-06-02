"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function Pagination({ totalPages }: { totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center gap-3">
      {currentPage > 1 ? (
        <Link
          href={createPageURL(currentPage - 1)}
          className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
        >
          Anterior
        </Link>
      ) : null}
      
      <span className="text-sm text-slate-600">
        Pagina {currentPage} de {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={createPageURL(currentPage + 1)}
          className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
        >
          Siguiente
        </Link>
      ) : null}
    </div>
  );
}
