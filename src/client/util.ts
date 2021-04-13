export function apiHost() {
  let port = window.location.port;
  // Normally, the port corresponds to the current port.
  // However, ports are different in development -> force port 3000.
  if (process.env.NODE_ENV === "development") {
    port = "3000";
  }
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

export const isBrowser = typeof window !== "undefined";
