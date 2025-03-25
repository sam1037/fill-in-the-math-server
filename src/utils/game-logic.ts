import { Server } from 'socket.io';
import { GameEvents } from '../events/events.js';
import { RoomStatus } from '../types/game.types.js';
import { rooms, playerTimers } from '../state/game-state.js';
import { generateQuestion } from './question-generator.js';

// Start health countdown for a player
export const startPlayerTimer = (
  socketId: string,
  roomId: string,
  io: Server
) => {
  if (playerTimers.has(socketId)) {
    clearInterval(playerTimers.get(socketId)!);
  }

  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.find((p) => p.id === socketId);
  if (!player) return;

  const timer = setInterval(() => {
    player.health -= 1;

    // Broadcast health update to all players in the room
    io.to(roomId).emit(GameEvents.HEALTH_UPDATED, {
      timestamp: Date.now(),
      playerId: socketId,
      newHealth: player.health,
    });

    // Check if player is eliminated
    if (player.health <= 0) {
      clearInterval(timer);
      playerTimers.delete(socketId);

      // Notify all players about elimination
      io.to(roomId).emit(GameEvents.PLAYER_ELIMINATED, {
        timestamp: Date.now(),
        playerId: socketId,
      });

      // Check if game is over
      const alivePlayers = room.players.filter((p) => p.health > 0);
      if (alivePlayers.length <= 1) {
        endGame(roomId, io);
      }
    }
  }, 1000);

  playerTimers.set(socketId, timer);
};

// End the game and generate leaderboard
export const endGame = (roomId: string, io: Server) => {
  const room = rooms.get(roomId);
  if (!room) return;

  // Stop all timers
  room.players.forEach((player) => {
    if (playerTimers.has(player.id)) {
      clearInterval(playerTimers.get(player.id)!);
      playerTimers.delete(player.id);
    }
  });

  // Generate leaderboard
  const leaderboard = room.players
    .map((player) => ({
      playerId: player.id,
      username: player.username,
      score: player.score,
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score);

  // Assign ranks
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  const winner = leaderboard.length > 0 ? leaderboard[0].playerId : '';

  // Update room status
  room.status = RoomStatus.FINISHED;

  // Send leaderboard to all players
  io.to(roomId).emit(GameEvents.LEADERBOARD_UPDATED, {
    timestamp: Date.now(),
    leaderboard,
    gameWinner: winner,
  });

  io.to(roomId).emit(GameEvents.GAME_ENDED, {
    timestamp: Date.now(),
    roomId,
  });
};

// Send a question to a player automatically
export const sendQuestionToPlayer = (
  socketId: string,
  roomId: string,
  io: Server
) => {
  const room = rooms.get(roomId);
  if (!room || room.status !== RoomStatus.IN_PROGRESS) return;

  const player = room.players.find((p) => p.id === socketId);
  if (!player || player.health <= 0) return;

  // Generate a new question
  const question = generateQuestion(room.config.questionDifficulty);

  // Store the question with the player
  player.currentQuestion = question;

  // Send question to the player
  io.to(socketId).emit(GameEvents.QUESTION_RECEIVED, {
    timestamp: Date.now(),
    question,
  });
};

// Apply wrong answer penalty to a player
export const applyWrongAnswerPenalty = (
  socketId: string,
  roomId: string,
  io: Server
) => {
  const room = rooms.get(roomId);
  if (!room || room.status !== RoomStatus.IN_PROGRESS) return;

  const player = room.players.find((p) => p.id === socketId);
  if (!player || player.health <= 0) return;

  // Apply the penalty from room configuration
  player.health -= room.config.wrongAnswerPenalty || 3;

  // Ensure health doesn't go below 0
  if (player.health < 0) player.health = 0;

  // Broadcast health update to all players in the room
  io.to(roomId).emit(GameEvents.HEALTH_UPDATED, {
    timestamp: Date.now(),
    playerId: socketId,
    newHealth: player.health,
  });

  // Check if player is eliminated
  if (player.health <= 0) {
    if (playerTimers.has(socketId)) {
      clearInterval(playerTimers.get(socketId)!);
      playerTimers.delete(socketId);
    }

    // Notify all players about elimination
    io.to(roomId).emit(GameEvents.PLAYER_ELIMINATED, {
      timestamp: Date.now(),
      playerId: socketId,
    });

    // Check if game is over
    const alivePlayers = room.players.filter((p) => p.health > 0);
    if (alivePlayers.length <= 1) {
      endGame(roomId, io);
    }
  }
};

// Send updated room information to all players in the room
export const broadcastRoomUpdate = (roomId: string, io: Server) => {
  const room = rooms.get(roomId);
  if (!room) return;

  io.to(roomId).emit('room_updated', {
    timestamp: Date.now(),
    room,
  });
};
