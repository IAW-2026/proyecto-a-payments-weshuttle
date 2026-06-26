/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { SignInButton, SignOutButton, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function HeaderAuthButtons() {
  const { isSignedIn } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render space-matching placeholder to prevent layout shifts
    return <div className="h-9 w-28 bg-slate-100/50 animate-pulse rounded-lg" />;
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/post-login"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98]"
        >
          Ir a la App
        </Link>
        <SignOutButton redirectUrl="/">
          <button className="rounded-lg border border-primary/20 bg-white px-5 py-2 text-sm font-semibold text-primary shadow-sm transition-all duration-200 hover:bg-primary/5 hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
            Cerrar Sesión
          </button>
        </SignOutButton>
      </div>
    );
  }

  return (
    <SignInButton forceRedirectUrl="/post-login">
      <button className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
        Iniciar Sesión
      </button>
    </SignInButton>
  );
}

export function HeroAuthButton() {
  const { isSignedIn } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isSignedIn) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-4">
      <SignInButton forceRedirectUrl="/post-login">
        <button className="rounded-lg bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
          Comenzar Ahora
        </button>
      </SignInButton>
    </div>
  );
}
