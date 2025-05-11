import { BaseSocketMessage, Room, RoomConfig } from '../types/game.types.js';

// Request payloads
export interface CreateRoomRequest extends BaseSocketMessage {
  username: string;
  roomName: string;
  avatarId?: number;
  config?: Partial<RoomConfig>;
}

export interface JoinRoomRequest extends BaseSocketMessage {
  username: string;
  roomId: string;
  avatarId?: number;
}

export interface LeaveRoomRequest extends BaseSocketMessage {
  roomId: string;
}

export interface DeleteRoomRequest extends BaseSocketMessage {
  roomId: string;
}

export interface ContinueGameRequest extends BaseSocketMessage {
  roomId: string;
}

export interface UpdateSettingsRequest extends BaseSocketMessage {
  roomId: string;
  config: RoomConfig;
}

export interface QuickJoinRequest extends BaseSocketMessage {
  username: string;
  avatarId?: number;
}

// Response payloads
export interface RoomResponse extends BaseSocketMessage {
  room: Room;
}

export interface ErrorResponse extends BaseSocketMessage {
  error: string;
}

export interface PlayerJoinedResponse extends BaseSocketMessage {
  roomId: string;
  playerId: string;
  username: string;
}

export interface PlayerLeftResponse extends BaseSocketMessage {
  roomId: string;
  playerId: string;
}
