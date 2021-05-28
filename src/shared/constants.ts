export const GRID_SIZE = 70;

export const USE_CONCURRENT_MODE = true as boolean;

export const TOKEN_SIZES = [0.5, 1, 2, 3, 4, 8, 16].map(
  (size) => size * GRID_SIZE
);

export const SOCKET_IO_PATH = "/api/socket.io";

export const LAST_MIGRATION_VERSION = 2;
