export const apiHost = () => {
  let port = window.location.port;
  if (process.env.NODE_ENV === "development") {
    port = "3000";
  }
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
};
