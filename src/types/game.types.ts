import { Difficulty, MathSymbol } from './question.enum.js';

// Base interface for all socket communications
export interface BaseSocketMessage {
  timestamp: number;
  socketId?: string;
}

// Room related interfaces
export interface RoomConfig {
  timeLimit: number; // seconds
  Difficulty: Difficulty;
  maxPlayers: number;
  attackDamage: number;
  healAmount: number;
  wrongAnswerPenalty: number;
  isPublic: boolean;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  config: RoomConfig;
  status: RoomStatus;
}

// Player related interfaces
export interface Player {
  id: string;
  username: string;
  avatarId?: number;
  health: number;
  score: number;
  currentQuestionIndex: number;
  isHost: boolean;
  currentQuestion?: Question;
  canPerformAction?: boolean;
}

// Question related interfaces
export interface Question {
  id: string;
  equation_arr: (number | MathSymbol)[];
  difficulty: Difficulty;
}

export interface PlayerAnswer extends BaseSocketMessage {
  questionId: string;
  answer: number[];
  isCorrect: boolean;
  timeSpent: number;
}

// Action interfaces
export interface PlayerAction extends BaseSocketMessage {
  type: ActionType;
  sourcePlayerId: string;
  targetPlayerId: string;
  value: number;
}

export enum RoomStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
}

export enum ActionType {
  ATTACK = 'attack',
  HEAL = 'heal',
}
