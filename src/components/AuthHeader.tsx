"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthHeader() {
  const { data: session, status } = useSession();

  return (
    <header style={{
      borderBottom: "1px solid var(--border)",
      padding: "10px 24px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      background: "var(--bg-card)",
    }}>
      <span style={{ fontSize: "1.5rem" }}><img src="/images/unnamed.webp" alt="Descripción" /></span>
      <h1 style={{ fontSize: "1.4rem", color: "var(--gold)" }}>Battlefield Team Builder</h1>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
        {status === "loading" && (
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>...</span>
        )}

        {status === "authenticated" && session?.user && (
          <>
            {session.user.image && (
              <img src={session.user.image} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid var(--border)" }} />
            )}
            <span style={{ fontSize: "0.82rem", color: "var(--text)" }}>{session.user.name}</span>
            <button
              onClick={() => signOut()}
              style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "5px", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "0.8rem", padding: "4px 12px", cursor: "pointer", letterSpacing: "0.04em" }}
            >
              Cerrar sesión
            </button>
          </>
        )}

        {status === "unauthenticated" && (
          <button
            onClick={() => signIn("google")}
            style={{ background: "var(--gold)", border: "none", borderRadius: "5px", color: "#000", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "0.9rem", padding: "6px 18px", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Entrar con Google
          </button>
        )}
      </div>
    </header>
  );
}
