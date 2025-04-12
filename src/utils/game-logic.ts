import { Server } from 'socket.io';
import { GameEvents } from '../events/events.js';
import { RoomStatus } from '../types/game.types.js';
import { rooms } from '../state/game-state.js';
import { generateQuestion } from './question-generator.js';

// Track room timers instead of player timers
const roomTimers = new Map<string, NodeJS.Timeout>();

// Helper function to send health updates for all players in a room
export const sendHealthUpdates = (roomId: string, io: Server) => {
  const room = rooms.get(roomId);
  if (!room) return;

  // Collect all player health updates
  const healthUpdates = room.players.map((player) => ({
    playerId: player.id,
    newHealth: player.health,
  }));

  // Send a single health update with all players' health
  io.to(roomId).emit(GameEvents.HEALTH_UPDATED, {
    timestamp: Date.now(),
    updates: healthUpdates,
  });
};

// Start health countdown for all players in a room
export const startRoomTimer = (roomId: string, io: Server) => {
  // Clear any existing room timer
  if (roomTimers.has(roomId)) {
    clearInterval(roomTimers.get(roomId)!);
  }

  const room = rooms.get(roomId);
  if (!room) return;

  const timer = setInterval(() => {
    // Reduce health for all active players at once
    room.players.forEach((player) => {
      if (player.health > 0) {
        player.health -= 1;

        // Check if player is eliminated
        if (player.health <= 0) {
          // Notify all players about elimination
          io.to(roomId).emit(GameEvents.PLAYER_ELIMINATED, {
            timestamp: Date.now(),
            playerId: player.id,
          });
        }
      }
    });

    // Broadcast health updates once for all players
    sendHealthUpdates(roomId, io);

    // Check if game is over
    const alivePlayers = room.players.filter((p) => p.health > 0);
    if (alivePlayers.length <= 1) {
      endGame(roomId, io);
    }
  }, 1000);

  roomTimers.set(roomId, timer);
};

// End the game and generate leaderboard
export const endGame = (roomId: string, io: Server) => {
  const room = rooms.get(roomId);
  if (!room) return;

  // Stop room timer
  if (roomTimers.has(roomId)) {
    clearInterval(roomTimers.get(roomId)!);
    roomTimers.delete(roomId);
  }

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

  // Check for tied scores - if all players have the same score, there's no winner
  let winner = '';
  if (leaderboard.length > 0) {
    const topScore = leaderboard[0].score;
    const allTied = leaderboard.every((entry) => entry.score === topScore);

    // Only set a winner if not everyone is tied
    if (!allTied) {
      winner = leaderboard[0].playerId;
    }
  }

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
  const question = generateQuestion(room.config.Difficulty);

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

  // Broadcast health update to all players in the room using the helper function
  sendHealthUpdates(roomId, io);

  // Check if player is eliminated
  if (player.health <= 0) {
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
