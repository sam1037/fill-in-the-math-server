import {
  BaseSocketMessage,
  PlayerAction,
  Question,
} from '../types/game.types.js';

// Request payloads
export interface StartGameRequest extends BaseSocketMessage {
  roomId: string;
}

export interface GetQuestionRequest extends BaseSocketMessage {
  roomId: string;
}

export interface SubmitAnswerRequest extends BaseSocketMessage {
  roomId: string;
  questionId: string;
  answer: number;
}

export interface PerformActionRequest extends BaseSocketMessage {
  roomId: string;
  actionType: string;
  targetPlayerId: string;
}

// Response payloads
export interface QuestionResponse extends BaseSocketMessage {
  question: Question;
}

export interface AnswerResultResponse extends BaseSocketMessage {
  correct: boolean;
  correctAnswer?: number;
  canPerformAction: boolean;
}

export interface ActionPerformedResponse extends BaseSocketMessage {
  action: PlayerAction;
}

export interface HealthUpdateResponse extends BaseSocketMessage {
  playerId: string;
  newHealth: number;
}

export interface PlayerEliminatedResponse extends BaseSocketMessage {
  playerId: string;
}

export interface LeaderboardResponse extends BaseSocketMessage {
  leaderboard: {
    playerId: string;
    username: string;
    score: number;
    rank: number;
  }[];
  gameWinner: string;
}
