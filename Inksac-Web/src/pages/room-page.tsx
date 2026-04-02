import { useRef, useEffect } from "react";
import { Button, Group, Container } from "@mantine/core";
import * as pixi from "pixi.js";
import DrawManager from "../utils/DrawManager";
import { useNavigate, useParams } from "react-router-dom";
import { EnvVars } from "../config/env-vars";
import {
  type CloseHandlers,
  type MessageHandlers,
  WSManager,
} from "../config/websocket-manager";
import {
  WSCodes,
  WSType,
  type StrokeGetDto,
  type WSMessage,
} from "../constants/types";
import { notifications } from "@mantine/notifications";
import { routes } from "../routes/RouteIndex";
import { useRoomLayout } from "../components/layout/room-layout";

const wsbaseurl = EnvVars.wsBaseUrl;

export const RoomPage = () => {
  const drawerRef = useRef<DrawManager | null>(null);
  const pixiContainer = useRef<HTMLDivElement>(null);
  const appRef = useRef<pixi.Application | null>(null);
  const { id } = useParams();
  const wsRef = useRef<WSManager | null>(null);
  const navigate = useNavigate();
  const { registerBrushSelect, registerSetErase, color } = useRoomLayout();
  const colorRef = useRef(color);

  useEffect(() => {
    registerBrushSelect((brush) => {
      drawerRef.current?.setActiveBrush(brush);
    });
  }, [registerBrushSelect]);

  useEffect(() => {
    drawerRef.current?.setColor(color);
  }, [color]);

  useEffect(() => {
  registerSetErase((erase) => {
    drawerRef.current?.setErase(erase);
  });
}, [registerSetErase]);

  const messageHandlers: MessageHandlers = {
    [WSType.STROKE]: async (message) => {
      if (drawerRef.current && message.data) {
        await drawerRef.current.receiveStroke(message.data as StrokeGetDto);
      }
    },
    [WSType.UNDO]: async (message) => {
      if (drawerRef.current && message.data) {
        await drawerRef.current.undoStroke(message.data as number);
      }
    },
    [WSType.REDO]: async (message) => {
      if (drawerRef.current && message.data) {
        await drawerRef.current.redoStroke(message.data as StrokeGetDto);
      }
    },
    [WSType.READY]: async (message) => {
      if (drawerRef.current && message.data) {
        await drawerRef.current.receiveInit(message.data as StrokeGetDto[]);
      }
    },
  };

  const closeHandlers: CloseHandlers = {
    [WSCodes.FORCE_DC]: (event) => {
      console.error("Connection closed, ", event.reason);
      notifications.show({
        title: "Connection",
        message: `Connection closed, ${event.reason}`,
        color: "red",
      });
      navigate(routes.home);
    },
    [WSCodes.POLICY_VIOLATION]: (event) => {
      console.error("Connection refused, ", event.reason);
      notifications.show({
        title: "Connection",
        message: `Connection refused, ${event.reason}`,
        color: "red",
      });
      navigate(routes.home);
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

      const ws = new WSManager(
        wsbaseurl + `/rooms/${id}`,
        messageHandlers,
        closeHandlers,
      );
      wsRef.current = ws;

      await wsRef.current.connect();

      drawerRef.current = new DrawManager(app, wsRef.current);
      await drawerRef.current.init();

      drawerRef.current.setColor(colorRef.current);

      const message: WSMessage = { Mtype: WSType.READY, data: true };
      wsRef.current.send(message);
    };

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
    <Container size="100%" style={{ padding: "60px", overflow: "hidden" }}>
      <Group align="flex-start" wrap="nowrap" style={{ overflow: "hidden" }}>
        <div
          ref={pixiContainer}
          style={{
            flex: 1,
            height: "80vh",
            minWidth: 0,
          }}
        />
      </Group>

      <Group justify="center" mt="md">
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
