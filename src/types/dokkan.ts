export type DokkanType = "AGL" | "TEQ" | "INT" | "STR" | "PHY";
export type DokkanRarity = "UR" | "LR" | "SSR" | "SR" | "R" | "N";

export interface DokkanCharacter {
  id: string;
  name: string;
  title: string;
  type: DokkanType;
  rarity: DokkanRarity;
  categories: string[];
  links: string[];
  leaderSkill?: string;
  superAttack?: string;
  maxHp?: number;
  maxAtk?: number;
  maxDef?: number;
}

export interface TeamSlot {
  position: number; // 0-5
  character: DokkanCharacter | null;
  isLeader?: boolean; // posición 0 = líder, posición 3 = friend leader
}

export interface TeamAnalysis {
  sharedCategories: string[];
  linkScores: Record<string, number>; // link → cuántos pares lo comparten
  topLinks: string[];
  categoryScore: number;
  linkScore: number;
  totalScore: number;
}
