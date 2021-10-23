import { render } from "./render";
import io from "socket.io-client";
import { SOCKET_IO_PATH, SOCKET_SERVER_INFO } from "../shared/constants";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    if (process.env.NODE_ENV === "production") {
      await navigator.serviceWorker.register("/service-worker.js");
    } else {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister())
      );
    }
  });
}

// Create a new socket, but do not connect yet
const socket = io("/", {
  path: SOCKET_IO_PATH,
  autoConnect: false,
});

// test 12312

// Auto refresh the page if the client code is rebuilt.
socket.on(
  SOCKET_SERVER_INFO,
  async (serverInfo: {
    version: string;
    clientBuildHash: string | null;
    env: string;
  }) => {
    console.log(`Git version: ${serverInfo.version}`);
    console.log(
      `Client code build hash : ${
        serverInfo.clientBuildHash ?? "null"
      } (server) ${String(__webpack_hash__)} (client)`
    );
    console.log(`Server Env: ${serverInfo.env}`);
    console.log(`Client Env: ${process.env.NODE_ENV}`);

    if (
      process.env.NODE_ENV === "production" &&
      serverInfo.clientBuildHash !== null &&
      serverInfo.clientBuildHash !== __webpack_hash__
    ) {
      // The client code has updated on the server, and the user has not
      // refreshed the page. We also set the location hash to avoid endless
      // redirects.
      console.warn("The client code has been updated on the server.");

      if ("serviceWorker" in navigator) {
        console.warn("Updating service workers.");
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(async (registration) => {
            await registration.update();
            await Promise.all(
              [
                registration.installing,
                registration.waiting,
                registration.active,
              ].map(
                async (serviceWorker) =>
                  new Promise<void>((resolve, reject) => {
                    if (!serviceWorker || serviceWorker.state === "activated") {
                      resolve();
                      return;
                    }

                    const stateChangeHandler = (event: Event) => {
                      if (
                        (event.target as ServiceWorker).state === "activated"
                      ) {
                        serviceWorker.removeEventListener(
                          "statechange",
                          stateChangeHandler
                        );
                        serviceWorker.removeEventListener(
                          "error",
                          errorHandler
                        );

                        resolve();
                      }
                    };
                    const errorHandler = () => {
                      serviceWorker.removeEventListener(
                        "statechange",
                        stateChangeHandler
                      );
                      serviceWorker.removeEventListener("error", errorHandler);

                      reject();
                    };

                    serviceWorker.addEventListener(
                      "statechange",
                      stateChangeHandler
                    );
                    serviceWorker.addEventListener("error", errorHandler);
                  })
              )
            );
          })
        );
      }

      console.warn("Reloading page.");
      window.location.reload();
      return;
    }

    if (serverInfo.env !== "production" && window.location.port === "3000") {
      // If we happen to connect to a server that is not running in production,
      // and we appear to be running on localhost, redirect to the dev version of
      // the frontend.
      // This may happen because the production client installs a service worker
      // which may cause confusion to the developer when they are trying to
      // develop the app.
      console.warn(
        "It looks like you might be a developer - redirecting to the correct frontend."
      );
      window.location.port = "3001";
      return;
    }
  }
);

// Render the app
render(socket);
// Now connect the socket
socket.connect();

// Clear browser console on hot reload. This helps with the performance of the
// console, which can become very slow when many messages accumulate over time.
// https://github.com/webpack/webpack-dev-server/issues/565#issuecomment-449979431
if (module.hot) {
  module.hot.addStatusHandler((status) => {
    if (status === "prepare") {
      console.clear();
      console.log(
        "Console has been cleared due to hot reload. To adjust this behavior, see src/client/client.ts"
      );
    }
  });
}
