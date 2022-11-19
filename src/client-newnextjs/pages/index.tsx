import type { NextPage } from 'next'
import Head from 'next/head'
import React, { useLayoutEffect, useState } from "react"
import { io, Socket } from "socket.io-client"
import { Root } from "../../client/render"
import { SOCKET_IO_PATH } from "../../shared/constants"

const Home: NextPage = () => {
  const [socket, setSocket] = useState<Socket|null>(null);

  useLayoutEffect(() => {
    const socket = io("/", {
      path: SOCKET_IO_PATH,
      autoConnect: false,
    });

    socket.connect();

    setSocket(socket);

    return () => {
      socket.disconnect();
    }
  }, []);

  return (
    <>
      <Head>
        <title>Roc & Roll</title>
      </Head>
      {socket && <Root socket={socket} />}
    </>
  )
}

export default Home
