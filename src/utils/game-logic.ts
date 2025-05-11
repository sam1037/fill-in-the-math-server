import { Server } from 'socket.io';
import { GameEvents, RoomEvents } from '../events/events.js';
import { RoomStatus } from '../types/game.types.js';
import { rooms, playerTimers, roomTimers } from '../state/game-state.js';
import { generateQuestion } from './question-generator.js';

// Throttle health updates per room
const healthUpdateTimestamps: Record<string, number> = {};
const HEALTH_UPDATE_THROTTLE_MS = 300; // Only send health update at most every 300ms per room

// Helper function to send health updates for all players in a room
export const sendHealthUpdates = (roomId: string, io: Server) => {
  const now = Date.now();
  if (
    healthUpdateTimestamps[roomId] &&
    now - healthUpdateTimestamps[roomId] < HEALTH_UPDATE_THROTTLE_MS
  ) {
    // Throttled: skip this update
    return;
  }
  healthUpdateTimestamps[roomId] = now;

  const room = rooms.get(roomId);
  if (!room) return;

  // Collect all player health updates
  const healthUpdates = room.players.map((player) => ({
    playerId: player.id,
    newHealth: player.health,
  }));

  // Send a single health update with all players' health
  io.to(roomId).emit(GameEvents.HEALTH_UPDATED, {
    timestamp: now,
    updates: healthUpdates,
  });
};

// Start health countdown for all players in a room
export const startRoomTimer = (roomId: string, io: Server) => {
  // Clear any existing room timer
  if (roomTimers.has(roomId)) {
    clearInterval(roomTimers.get(roomId)!);
    roomTimers.delete(roomId); // Make sure to clear from the map
  }

  const room = rooms.get(roomId);
  if (!room) return;

  try {
    const timer = setInterval(() => {
      // Check if room still exists (could have been deleted in another event)
      if (!rooms.has(roomId)) {
        clearInterval(timer);
        roomTimers.delete(roomId);
        return;
      }

      // Reduce health for all active players at once
      room.players.forEach((player) => {
        if (player.health > 0) {
          player.health -= 1; // Check if player is eliminated
          if (player.health <= 0) {
            // Record elimination time for ranking purposes
            player.eliminationTime = Date.now();

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
  } catch (error) {
    console.error(`Error starting room timer for room ${roomId}:`, error);
  }
};

// End the game and generate leaderboard
export const endGame = (roomId: string, io: Server) => {
  const room = rooms.get(roomId);
  if (!room) return;

  try {
    // Stop room timer
    if (roomTimers.has(roomId)) {
      clearInterval(roomTimers.get(roomId)!);
      roomTimers.delete(roomId);
    }

    // Clear any player timers for this room
    room.players.forEach((player) => {
      if (playerTimers.has(player.id)) {
        clearInterval(playerTimers.get(player.id)!);
        playerTimers.delete(player.id);
      }
    });

    // Last player standing (player who wasn't eliminated) gets rank 1
    // Other players ranked by elimination time (later elimination = better rank)

    // First, separate players into alive and eliminated groups
    const alivePlayers = room.players.filter((player) => player.health > 0);
    const eliminatedPlayers = room.players.filter(
      (player) => player.health <= 0
    );

    // Sort eliminated players by elimination time (latest first)
    const sortedEliminated = eliminatedPlayers
      .sort((a, b) => (b.eliminationTime || 0) - (a.eliminationTime || 0))
      .map((player) => ({
        playerId: player.id,
        username: player.username,
        score: player.score,
        rank: 0,
      }));

    // Add alive players at the beginning (rank 1)
    const leaderboard = [
      ...alivePlayers.map((player) => ({
        playerId: player.id,
        username: player.username,
        score: player.score,
        rank: 0,
      })),
      ...sortedEliminated,
    ];

    // Assign ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Winner is the player with rank 1
    let winner = '';
    if (leaderboard.length > 0) {
      winner = leaderboard[0].playerId;
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
  } catch (error) {
    console.error(`Error ending game for room ${roomId}:`, error);
  }
};

// Send a question to a player automatically
export const sendQuestionToPlayer = (
  socketId: string,
  roomId: string,
  io: Server
) => {
  try {
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
  } catch (error) {
    console.error(`Error sending question to player ${socketId}:`, error);
  }
};

// Apply wrong answer penalty to a player
export const applyWrongAnswerPenalty = (
  socketId: string,
  roomId: string,
  io: Server
) => {
  try {
    const room = rooms.get(roomId);
    if (!room || room.status !== RoomStatus.IN_PROGRESS) return;

    const player = room.players.find((p) => p.id === socketId);
    if (!player || player.health <= 0) return;

    // Apply the penalty from room configuration
    player.health -= room.config.wrongAnswerPenalty || 3;

    // Ensure health doesn't go below 0
    if (player.health < 0) player.health = 0;

    // Broadcast health update to all players in the room using the helper function
    sendHealthUpdates(roomId, io); // Check if player is eliminated
    if (player.health <= 0) {
      // Record elimination time for ranking purposes
      player.eliminationTime = Date.now();

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
  } catch (error) {
    console.error(
      `Error applying wrong answer penalty to player ${socketId}:`,
      error
    );
  }
};

// Send updated room information to all players in the room
export const broadcastRoomUpdate = (roomId: string, io: Server) => {
  try {
    const room = rooms.get(roomId);
    if (!room) return;

    io.to(roomId).emit(RoomEvents.ROOM_UPDATED, {
      timestamp: Date.now(),
      room,
    });
  } catch (error) {
    console.error(`Error broadcasting room update for room ${roomId}:`, error);
  }
};
