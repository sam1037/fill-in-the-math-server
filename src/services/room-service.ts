import { Server } from 'socket.io';
import {
  Player,
  QuestionDifficulty,
  Room,
  RoomConfig,
  RoomStatus,
} from '../types/game.types.js';
import { endGame } from '../utils/game-logic.js';
import { rooms, playerRooms, playerTimers } from '../state/game-state.js';

export const createRoom = (
  socketId: string,
  username: string,
  roomName: string,
  config?: {
    timeLimit?: number;
    questionDifficulty?: QuestionDifficulty;
    maxPlayers?: number;
    attackDamage?: number;
    healAmount?: number;
    wrongAnswerPenalty?: number;
    isPublic?: boolean;
  }
) => {
  const roomId = Math.random().toString(36).substring(2, 9);
  const player: Player = {
    id: socketId,
    username,
    health: 0,
    score: 0,
    currentQuestionIndex: 0,
    isHost: true,
  };

  const room: Room = {
    id: roomId,
    name: roomName,
    hostId: socketId,
    players: [player],
    config: {
      timeLimit: config?.timeLimit || 60,
      questionDifficulty:
        config?.questionDifficulty || QuestionDifficulty.MEDIUM,
      maxPlayers: config?.maxPlayers || 4,
      attackDamage: config?.attackDamage || 5,
      healAmount: config?.healAmount || 3,
      wrongAnswerPenalty: config?.wrongAnswerPenalty || 3,
      isPublic: config?.isPublic || false,
    },
    status: RoomStatus.WAITING,
  };

  rooms.set(roomId, room);
  playerRooms.set(socketId, roomId);

  return room;
};

export const joinRoom = (
  socketId: string,
  roomId: string,
  username: string
) => {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (room.status !== RoomStatus.WAITING) return 'IN_PROGRESS';
  if (room.players.length >= room.config.maxPlayers) return 'FULL';

  const player: Player = {
    id: socketId,
    username,
    health: 0,
    score: 0,
    currentQuestionIndex: 0,
    isHost: false,
  };

  room.players.push(player);
  playerRooms.set(socketId, roomId);

  return room;
};

export const leaveRoom = (socketId: string, io: Server) => {
  const roomId = playerRooms.get(socketId);
  if (!roomId) return null;

  const room = rooms.get(roomId);
  if (!room) return null;

  // Remove player from room
  room.players = room.players.filter((p: Player) => p.id !== socketId);

  // If host leaves, assign a new host or delete the room
  if (socketId === room.hostId) {
    if (room.players.length > 0) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    } else {
      rooms.delete(roomId);
    }
  }

  playerRooms.delete(socketId);

  // Stop player timer if exists
  if (playerTimers.has(socketId)) {
    clearInterval(playerTimers.get(socketId)!);
    playerTimers.delete(socketId);
  }

  // Check if game is over for remaining players
  if (rooms.has(roomId) && room.status === RoomStatus.IN_PROGRESS) {
    const alivePlayers = room.players.filter((p: Player) => p.health > 0);
    if (alivePlayers.length <= 1) {
      endGame(roomId, io);
    }
  }

  return { roomId, roomStillExists: rooms.has(roomId) };
};

export const updateRoomSettings = (
  socketId: string,
  roomId: string,
  config: RoomConfig
) => {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (socketId !== room.hostId) return 'NOT_HOST';

  // Update config
  room.config = { ...room.config, ...config };

  return room;
};

export const quickJoin = (socketId: string, username: string) => {
  // Create an array of all available public rooms
  const availableRooms: Room[] = [];

  for (const [, room] of rooms) {
    // Only include rooms that are:
    // 1. Public
    // 2. In waiting status
    // 3. Not full
    if (
      room.config.isPublic &&
      room.status === RoomStatus.WAITING &&
      room.players.length < room.config.maxPlayers
    ) {
      availableRooms.push(room);
    }
  }

  // If no rooms are available, return null
  if (availableRooms.length === 0) {
    return null;
  }

  // Sort rooms by number of open slots (maxPlayers - currentPlayers)
  // Rooms with fewer open slots have higher priority (will be joined first)
  availableRooms.sort((a, b) => {
    const aOpenSlots = a.config.maxPlayers - a.players.length;
    const bOpenSlots = b.config.maxPlayers - b.players.length;
    return aOpenSlots - bOpenSlots;
  });

  // Get the highest priority room (smallest number of open slots)
  const roomToJoin = availableRooms[0];

  // Join the room using the existing joinRoom function
  return joinRoom(socketId, roomToJoin.id, username);
};
