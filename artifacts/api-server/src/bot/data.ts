import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "bot-data");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

function filePath(name: string): string {
  return path.join(dataDir, `${name}.json`);
}

export function readData<T>(name: string, defaults: T): T {
  const fp = filePath(name);
  if (!existsSync(fp)) return defaults;
  try {
    return JSON.parse(readFileSync(fp, "utf-8")) as T;
  } catch {
    return defaults;
  }
}

export function writeData<T>(name: string, data: T): void {
  writeFileSync(filePath(name), JSON.stringify(data, null, 2), "utf-8");
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface IdsData {
  nextId: number;
  users: Record<string, number>;
}

export interface WhitelistConfig {
  nome: string;
  url: string;
  thumbnail: string;
  perguntas: string[];
  cargo: string;
  canalAprovacao: string;
  cor: string;
}

export interface TicketConfig {
  nome: string;
  url: string;
  thumbnail: string;
  tipos: string[];
  descricao: string;
  autor: string;
  cor: string;
  canalLogs: string;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export const defaultWhitelistConfig: WhitelistConfig = {
  nome: "Whitelist",
  url: "",
  thumbnail: "",
  perguntas: ["Qual é o seu nome?", "Por que quer entrar?", "Quantos anos tem?"],
  cargo: "",
  canalAprovacao: "",
  cor: "#2ECC71",
};

export const defaultTicketConfig: TicketConfig = {
  nome: "Sistema de Tickets",
  url: "",
  thumbnail: "",
  tipos: ["Suporte", "Dúvidas", "Reclamações"],
  descricao: "Clique em um botão abaixo para abrir um ticket.",
  autor: "Suporte",
  cor: "#3498DB",
  canalLogs: "",
};

export const defaultIdsData: IdsData = {
  nextId: 1,
  users: {},
};
