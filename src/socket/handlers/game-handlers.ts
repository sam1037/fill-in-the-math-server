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
  startPlayerTimer,
  sendQuestionToPlayer,
  applyWrongAnswerPenalty,
  endGame,
} from '../../utils/game-logic.js';
import { rooms, playerRooms, playerTimers } from '../../state/game-state.js';

export const setupGameHandlers = (io: Server, socket: Socket) => {
  socket.on(GameEvents.START_GAME, (data: StartGameRequest) => {
    const room = rooms.get(data.roomId);

    if (!room) {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Room not found',
      });
    }

    if (socket.id !== room.hostId) {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Only host can start the game',
      });
    }

    if (room.players.length < 2) {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Need at least 2 players to start',
      });
    }

    // Set initial health for all players
    room.players.forEach((player: Player) => {
      player.health = room.config.timeLimit;
      player.score = 0;
      player.currentQuestionIndex = 0;
    });

    room.status = RoomStatus.IN_PROGRESS;

    // Notify all players
    io.to(data.roomId).emit(GameEvents.GAME_STARTED, {
      timestamp: Date.now(),
      room,
    });

    // Start timers for all players
    room.players.forEach((player: Player) => {
      startPlayerTimer(player.id, data.roomId, io);
      // Auto-send first question to each player
      sendQuestionToPlayer(player.id, data.roomId, io);
    });

    // Broadcast updated room state to all
    broadcastRoomUpdate(data.roomId, io);
  });

  socket.on(GameEvents.GET_QUESTION, (data: GetQuestionRequest) => {
    sendQuestionToPlayer(socket.id, data.roomId, io);
  });

  socket.on(GameEvents.SUBMIT_ANSWER, (data: SubmitAnswerRequest) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || room.status !== RoomStatus.IN_PROGRESS) return;

    const player = room.players.find((p: Player) => p.id === socket.id);
    if (!player || player.health <= 0) return;

    // Check if player has a current question
    if (!player.currentQuestion) {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'No active question to answer',
      });
    }

    // Validate against the stored question
    const isCorrect = data.answer === player.currentQuestion.answer;

    if (isCorrect) {
      player.score += 10;
      player.currentQuestionIndex++;
      player.canPerformAction = true; // Mark player as eligible to perform an action

      // Broadcast updated player scores to everyone in the room
      broadcastRoomUpdate(roomId, io);
    } else {
      // Incorrect answer handling
      // Apply the wrong answer penalty
      applyWrongAnswerPenalty(socket.id, roomId, io);
    }

    // Send result to player
    socket.emit(GameEvents.ANSWER_RESULT, {
      timestamp: Date.now(),
      correct: isCorrect,
      correctAnswer: player.currentQuestion.answer,
      canPerformAction: isCorrect,
    });

    // Clear the current question
    player.currentQuestion = undefined;
  });

  socket.on(GameEvents.PERFORM_ACTION, (data: PerformActionRequest) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || room.status !== RoomStatus.IN_PROGRESS) return;

    const player = room.players.find((p: Player) => p.id === socket.id);
    if (!player || player.health <= 0) return;

    // Check if the player is eligible to perform an action
    if (!player.canPerformAction) {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'You must answer correctly before performing an action',
      });
    }

    const targetPlayer = room.players.find(
      (p: Player) => p.id === data.targetPlayerId
    );
    if (!targetPlayer) return;

    const actionType = data.actionType as ActionType;
    let value = 0;

    if (actionType === ActionType.ATTACK) {
      value = room.config.attackDamage;
      targetPlayer.health = Math.max(0, targetPlayer.health - value);

      // Check if target is eliminated
      if (targetPlayer.health <= 0) {
        if (playerTimers.has(targetPlayer.id)) {
          clearInterval(playerTimers.get(targetPlayer.id)!);
          playerTimers.delete(targetPlayer.id);
        }

        io.to(roomId).emit(GameEvents.PLAYER_ELIMINATED, {
          timestamp: Date.now(),
          playerId: targetPlayer.id,
        });

        // Check if game is over
        const alivePlayers = room.players.filter((p: Player) => p.health > 0);
        if (alivePlayers.length <= 1) {
          endGame(roomId, io);
          return;
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (actionType === ActionType.HEAL) {
      value = room.config.healAmount;
      player.health += value;
    }

    // Clear the action eligibility
    player.canPerformAction = false;

    // Notify about the action
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

    // Broadcast health updates to all players
    if (actionType === ActionType.ATTACK) {
      io.to(roomId).emit(GameEvents.HEALTH_UPDATED, {
        timestamp: Date.now(),
        playerId: data.targetPlayerId,
        newHealth: targetPlayer.health,
      });
    } else {
      io.to(roomId).emit(GameEvents.HEALTH_UPDATED, {
        timestamp: Date.now(),
        playerId: socket.id,
        newHealth: player.health,
      });
    }

    // Broadcast updated room state to all players
    broadcastRoomUpdate(roomId, io);

    // Send next question after action is performed
    setTimeout(() => {
      sendQuestionToPlayer(socket.id, roomId, io);
    }, 1000);
  });
};
