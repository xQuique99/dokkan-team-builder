"use client";

import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim().length < 2) return;
    onSearch(value.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", gap: "10px", marginBottom: "24px" }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Busca un personaje... (ej: Goku, Vegeta, Frieza)"
        style={{
          flex: 1,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "10px 16px",
          color: "var(--text)",
          fontSize: "0.95rem",
          fontFamily: "inherit",
          outline: "none",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) =>
          (e.target.style.borderColor = "var(--gold)")
        }
        onBlur={(e) =>
          (e.target.style.borderColor = "var(--border)")
        }
      />
      <button
        type="submit"
        disabled={loading || value.trim().length < 2}
        style={{
          background: loading ? "var(--bg-surface)" : "var(--gold)",
          color: loading ? "var(--text-muted)" : "#000",
          border: "none",
          borderRadius: "6px",
          padding: "10px 24px",
          fontFamily: "Rajdhani, sans-serif",
          fontWeight: 700,
          fontSize: "1rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background 0.2s",
        }}
      >
        {loading ? "Buscando..." : "Buscar"}
      </button>
    </form>
  );
}
