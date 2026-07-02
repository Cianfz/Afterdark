export type GameState = 'LOBBY' | 'DRAW' | 'PLAYING' | 'VOTING' | 'SCOREBOARD' | 'GAME_OVER';

export interface Player {
  id: string; // Socket ID
  nickname: string;
  score: number;
  answers: Record<string, string>; // category -> answer
  hasStopped: boolean;
}

export interface Room {
  id: string;
  hostId: string;
  state: GameState;
  players: Player[];
  currentLetter: string;
  timer: number;
  currentCategoryIndex: number; // for voting phase
  categories: string[];
  totalRounds: number;
  currentRound: number;
}

export const DEFAULT_PRESET_CATEGORIES = [
  'Nome',
  'CEP (Cidade, Estado ou País)',
  'Animal',
  'Objeto',
  'TV (Filme, Desenho ou Série)',
  'Artista'
];
