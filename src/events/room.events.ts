import { BaseSocketMessage, Room, RoomConfig } from '../types/game.types.js';

// Request payloads
export interface CreateRoomRequest extends BaseSocketMessage {
  username: string;
  roomName: string;
  config?: Partial<RoomConfig>;
}

export interface JoinRoomRequest extends BaseSocketMessage {
  username: string;
  roomId: string;
}

export interface LeaveRoomRequest extends BaseSocketMessage {
  roomId: string;
}

export interface UpdateSettingsRequest extends BaseSocketMessage {
  roomId: string;
  config: RoomConfig;
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
