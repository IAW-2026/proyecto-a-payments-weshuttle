"use client";

import { useState } from "react";
import { savePayoutAccountActionClient, deletePayoutAccountActionClient } from "../actions";

type PayoutAccount = {
  id: string;
  accountReference: string;
  alias: string | null;
  status: string;
  provider: string;
};

export function PayoutAccountForm({
  initialAccount,
}: {
  initialAccount: PayoutAccount | null;
}) {
  // Analizar datos iniciales para popular los inputs correspondientemente
  const isRefCbu =
    initialAccount?.accountReference && /^\d{22}$/.test(initialAccount.accountReference);

  const initialCbu = initialAccount
    ? (isRefCbu ? initialAccount.accountReference : "")
    : "";
  const initialAlias = initialAccount
    ? (isRefCbu ? (initialAccount.alias ?? "") : initialAccount.accountReference)
    : "";

  const [cbuCvu, setCbuCvu] = useState(initialCbu);
  const [alias, setAlias] = useState(initialAlias);
  
  // Guardamos los valores confirmados/guardados para poder restaurar en caso de Cancelar
  const [savedCbu, setSavedCbu] = useState(initialCbu);
  const [savedAlias, setSavedAlias] = useState(initialAlias);
  
  const [hasAccount, setHasAccount] = useState(!!initialAccount && initialAccount.status === "ACTIVE");
  const [isEditing, setIsEditing] = useState(!initialAccount || initialAccount.status !== "ACTIVE");

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "dirty" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const hasChanges = cbuCvu !== savedCbu || alias !== savedAlias;

  const handleInputChange = (field: "cbu" | "alias", val: string) => {
    if (field === "cbu") setCbuCvu(val);
    else setAlias(val);

    setStatus("dirty");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCancel = () => {
    // Restaurar a valores guardados
    setCbuCvu(savedCbu);
    setAlias(savedAlias);
    setIsEditing(false);
    setStatus("idle");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCbu = cbuCvu.trim();
    const cleanAlias = alias.trim();

    // 1. Validar que al menos uno exista
    if (!cleanCbu && !cleanAlias) {
      setErrorMsg("Ingresá un CBU/CVU o un alias para poder registrar el método de cobro.");
      setStatus("error");
      return;
    }

    // 2. Validar CBU/CVU si se ingresó
    if (cleanCbu) {
      const is22Digits = /^\d{22}$/.test(cleanCbu);
      if (!is22Digits) {
        setErrorMsg("El CBU/CVU debe tener exactamente 22 números.");
        setStatus("error");
        return;
      }
    }

    // 3. Validar Alias si se ingresó
    if (cleanAlias) {
      if (!/^[a-zA-Z0-9.-]+$/.test(cleanAlias)) {
        setErrorMsg("El alias contiene caracteres inválidos. Solo se permiten letras, números, puntos y guiones.");
        setStatus("error");
        return;
      }
    }

    setStatus("saving");

    try {
      const res = await savePayoutAccountActionClient({ cbuCvu: cleanCbu, alias: cleanAlias });
      if (res.ok) {
        setSuccessMsg(res.message || "Método de cobro guardado correctamente.");
        setSavedCbu(cleanCbu);
        setSavedAlias(cleanAlias);
        setHasAccount(true);
        setIsEditing(false);
        setStatus("saved");
      } else {
        setErrorMsg(res.error || "Error al guardar el método de cobro.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Ocurrió un error inesperado en el servidor.");
      setStatus("error");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Seguro que querés eliminar este método de cobro?")) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setStatus("saving");

    try {
      const res = await deletePayoutAccountActionClient();
      if (res.ok) {
        setCbuCvu("");
        setAlias("");
        setSavedCbu("");
        setSavedAlias("");
        setHasAccount(false);
        setIsEditing(true);
        setSuccessMsg("Método de cobro eliminado correctamente.");
        setStatus("idle");
      } else {
        setErrorMsg(res.error || "Error al eliminar el método de cobro.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Ocurrió un error inesperado al eliminar.");
      setStatus("error");
    }
  };

  // 1. Caso de Cuenta Activa con visualización colapsada (No estamos editando)
  if (hasAccount && !isEditing) {
    return (
      <div className="space-y-6">
        {successMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-600 shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-semibold">{successMsg}</p>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Cuenta activa</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">Esta es la cuenta actual donde se depositan tus ganancias.</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            Activa
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5">
          <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-950">Medio de cobro</dt>
              <dd className="mt-1">Mercado Pago / Banco</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-950">Estado de cuenta</dt>
              <dd className="mt-1">Activa</dd>
            </div>
            {savedCbu && (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-slate-950">CBU/CVU</dt>
                <dd className="mt-1 break-all font-mono">{savedCbu}</dd>
              </div>
            )}
            {savedAlias && (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-slate-950">Nombre de la cuenta (Alias)</dt>
                <dd className="mt-1">{savedAlias}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setStatus("idle");
            }}
            className="flex-1 w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-primary-hover transition cursor-pointer"
          >
            Actualizar método de cobro
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="flex-1 w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
          >
            Eliminar método de cobro
          </button>
        </div>
      </div>
    );
  }

  // 2. Caso de Carga Inicial o Edición Activa
  let buttonText = "Guardar datos de cobro";
  if (status === "saving") {
    buttonText = "Guardando...";
  } else if (status === "saved") {
    buttonText = "Método guardado";
  } else if (status === "dirty" && hasAccount) {
    buttonText = "Guardar cambios";
  }

  const isSaveDisabled =
    status === "saving" ||
    status === "saved" ||
    (status === "idle" && hasAccount && !hasChanges) ||
    (status === "dirty" && !hasChanges);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-rose-600 shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="font-semibold">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Si se eliminó la cuenta y estamos en carga inicial, mostramos el mensaje de éxito aquí arriba */}
      {!hasAccount && successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-600 shrink-0">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="font-semibold">{successMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition duration-200">
        <div>
          <h4 className="text-sm font-bold text-slate-800">Cargar datos bancarios o virtuales</h4>
          <p className="text-xs text-slate-500 mt-1">
            Podés ingresar un CBU/CVU o un alias. No hace falta completar ambos.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">CBU/CVU</span>
          <input
            type="text"
            value={cbuCvu}
            onChange={(e) => handleInputChange("cbu", e.target.value)}
            disabled={status === "saving"}
            placeholder="Ej: 0000003100012345678901"
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-xs outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400 font-mono"
          />
          <span className="text-xs text-slate-400">Ingresá los 22 números de tu CBU/CVU.</span>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Alias bancario o Mercado Pago</span>
          <input
            type="text"
            value={alias}
            onChange={(e) => handleInputChange("alias", e.target.value)}
            disabled={status === "saving"}
            placeholder="Ej: mi.alias.weshuttle"
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-xs outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400"
          />
          <span className="text-xs text-slate-400">Alias de tu banco o de tu cuenta de Mercado Pago.</span>
        </label>

        <div className="mt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSaveDisabled}
            className="flex-1 w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-primary-hover transition disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none cursor-pointer"
          >
            {buttonText}
          </button>

          {/* Botón de Cancelar para volver a ver la cuenta sin cambios */}
          {hasAccount && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={status === "saving"}
              className="flex-1 w-full rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
