"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import SearchBar from "../components/SearchBar";
import AuthHeader from "../components/AuthHeader";

const API_BASE = "https://api.dokkan-simulator.com/api";
const PER_PAGE = 30;
const NUM_TEAMS = 11;
const SLOTS_PER_TEAM = 7;

export interface ApiCard {
  id: string;
  name: string | null;
  title: string | null;
  rarity: string;
  type: string;
  category_names: string | null;
  category_ids: string | null;
  link_names: string | null;
  leader_skill: string | null;
  assets: string[];
  release_date: string | null; 
}

interface DokkanCategory {
  id: number;
  name: string;
  file: string;
}

const TYPE_COLOR: Record<string, string> = {
  SUPER_AGL: "#5BA8E5", SUPER_TEQ: "#52C27D", SUPER_INT: "#9B6FD4",
  SUPER_STR: "#E05C5C", SUPER_PHY: "#CC8B3C",
  EXTREME_AGL: "#5BA8E5", EXTREME_TEQ: "#52C27D", EXTREME_INT: "#9B6FD4",
  EXTREME_STR: "#E05C5C", EXTREME_PHY: "#CC8B3C",
};

function typeLabel(type: string) {
  const [cls, t] = type.split("_");
  return `${cls === "SUPER" ? "SUP" : "EXT"} ${t}`;
}

function getThumb(card: ApiCard): string | null {
  const thumb = card.assets.find((a) => a.includes("_thumb"));
  if (!thumb) return null;
  return `${API_BASE}/assets/${thumb.replace("/api/assets/", "")}`;
}

function parseList(str: string | null): string[] {
  if (!str) return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

let allCardsCache: ApiCard[] | null = null;

async function fetchAllCards(): Promise<ApiCard[]> {
  if (allCardsCache) return allCardsCache;
  const first = await fetch(`${API_BASE}/cards?limit=100&page=1`);
  const firstJson = await first.json();
  const totalPages: number = firstJson.totalPages;
  const responses = await Promise.all(
    Array.from({ length: totalPages }, (_, i) =>
      fetch(`${API_BASE}/cards?limit=100&page=${i + 1}`).then((r) => r.json())
    )
  );
  const all = responses.flatMap((r) => r.data ?? []).filter((c: ApiCard) => c.name);
  const seen = new Set<string>();
  allCardsCache = all
    .filter((c: ApiCard) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .sort((a: ApiCard, b: ApiCard) => {
      const dateA = (a as any).release_date ? new Date((a as any).release_date).getTime() : 0;
      const dateB = (b as any).release_date ? new Date((b as any).release_date).getTime() : 0;
      return dateB - dateA;
    });
  return allCardsCache;
}

type Teams = ApiCard[][];
const SLOT_LABELS = ["Líder", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6", "Slot 7"];
const RARITIES = ["LR", "UR", "SSR", "SR"];

export default function HomePage() {
  const { data: session, status } = useSession();
  const [teams, setTeams] = useState<Teams>(Array.from({ length: NUM_TEAMS }, () => []));
  const [teamNames, setTeamNames] = useState<string[]>(
    Array.from({ length: NUM_TEAMS }, (_, i) => `Equipo ${i + 1}`)
  );
  const [editingName, setEditingName] = useState<number | null>(null);
  const [activeTeam, setActiveTeam] = useState(0);
  const [results, setResults] = useState<ApiCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [rarityFilter, setRarityFilter] = useState<string[]>([]);
  const [preloading, setPreloading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [allCategories, setAllCategories] = useState<DokkanCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAllCards().then(() => setPreloading(false));
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/battlefield")
      .then((r) => r.json())
      .then((data) => {
        if (data.teams) setTeams(data.teams);
        if (data.teamNames) setTeamNames(data.teamNames);
      })
      .catch(() => {});
  }, [status]);

  const autoSave = useCallback(async () => {
    if (status !== "authenticated") return;
    setSaving(true);
    try {
      await fetch("/api/battlefield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams, teamNames }),
      });
      setSaveMsg("✓ Guardado");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch {
      setSaveMsg("Error al guardar");
    } finally {
      setSaving(false);
    }
  }, [teams, teamNames, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(autoSave, 2000);
  }, [teams, teamNames]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const allUsedIds = new Set(teams.flatMap((t) => t.map((c) => c.id)));
  const currentTeam = teams[activeTeam];

  async function loadCategoriesIfNeeded() {
    if (allCategories.length > 0) return;
    const res = await fetch(`${API_BASE}/categories`);
    const json = await res.json();
    setAllCategories(json.data ?? []);
  }

  async function handleSearch(query: string) {
    setLoading(true);
    setError(null);
    setSearched(true);
    setPage(1);
    setRarityFilter([]);
    try {
      const all = await fetchAllCards();
      const q = query.toLowerCase();
      let filtered = q
        ? all.filter((c) => c.name && c.name.toLowerCase().includes(q))
        : all;
      if (selectedCategories.length > 0) {
        const selectedIds = selectedCategories
          .map((name) => allCategories.find((c) => c.name === name)?.id)
          .filter(Boolean) as number[];
        const detailed = await Promise.all(
          filtered.map((c) =>
            fetch(`${API_BASE}/cards/${c.id}`).then((r) => r.json()).catch(() => c)
          )
        );
        filtered = detailed.filter((c) => {
          const ids = parseList(c.category_ids).map(Number);
          return selectedIds.some((sid) => ids.includes(sid));
        });
      }
      setResults(filtered);
    } catch {
      setError("Error al conectar con la API. Intenta de nuevo.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCategorySearch() {
    if (selectedCategories.length === 0) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setPage(1);
    setRarityFilter([]);
    try {
      const selectedIds = selectedCategories
        .map((name) => allCategories.find((c) => c.name === name)?.id)
        .filter(Boolean) as number[];
      const all = await fetchAllCards();
      const BATCH = 50;
      let enriched = [...all];
      setError(`Construyendo índice: 0/${all.length}...`);
      for (let i = 0; i < all.length; i += BATCH) {
        const batch = all.slice(i, i + BATCH);
        const details = await Promise.all(
          batch.map((c) =>
            fetch(`${API_BASE}/cards/${c.id}`).then((r) => r.json()).catch(() => c)
          )
        );
        for (let j = 0; j < batch.length; j++) {
          enriched[i + j] = { ...enriched[i + j], ...details[j] };
        }
        setError(`Construyendo índice: ${Math.min(i + BATCH, all.length)}/${all.length}...`);
      }
      allCardsCache = enriched;
      setError(null);
      const filtered = enriched.filter((c) => {
        if (!c.category_ids) return false;
        const ids = c.category_ids.toString().split(",").map((s: string) => parseInt(s.trim(), 10));
        return selectedIds.some((sid) => ids.includes(sid));
      });
      setResults(filtered);
    } catch {
      setError("Error al conectar con la API.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleRarity(r: string) {
    setPage(1);
    setRarityFilter((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  }

  function toggleCategory(name: string) {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }

  async function handleAdd(card: ApiCard) {
    if (currentTeam.length >= SLOTS_PER_TEAM) return;
    if (allUsedIds.has(card.id)) return;
    let cardToAdd = card;
    const targetSlot = currentTeam.length;
    if (targetSlot === 0 || targetSlot === 1) {
      try {
        const res = await fetch(`${API_BASE}/cards/${card.id}`);
        const full = await res.json();
        cardToAdd = { ...card, leader_skill: full.leader_skill ?? null };
      } catch {}
    }
    setTeams((prev) => {
      const next = prev.map((t) => [...t]);
      next[activeTeam] = [...next[activeTeam], cardToAdd];
      return next;
    });
  }

  function handleRemove(teamIdx: number, cardId: string) {
    setTeams((prev) => {
      const next = prev.map((t) => [...t]);
      next[teamIdx] = next[teamIdx].filter((c) => c.id !== cardId);
      return next;
    });
  }

  function startEditName(ti: number, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingName(ti);
    setTimeout(() => nameInputRef.current?.select(), 30);
  }

  function commitName(ti: number, value: string) {
    setTeamNames((prev) => {
      const next = [...prev];
      next[ti] = value.trim() || `Equipo ${ti + 1}`;
      return next;
    });
    setEditingName(null);
  }

  const filteredByRarity = rarityFilter.length > 0
    ? results.filter((c) => rarityFilter.includes(c.rarity))
    : results;
  const totalPages = Math.ceil(filteredByRarity.length / PER_PAGE);
  const paginated = filteredByRarity.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const filteredCats = allCategories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const btnStyle = (disabled: boolean) => ({
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "5px",
    color: disabled ? "var(--text-muted)" : "var(--text)",
    padding: "6px 12px",
    cursor: disabled ? ("default" as const) : ("pointer" as const),
    fontFamily: "Rajdhani, sans-serif",
    fontWeight: 600 as const,
    fontSize: "0.9rem",
  });

  return (
    <>
      <AuthHeader />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>

        {/* ── 11 equipos ── */}
        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "var(--gold)", fontSize: "1.1rem", marginBottom: "14px" }}>
            Battlefield — 11 Equipos
            <span style={{ color: "var(--text-muted)", fontFamily: "inherit", fontWeight: 400, fontSize: "0.8rem", marginLeft: "10px" }}>
              Editando: <span style={{ color: "var(--gold)" }}>{teamNames[activeTeam]}</span>
            </span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {teams.map((team, ti) => {
              const isActive = ti === activeTeam;
              const leader = team[0] ?? null;
              const coLeader = team[1] ?? null;
              return (
                <div key={ti} onClick={() => setActiveTeam(ti)} style={{
                  background: isActive ? "var(--bg-card)" : "var(--bg-surface)",
                  border: `1px solid ${isActive ? "var(--gold)" : "var(--border)"}`,
                  borderRadius: "10px", padding: "10px 14px", cursor: "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                  display: "grid", gridTemplateColumns: "170px 1fr",
                  alignItems: "start", gap: "14px",
                }}>
                  <div>
                    {editingName === ti ? (
                      <input ref={nameInputRef} defaultValue={teamNames[ti]}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => commitName(ti, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitName(ti, (e.target as HTMLInputElement).value);
                          if (e.key === "Escape") setEditingName(null);
                        }}
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--gold)", borderRadius: "4px", color: "var(--gold)", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "0.9rem", padding: "2px 6px", width: "100%", outline: "none" }}
                        autoFocus />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "0.9rem", color: isActive ? "var(--gold)" : "var(--text)" }}>{teamNames[ti]}</p>
                        <span onClick={(e) => startEditName(ti, e)} title="Renombrar" style={{ fontSize: "0.65rem", color: "var(--text-muted)", cursor: "pointer" }}>✏️</span>
                      </div>
                    )}
                    <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>{team.length}/{SLOTS_PER_TEAM} slots</p>
                    {(leader?.leader_skill || coLeader?.leader_skill) && (
                      <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "5px" }}>
                        {leader?.leader_skill && (
                          <div style={{ background: "rgba(245,197,66,0.07)", border: "1px solid rgba(245,197,66,0.2)", borderRadius: "4px", padding: "5px 7px" }}>
                            <p style={{ fontSize: "0.62rem", color: "var(--gold)", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, marginBottom: "2px" }}>LÍDER</p>
                            <p style={{ fontSize: "0.72rem", color: "var(--text)", lineHeight: 1.45 }}>{leader.leader_skill.length > 140 ? leader.leader_skill.slice(0, 140) + "…" : leader.leader_skill}</p>
                          </div>
                        )}
                        {coLeader?.leader_skill && (
                          <div style={{ background: "rgba(91,168,229,0.07)", border: "1px solid rgba(91,168,229,0.2)", borderRadius: "4px", padding: "5px 7px" }}>
                            <p style={{ fontSize: "0.62rem", color: "#5BA8E5", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, marginBottom: "2px" }}>CO-LÍDER</p>
                            <p style={{ fontSize: "0.72rem", color: "var(--text)", lineHeight: 1.45 }}>{coLeader.leader_skill.length > 140 ? coLeader.leader_skill.slice(0, 140) + "…" : coLeader.leader_skill}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px" }}>
                    {Array.from({ length: SLOTS_PER_TEAM }).map((_, si) => {
                      const card = team[si];
                      const thumb = card ? getThumb(card) : null;
                      const color = card ? (TYPE_COLOR[card.type] ?? "#888") : undefined;
                      return (
                        <div key={si}
                          onClick={(e) => { e.stopPropagation(); if (card) handleRemove(ti, card.id); else setActiveTeam(ti); }}
                          title={card ? `${card.name} — clic para quitar` : SLOT_LABELS[si]}
                          style={{
                            background: card ? "var(--bg-card)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${card ? (isActive ? "var(--gold)" : "rgba(245,197,66,0.25)") : "var(--border)"}`,
                            borderRadius: "6px", minHeight: "80px", display: "flex",
                            flexDirection: "column", alignItems: "center", justifyContent: "center",
                            padding: "4px 3px", position: "relative", overflow: "hidden",
                            cursor: card ? "pointer" : "default", textAlign: "center",
                          }}>
                          {card ? (
                            <>
                              {thumb && <img src={thumb} alt={card.name ?? ""} style={{ width: "38px", height: "38px", objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                              <p style={{ fontSize: "0.52rem", color, marginTop: "2px", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, lineHeight: 1.1 }}>{typeLabel(card.type)}</p>
                              {(si === 0 || si === 1) && card.leader_skill && (
                                <p style={{ fontSize: "0.48rem", color: "var(--text-muted)", lineHeight: 1.2, marginTop: "2px", padding: "0 2px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{card.leader_skill}</p>
                              )}
                              <span style={{ position: "absolute", top: "2px", right: "3px", fontSize: "0.48rem", color: "var(--text-muted)" }}>✕</span>
                            </>
                          ) : (
                            <span style={{ fontSize: "0.58rem", color: "var(--text-muted)", lineHeight: 1.3 }}>{SLOT_LABELS[si]}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Buscadores ── */}
        <div style={{ marginBottom: "8px" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span>Añadiendo a: <span style={{ color: "var(--gold)", fontWeight: 600 }}>{teamNames[activeTeam]}</span></span>
            {currentTeam.length >= SLOTS_PER_TEAM && <span style={{ color: "#E05C5C" }}>· Equipo lleno</span>}
            {saving && <span style={{ color: "var(--text-muted)" }}>· Guardando...</span>}
            {saveMsg && <span style={{ color: "var(--gold)" }}>· {saveMsg}</span>}
            {status === "unauthenticated" && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                · <button onClick={() => signIn("google")} style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0, textDecoration: "underline" }}>Inicia sesión</button> para guardar tus equipos
              </span>
            )}
          </p>
          {preloading && (
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold)", animation: "pulse 1.2s infinite" }} />
              Cargando base de datos en segundo plano...
            </p>
          )}
        </div>

        <SearchBar onSearch={handleSearch} loading={loading} />

        {/* ── Categorías ── */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <div ref={dropdownRef} style={{ position: "relative", flex: 1 }}>
              <button onClick={async () => { await loadCategoriesIfNeeded(); setCatDropdownOpen((v) => !v); }}
                style={{ width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 16px", color: selectedCategories.length > 0 ? "var(--text)" : "var(--text-muted)", fontFamily: "inherit", fontSize: "0.95rem", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{selectedCategories.length === 0 ? "Filtrar por categoría..." : selectedCategories.length === 1 ? selectedCategories[0] : `${selectedCategories.length} categorías seleccionadas`}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{catDropdownOpen ? "▲" : "▼"}</span>
              </button>

              {catDropdownOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "6px", zIndex: 100, maxHeight: "320px", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                  <div style={{ padding: "8px", borderBottom: "1px solid var(--border)" }}>
                    <input autoFocus value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder="Buscar categoría..."
                      style={{ width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "4px", padding: "6px 10px", color: "var(--text)", fontFamily: "inherit", fontSize: "0.85rem", outline: "none" }} />
                  </div>
                  <div style={{ overflowY: "auto", flex: 1 }}>
                    {filteredCats.length === 0
                      ? <p style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Sin resultados</p>
                      : filteredCats.map((cat) => {
                        const selected = selectedCategories.includes(cat.name);
                        return (
                          <div key={cat.id} onClick={() => toggleCategory(cat.name)}
                            style={{ padding: "7px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: selected ? "rgba(245,197,66,0.08)" : "transparent", borderLeft: `2px solid ${selected ? "var(--gold)" : "transparent"}`, transition: "background 0.1s" }}>
                            <img src={`${API_BASE}/assets/${cat.file}`} alt={cat.name} style={{ width: "22px", height: "22px", objectFit: "contain", flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <span style={{ fontSize: "0.85rem", color: selected ? "var(--gold)" : "var(--text)", flex: 1 }}>{cat.name}</span>
                            {selected && <span style={{ color: "var(--gold)", fontSize: "0.75rem" }}>✓</span>}
                          </div>
                        );
                      })}
                  </div>
                  {selectedCategories.length > 0 && (
                    <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{selectedCategories.length} seleccionada{selectedCategories.length !== 1 ? "s" : ""}</span>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedCategories([]); }} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline" }}>Limpiar</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={handleCategorySearch} disabled={selectedCategories.length === 0 || loading}
              style={{ background: selectedCategories.length > 0 && !loading ? "var(--gold)" : "var(--bg-surface)", color: selectedCategories.length > 0 && !loading ? "#000" : "var(--text-muted)", border: "none", borderRadius: "6px", padding: "10px 20px", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "1rem", letterSpacing: "0.06em", textTransform: "uppercase", cursor: selectedCategories.length > 0 && !loading ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
              Buscar
            </button>
          </div>

          {selectedCategories.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px" }}>
              {selectedCategories.map((catName) => {
                const catData = allCategories.find((c) => c.name === catName);
                return (
                  <span key={catName} onClick={() => toggleCategory(catName)}
                    style={{ fontSize: "0.75rem", color: "var(--gold)", background: "rgba(245,197,66,0.1)", border: "1px solid rgba(245,197,66,0.3)", borderRadius: "4px", padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                    {catData && <img src={`${API_BASE}/assets/${catData.file}`} alt="" style={{ width: "14px", height: "14px", objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                    {catName} <span style={{ opacity: 0.6 }}>✕</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {error && <p style={{ color: "var(--gold)", marginBottom: "16px", fontSize: "0.9rem" }}>{error}</p>}
        {loading && <p style={{ color: "var(--text-muted)", textAlign: "center", paddingTop: "40px" }}>Cargando personajes...</p>}

        {/* ── Resultados ── */}
        {!loading && results.length > 0 && (
          <section>
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginRight: "4px" }}>Rareza:</span>
              {RARITIES.map((r) => (
                <button key={r} onClick={() => toggleRarity(r)}
                  style={{ background: rarityFilter.includes(r) ? "var(--gold)" : "var(--bg-surface)", border: `1px solid ${rarityFilter.includes(r) ? "var(--gold)" : "var(--border)"}`, borderRadius: "5px", color: rarityFilter.includes(r) ? "#000" : "var(--text-muted)", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "0.82rem", padding: "4px 14px", cursor: "pointer", letterSpacing: "0.05em", transition: "all 0.15s" }}>
                  {r}
                </button>
              ))}
              {rarityFilter.length > 0 && (
                <button onClick={() => { setRarityFilter([]); setPage(1); }}
                  style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "5px", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "0.8rem", padding: "4px 12px", cursor: "pointer" }}>
                  ✕ Quitar
                </button>
              )}
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "12px" }}>
              {filteredByRarity.length} resultado{filteredByRarity.length !== 1 ? "s" : ""}
              {rarityFilter.length > 0 && <span style={{ color: "var(--gold)" }}> · {rarityFilter.join(" + ")}</span>}
              {totalPages > 1 && ` · página ${page} de ${totalPages}`}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: "10px" }}>
              {paginated.map((card) => {
                const thumb = getThumb(card);
                const color = TYPE_COLOR[card.type] ?? "#888";
                const inCurrentTeam = currentTeam.some((c) => c.id === card.id);
                const usedElsewhere = !inCurrentTeam && allUsedIds.has(card.id);
                const teamFull = currentTeam.length >= SLOTS_PER_TEAM;
                const cardCats = parseList(card.category_names);
                return (
                  <div key={card.id} className="card" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", borderColor: inCurrentTeam ? "var(--gold)" : usedElsewhere ? "rgba(255,80,80,0.4)" : undefined, opacity: usedElsewhere ? 0.45 : 1 }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      {thumb && <img src={thumb} alt={card.name ?? ""} style={{ width: "52px", height: "52px", objectFit: "contain", borderRadius: "4px", flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "4px" }}>
                          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "0.65rem", color: "#000", background: "var(--gold)", padding: "1px 5px", borderRadius: "3px" }}>{card.rarity}</span>
                          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "0.65rem", color, background: `${color}22`, padding: "1px 5px", borderRadius: "3px" }}>{typeLabel(card.type)}</span>
                        </div>
                        <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.2 }}>{card.name}</p>
                        {card.title && card.title !== card.name && <p style={{ fontSize: "0.7rem", color: "var(--gold)", fontStyle: "italic", marginTop: "2px" }}>{card.title}</p>}
                      </div>
                    </div>

                    {cardCats.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                        {cardCats.map((cat) => {
                          const catData = allCategories.find((c) => c.name === cat);
                          const highlighted = selectedCategories.includes(cat);
                          return (
                            <span key={cat} style={{ fontSize: "0.62rem", color: highlighted ? "var(--gold)" : "var(--text-muted)", background: highlighted ? "rgba(245,197,66,0.1)" : "var(--bg-surface)", padding: "1px 5px", borderRadius: "3px", border: `1px solid ${highlighted ? "rgba(245,197,66,0.3)" : "var(--border)"}`, display: "flex", alignItems: "center", gap: "3px" }}>
                              {catData && <img src={`${API_BASE}/assets/${catData.file}`} alt="" style={{ width: "10px", height: "10px", objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                              {cat}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {card.link_names && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                        {parseList(card.link_names).slice(0, 4).map((link) => (
                          <span key={link} style={{ fontSize: "0.62rem", color: "#5BA8E5", background: "rgba(91,168,229,0.08)", padding: "1px 5px", borderRadius: "3px", border: "1px solid rgba(91,168,229,0.2)" }}>⚡ {link}</span>
                        ))}
                        {parseList(card.link_names).length > 4 && <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>+{parseList(card.link_names).length - 4}</span>}
                      </div>
                    )}

                    <button onClick={() => handleAdd(card)} disabled={inCurrentTeam || usedElsewhere || teamFull}
                      style={{ marginTop: "auto", background: inCurrentTeam ? "var(--bg-surface)" : "transparent", border: `1px solid ${inCurrentTeam ? "var(--gold)" : usedElsewhere ? "rgba(255,80,80,0.4)" : "var(--border)"}`, borderRadius: "5px", color: inCurrentTeam ? "var(--gold)" : usedElsewhere ? "rgba(255,80,80,0.6)" : "var(--text-muted)", fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "0.78rem", letterSpacing: "0.05em", textTransform: "uppercase", padding: "6px", cursor: inCurrentTeam || usedElsewhere || teamFull ? "default" : "pointer", width: "100%" }}>
                      {inCurrentTeam ? "✓ En este equipo" : usedElsewhere ? "✗ Usado en otro equipo" : teamFull ? "Equipo lleno" : "+ Añadir"}
                    </button>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "24px", flexWrap: "wrap" }}>
                <button onClick={() => setPage(1)} disabled={page === 1} style={btnStyle(page === 1)}>«</button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={btnStyle(page === 1)}>‹ Anterior</button>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "0 8px" }}>{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btnStyle(page === totalPages)}>Siguiente ›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={btnStyle(page === totalPages)}>»</button>
              </div>
            )}
          </section>
        )}

        {!loading && searched && results.length === 0 && !error && (
          <div style={{ textAlign: "center", paddingTop: "60px" }}>
            <p style={{ color: "var(--text-muted)" }}>No se encontraron personajes. Prueba con otro nombre o categoría.</p>
          </div>
        )}

        {!searched && !loading && (
          <div style={{ textAlign: "center", paddingTop: "60px" }}>
            <p style={{ fontSize: "2rem", marginBottom: "12px" }}>🐉</p>
            <p style={{ color: "var(--text-muted)" }}>Busca por nombre o selecciona una categoría para empezar</p>
          </div>
        )}
      </div>
    </>
  );
}