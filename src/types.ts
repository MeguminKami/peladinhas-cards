import type { ReactNode } from 'react';

export type Role = 'admin' | 'dbs' | 'member';
export interface Timestamp { seconds: number; nanoseconds?: number; toDate?: () => Date }
export type DateValue = Timestamp | Date | string | null;
export interface User {
  uid: string; username: string; displayName?: string; role: Role; disabled?: boolean;
  photoURL?: string; country?: string; countryCode?: string; birthDate?: string;
  heightCm?: number; weightKg?: number | null; preferredFoot?: string;
  primaryPosition?: string; secondaryPositions?: string[]; shirtNumber?: number;
  city?: string; playerStyle?: string; profileCompleted?: boolean; createdAt?: DateValue;
}
export interface Player extends User {
  hasCard: boolean; official: boolean; ovr: number; ovrDelta: number | null;
  stats: Record<string, number>; previousStats?: Record<string, number> | null;
  initial?: Record<string, number>; cardType: string; selectedCardId?: string | null;
  specials: SpecialCard[]; aggregates: Aggregate[]; matchStats: MatchStats;
  [key: string]: unknown;
}
export interface SpecialCard { id: string; expiresAt?: DateValue; [key: string]: unknown }
export interface Aggregate { overall: number; date?: DateValue; gameId?: string; [key: string]: unknown }
export interface MatchStats { played: number; wins: number; draws: number; losses: number; goals: number; assists: number; winRate: number; [key: string]: number }
export interface Game {
  id: string; title: string; status: 'draft' | 'open' | 'closed'; location?: string;
  scheduledAt?: DateValue; closedAt?: DateValue; teamA: {starters: string[]; bench: string[]}; teamB: {starters: string[]; bench: string[]};
  score: {teamA: number; teamB: number}; [key: string]: unknown;
}
export interface Mission {
  id: string; type: string; title: string; description: string; done: number;
  total: number; href: string; icon: string; [key: string]: unknown;
}
export interface Notice { id: string; title: string; body?: string; read?: boolean; href?: string; createdAt?: Timestamp; podium?: {position: number; name: string; reward: string}[] }
export interface League {
  players: Player[]; users: User[]; games: Game[];
  cycle: {weekId: string; phase: string; [key: string]: unknown};
  summaries: {id: string; players?: Record<string, {overall?: number}>}[];
  events: Record<string, unknown>[]; [key: string]: unknown;
}
export interface PageContext {
  user: User; realUser: User; league: League; missions: Mission[]; notifications: Notice[];
  render(content: ReactNode): void;
  cleanup(dispose: () => void | Promise<void>): void;
  go(hash: string): void;
  refresh(): Promise<void>;
  refreshNotifications(): Promise<void>;
  disposers: (() => void | Promise<void>)[];
}
