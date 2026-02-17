import { useRef, useEffect } from "react";
import { Button, Group, Container } from "@mantine/core";
import * as pixi from "pixi.js";
import DrawManager from "../utils/DrawManager";
import { useParams } from "react-router-dom";
import { EnvVars } from "../config/env-vars";

const wsbaseurl = EnvVars.wsBaseUrl;
//this is dumb and will be deleted later
interface wsm {
  type: string;
  payload: any;
}

export const RoomPage = () => {
  const drawerRef = useRef<DrawManager | null>(null);
  const pixiContainer = useRef<HTMLDivElement>(null);
  const appRef = useRef<pixi.Application | null>(null);
  const { id } = useParams();
  const wsRef = useRef<WebSocket | null>(null);

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

    const ws = new WebSocket(wsbaseurl + `/rooms/${id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data: wsm = JSON.parse(event.data);
        /*
        if data.type == img: drawerRef.current.loadbg(data.payload)
        if data.type == stroke: drawerRef.current.drawstroke(data.payload)
        */
        console.log(data.type);
        console.log(data.payload);
      } catch (error) {
        console.error(error);
      }
    };

    initPixi();

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000);
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
