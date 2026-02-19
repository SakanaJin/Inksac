import { useRef, useEffect } from "react";
import { Button, Group, Container } from "@mantine/core";
import * as pixi from "pixi.js";
import DrawManager from "../utils/DrawManager";
import { useParams } from "react-router-dom";
import { EnvVars } from "../config/env-vars";
import { type MessageHandlers, WSManager } from "../config/websocket-manager";
import { WSType } from "../constants/types";

const wsbaseurl = EnvVars.wsBaseUrl;

export const RoomPage = () => {
  const drawerRef = useRef<DrawManager | null>(null);
  const pixiContainer = useRef<HTMLDivElement>(null);
  const appRef = useRef<pixi.Application | null>(null);
  const { id } = useParams();
  const wsRef = useRef<WSManager | null>(null);

  const messageHandlers: MessageHandlers = {
    [WSType.STROKE]: (message) => {
      console.log(message.Mtype);
      console.log(message.data);
    },
  };

  useEffect(() => {
    if (!pixiContainer.current || appRef.current) return;

    const width = pixiContainer.current!.clientWidth;
    const height = pixiContainer.current!.clientHeight;

    const initPixi = async () => {
      const app = new pixi.Application();
      appRef.current = app;

      await app.init({
        width: width,
        height: height,
        background: "#636363",
        resizeTo: pixiContainer.current!,
      });

      pixiContainer.current!.appendChild(app.canvas);
      /*
      if !wsRef.current {err the fuck out}
      */
      drawerRef.current = new DrawManager(app, wsRef.current);
      drawerRef.current.init();
    };

    const ws = new WSManager(wsbaseurl + `/rooms/${id}`, messageHandlers);
    wsRef.current = ws;
    wsRef.current.connect();

    initPixi();

    return () => {
      if (wsRef.current && wsRef.current.isOpen()) {
        wsRef.current.close();
      }
    };
  }, [id]);

  const handleUndo = () => {
    drawerRef.current?.undo();
  };

  const handleRedo = () => {
    drawerRef.current?.redo();
  };

  return (
    <Container size="100%" style={{ padding: "60px" }}>
      <Group justify="center">
        <Group h="80vh" w="80vw" ref={pixiContainer}></Group>
      </Group>
      <Group justify="center">
        <Button variant="filled" onClick={handleUndo}>
          Undo
        </Button>
        <Button variant="filled" onClick={handleRedo}>
          Redo
        </Button>
      </Group>
    </Container>
  );
};
