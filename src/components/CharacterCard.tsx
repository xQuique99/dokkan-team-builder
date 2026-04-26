"use client";

import { DokkanCharacter } from "../types/dokkan";

interface CharacterCardProps {
  character: DokkanCharacter;
  onAdd?: (character: DokkanCharacter) => void;
  added?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  AGL: "#5BA8E5",
  TEQ: "#52C27D",
  INT: "#9B6FD4",
  STR: "#E05C5C",
  PHY: "#CC8B3C",
};

export default function CharacterCard({
  character,
  onAdd,
  added,
}: CharacterCardProps) {
  const typeColor = TYPE_COLORS[character.type] ?? "#888";

  return (
    <div
      className="card"
      style={{
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        position: "relative",
        borderColor: added ? "var(--gold)" : undefined,
      }}
    >
      {/* Rareza + Tipo */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <span
          style={{
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 700,
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            color: "#000",
            background: "var(--gold)",
            padding: "1px 7px",
            borderRadius: "3px",
          }}
        >
          {character.rarity}
        </span>
        <span
          style={{
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 700,
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            color: typeColor,
            background: `${typeColor}22`,
            padding: "1px 7px",
            borderRadius: "3px",
          }}
        >
          {character.type}
        </span>
      </div>

      {/* Nombre y título */}
      <div>
        <p
          style={{
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            color: "var(--text)",
            lineHeight: 1.2,
          }}
        >
          {character.name}
        </p>
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--gold)",
            fontStyle: "italic",
            marginTop: "2px",
          }}
        >
          {character.title}
        </p>
      </div>

      {/* Categorías */}
      {character.categories?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {character.categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              style={{
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                background: "var(--bg-surface)",
                padding: "1px 6px",
                borderRadius: "3px",
                border: "1px solid var(--border)",
              }}
            >
              {cat}
            </span>
          ))}
          {character.categories.length > 3 && (
            <span
              style={{
                fontSize: "0.68rem",
                color: "var(--text-muted)",
              }}
            >
              +{character.categories.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Links */}
      {character.links?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {character.links.slice(0, 3).map((link) => (
            <span
              key={link}
              style={{
                fontSize: "0.68rem",
                color: "#5BA8E5",
                background: "rgba(91,168,229,0.08)",
                padding: "1px 6px",
                borderRadius: "3px",
                border: "1px solid rgba(91,168,229,0.2)",
              }}
            >
              ⚡ {link}
            </span>
          ))}
          {character.links.length > 3 && (
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              +{character.links.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Botón añadir */}
      {onAdd && (
        <button
          onClick={() => onAdd(character)}
          disabled={added}
          style={{
            marginTop: "4px",
            background: added ? "var(--bg-surface)" : "transparent",
            border: `1px solid ${added ? "var(--gold)" : "var(--border)"}`,
            borderRadius: "5px",
            color: added ? "var(--gold)" : "var(--text-muted)",
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 600,
            fontSize: "0.82rem",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "6px",
            cursor: added ? "default" : "pointer",
            transition: "all 0.2s",
            width: "100%",
          }}
        >
          {added ? "✓ En el equipo" : "+ Añadir al equipo"}
        </button>
      )}
    </div>
  );
}
