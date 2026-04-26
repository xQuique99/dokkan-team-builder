const DATA_URL =
  "https://raw.githubusercontent.com/MNprojects/DokkanAPI/main/data/characters.json";

let cache: any[] | null = null;

export async function fetchAllCharacters() {
  if (cache) return cache;
  const res = await fetch(DATA_URL);
  const json = await res.json();
  cache = json;
  return json;
}

export async function searchByName(query: string) {
  const all = await fetchAllCharacters();
  const q = query.toLowerCase();
  return all.filter((c: any) =>
    c.name?.toLowerCase().includes(q) ||
    c.title?.toLowerCase().includes(q)
  );
}