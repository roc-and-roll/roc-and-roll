import { render } from "./render";
import { Foo } from "../shared/shared";
import { apiHost } from "./util";
import io from "socket.io-client";

new Foo();

const socket = io(apiHost(), { autoConnect: false });
render(socket);
socket.connect();
