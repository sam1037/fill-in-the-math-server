// Socket connection events
export enum ConnectionEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
}

// Room management events
export enum RoomEvents {
  CREATE_ROOM = 'create_room',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  UPDATE_SETTINGS = 'update_settings',
  ROOM_CREATED = 'room_created',
  ROOM_JOINED = 'room_joined',
  ROOM_LEFT = 'room_left',
  ROOM_UPDATED = 'room_updated',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
}

// Game play events
export enum GameEvents {
  START_GAME = 'start_game',
  GAME_STARTED = 'game_started',
  GAME_ENDED = 'game_ended',
  GET_QUESTION = 'get_question',
  QUESTION_RECEIVED = 'question_received',
  SUBMIT_ANSWER = 'submit_answer',
  ANSWER_RESULT = 'answer_result',
  PERFORM_ACTION = 'perform_action',
  ACTION_PERFORMED = 'action_performed',
  HEALTH_UPDATED = 'health_updated',
  PLAYER_ELIMINATED = 'player_eliminated',
  LEADERBOARD_UPDATED = 'leaderboard_updated',
}
