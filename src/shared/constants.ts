export const GRID_SIZE = 70;

export const TOKEN_SIZES = [0.5, 1, 2, 3, 4, 8, 16].map(
  (size) => size * GRID_SIZE
);

export const SOCKET_IO_PATH = "/api/socket.io";

export const DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME = 500;

export const FORCE_COMMIT_FIELD_VALUE_AFTER = 5 * 1000;

export const STORE_SUBSCRIPTION_THROTTLE = 100;

export const LAST_MIGRATION_VERSION = 42;

export const SYNC_MY_MOUSE_POSITION = true as boolean;

export const DEFAULT_BACKGROUND_IMAGE_HEIGHT = 10 * GRID_SIZE;

export const SOCKET_SET_PLAYER_ID = "SET_PLAYER_ID";

export const SOCKET_SET_STATE = "SET_STATE";

export const SOCKET_PATCH_STATE = "PATCH_STATE";

export const SOCKET_DISPATCH_ACTION = "REDUX_ACTION";

export const SOCKET_BROADCAST_MSG = "MESSAGE";

export const SOCKET_SERVER_INFO = "SERVER_INFO";

export const DEFAULT_VOLUME = 0.5;

export const IMAGE_TILE_SIZE = 256;
