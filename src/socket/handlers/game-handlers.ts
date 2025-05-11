import { Server, Socket } from 'socket.io';
import { ConnectionEvents, GameEvents } from '../../events/events.js';
import {
  GetQuestionRequest,
  PerformActionRequest,
  StartGameRequest,
  SubmitAnswerRequest,
} from '../../events/game.events.js';
import { ActionType, Player, RoomStatus } from '../../types/game.types.js';
import {
  broadcastRoomUpdate,
  startRoomTimer, // Changed from startPlayerTimer
  sendQuestionToPlayer,
  applyWrongAnswerPenalty,
  endGame,
  sendHealthUpdates,
} from '../../utils/game-logic.js';

import { checkAnswer } from '../../utils/check-answer.js';
import { rooms, playerRooms, playerTimers } from '../../state/game-state.js';

// Add a Set to track players currently processing an answer
const processingAnswers = new Set<string>();

// Enhanced in-memory rate limiter per socket and event
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second window
const MAX_EVENTS_PER_WINDOW = 5; // Max 5 events per second per socket per event
const RATE_LIMIT_CLEANUP_INTERVAL = 60000; // Clean up rate limit data every minute
const eventTimestamps: Map<string, Map<string, number[]>> = new Map();

// Set up rate limit data cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  let cleanupCount = 0;

  // Clean up old timestamps
  for (const [socketId, events] of eventTimestamps.entries()) {
    let shouldRemoveSocket = true;

    for (const [event, timestamps] of events.entries()) {
      // Remove old timestamps
      const filteredTimestamps = timestamps.filter(
        (ts) => now - ts < RATE_LIMIT_WINDOW_MS * 10 // Keep a bit of history
      );

      if (filteredTimestamps.length === 0) {
        events.delete(event);
        cleanupCount++;
      } else {
        events.set(event, filteredTimestamps);
        shouldRemoveSocket = false;
      }
    }

    if (shouldRemoveSocket) {
      eventTimestamps.delete(socketId);
    }
  }

  if (cleanupCount > 0) {
    console.log(`Rate limit cleanup: removed ${cleanupCount} expired entries`);
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

function isRateLimited(socketId: string, event: string): boolean {
  // Get or create socket entry
  if (!eventTimestamps.has(socketId)) {
    eventTimestamps.set(socketId, new Map());
  }

  const socketEvents = eventTimestamps.get(socketId)!;

  // Get or create event entry
  if (!socketEvents.has(event)) {
    socketEvents.set(event, []);
  }

  const timestamps = socketEvents.get(event)!;
  const now = Date.now();

  // Remove timestamps outside the window
  const filteredTimestamps = timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  socketEvents.set(event, filteredTimestamps);

  // Check if rate limited
  if (filteredTimestamps.length >= MAX_EVENTS_PER_WINDOW) {
    return true;
  }

  // Add new timestamp
  filteredTimestamps.push(now);
  return false;
}

export const setupGameHandlers = (io: Server, socket: Socket) => {
  // Add try/catch and logging to all handlers for robustness
  socket.on(GameEvents.START_GAME, (data: StartGameRequest) => {
    try {
      const room = rooms.get(data.roomId);
      if (!room) {
        console.error(`[START_GAME] Room not found: ${data.roomId}`);
        return socket.emit(ConnectionEvents.ERROR, {
          timestamp: Date.now(),
          error: 'Room not found',
        });
      }
      if (socket.id !== room.hostId) {
        console.warn(`[START_GAME] Non-host tried to start game: ${socket.id}`);
        return socket.emit(ConnectionEvents.ERROR, {
          timestamp: Date.now(),
          error: 'Only host can start the game',
        });
      }
      if (room.players.length < 2) {
        console.warn(
          `[START_GAME] Not enough players to start game in room: ${data.roomId}`
        );
        return socket.emit(ConnectionEvents.ERROR, {
          timestamp: Date.now(),
          error: 'Need at least 2 players to start',
        });
      }
      room.players.forEach((player: Player) => {
        player.health = room.config.timeLimit;
        player.score = 0;
        player.currentQuestionIndex = 0;
        player.canPerformAction = false;
        player.currentQuestion = undefined;
        player.eliminationTime = undefined;
      });
      room.status = RoomStatus.IN_PROGRESS;
      sendHealthUpdates(data.roomId, io);
      startRoomTimer(data.roomId, io);
      broadcastRoomUpdate(data.roomId, io);
      io.to(data.roomId).emit(GameEvents.GAME_STARTED, {
        timestamp: Date.now(),
        room,
      });
    } catch (err) {
      console.error(`[START_GAME] Exception:`, err);
      socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Internal server error',
      });
    }
  });

  socket.on(GameEvents.GET_QUESTION, (data: GetQuestionRequest) => {
    try {
      sendQuestionToPlayer(socket.id, data.roomId, io);
    } catch (err) {
      console.error(`[GET_QUESTION] Exception:`, err);
      socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Internal server error',
      });
    }
  });

  socket.on(GameEvents.SUBMIT_ANSWER, (data: SubmitAnswerRequest) => {
    if (isRateLimited(socket.id, GameEvents.SUBMIT_ANSWER)) {
      console.warn(`[RATE_LIMIT] SUBMIT_ANSWER from ${socket.id} blocked.`);
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'You are sending answers too quickly. Please slow down.',
      });
    }
    try {
      // Prevent concurrent answer processing for the same player
      if (processingAnswers.has(socket.id)) {
        console.warn(
          `[SUBMIT_ANSWER] Player ${socket.id} tried to submit answer while previous is processing.`
        );
        return socket.emit(ConnectionEvents.ERROR, {
          timestamp: Date.now(),
          error: 'Previous answer is still being processed. Please wait.',
        });
      }
      processingAnswers.add(socket.id);
      const roomId = playerRooms.get(socket.id);
      if (!roomId) {
        processingAnswers.delete(socket.id);
        return;
      }
      const room = rooms.get(roomId);
      if (!room || room.status !== RoomStatus.IN_PROGRESS) {
        processingAnswers.delete(socket.id);
        return;
      }
      const player = room.players.find((p: Player) => p.id === socket.id);
      if (!player || player.health <= 0) {
        processingAnswers.delete(socket.id);
        return;
      }
      if (!player.currentQuestion) {
        console.warn(
          `[SUBMIT_ANSWER] No active question for player: ${socket.id}`
        );
        socket.emit(ConnectionEvents.ERROR, {
          timestamp: Date.now(),
          error: 'No active question to answer',
        });
        processingAnswers.delete(socket.id);
        return;
      }
      if (player.canPerformAction) {
        console.warn(
          `[SUBMIT_ANSWER] Double submission attempt by player: ${socket.id}`
        );
        socket.emit(ConnectionEvents.ERROR, {
          timestamp: Date.now(),
          error: 'Already submitted answer for this question',
        });
        processingAnswers.delete(socket.id);
        return;
      }
      const isCorrect = checkAnswer(
        player.currentQuestion.equation_arr,
        data.answer
      );
      if (isCorrect) {
        player.score += 10;
        player.currentQuestionIndex++;
        player.canPerformAction = true;
        broadcastRoomUpdate(roomId, io);
      } else {
        applyWrongAnswerPenalty(socket.id, roomId, io);
      }
      socket.emit(GameEvents.ANSWER_RESULT, {
        timestamp: Date.now(),
        correct: isCorrect,
        canPerformAction: isCorrect,
      });
      player.currentQuestion = undefined;
      processingAnswers.delete(socket.id);
    } catch (err) {
      processingAnswers.delete(socket.id);
      console.error(`[SUBMIT_ANSWER] Exception:`, err);
      socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Internal server error',
      });
    }
  });

  socket.on(GameEvents.PERFORM_ACTION, (data: PerformActionRequest) => {
    if (isRateLimited(socket.id, GameEvents.PERFORM_ACTION)) {
      console.warn(`[RATE_LIMIT] PERFORM_ACTION from ${socket.id} blocked.`);
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'You are sending actions too quickly. Please slow down.',
      });
    }
    try {
      const roomId = playerRooms.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || room.status !== RoomStatus.IN_PROGRESS) return;
      const player = room.players.find((p: Player) => p.id === socket.id);
      if (!player || player.health <= 0) return;
      if (!player.canPerformAction) {
        console.warn(
          `[PERFORM_ACTION] Player not eligible to perform action: ${socket.id}`
        );
        return socket.emit(ConnectionEvents.ERROR, {
          timestamp: Date.now(),
          error: 'You must answer correctly before performing an action',
        });
      }
      // Prevent action if game is over
      if (room.status !== RoomStatus.IN_PROGRESS) {
        console.warn(
          `[PERFORM_ACTION] Game not in progress for room: ${roomId}`
        );
        return;
      }
      const targetPlayer = room.players.find(
        (p: Player) => p.id === data.targetPlayerId
      );
      if (!targetPlayer) {
        console.warn(
          `[PERFORM_ACTION] Target player not found: ${data.targetPlayerId}`
        );
        return;
      }
      const actionType = data.actionType as ActionType;
      let value = 0;
      if (actionType === ActionType.ATTACK) {
        value = room.config.attackDamage;
        targetPlayer.health = Math.max(0, targetPlayer.health - value);
        if (targetPlayer.health <= 0) {
          targetPlayer.eliminationTime = Date.now();
          if (playerTimers.has(targetPlayer.id)) {
            clearInterval(playerTimers.get(targetPlayer.id)!);
            playerTimers.delete(targetPlayer.id);
          }
          io.to(roomId).emit(GameEvents.PLAYER_ELIMINATED, {
            timestamp: Date.now(),
            playerId: targetPlayer.id,
          });
          const alivePlayers = room.players.filter((p: Player) => p.health > 0);
          if (alivePlayers.length <= 1) {
            endGame(roomId, io);
            return;
          }
        }
      } else if (actionType === ActionType.HEAL) {
        value = room.config.healAmount;
        player.health += value;
      }
      player.canPerformAction = false;
      io.to(roomId).emit(GameEvents.ACTION_PERFORMED, {
        timestamp: Date.now(),
        action: {
          timestamp: Date.now(),
          type: actionType,
          sourcePlayerId: socket.id,
          targetPlayerId: data.targetPlayerId,
          value,
        },
      });
      sendHealthUpdates(roomId, io);
      broadcastRoomUpdate(roomId, io);
      setTimeout(() => {
        try {
          sendQuestionToPlayer(socket.id, roomId, io);
        } catch (err) {
          console.error(
            `[PERFORM_ACTION] Exception in sendQuestionToPlayer:`,
            err
          );
        }
      }, 1000);
    } catch (err) {
      console.error(`[PERFORM_ACTION] Exception:`, err);
      socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Internal server error',
      });
    }
  });
};
