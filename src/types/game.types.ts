// Base interface for all socket communications
export interface BaseSocketMessage {
  timestamp: number;
  socketId?: string;
}

// Room related interfaces
export interface RoomConfig {
  timeLimit: number; // seconds
  questionDifficulty: QuestionDifficulty;
  maxPlayers: number;
  attackDamage: number;
  healAmount: number;
  wrongAnswerPenalty: number;
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
  difficulty: QuestionDifficulty;
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

// Enums
// Game Generation related
/**
 * Enumeration representing mathematical operation symbols and a blank placeholder.
 * @enum {string}
 */
export enum MathSymbol {
  Addition = '+',
  Subtraction = '-',
  Multiplication = '*',
  Division = '/',
  Equals = '=',
  Blank = '?',
}

/**
 * Enum representing difficulty levels for the game.
 * @enum {string}
 */
export enum QuestionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
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
