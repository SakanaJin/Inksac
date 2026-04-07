import { useRef, useEffect, useState } from "react";
import { Box } from "@mantine/core";
import { modals } from "@mantine/modals";
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
  type RoomGetDto,
} from "../constants/types";
import { notifications } from "@mantine/notifications";
import { routes } from "../routes/RouteIndex";
import { useRoomLayout } from "../components/layout/room-layout";
import { RoomLoadingOverlay } from "../components/layout/room-loading-overlay";
import api from "../config/axios";

const wsbaseurl = EnvVars.wsBaseUrl;
const LOADER_MIN_DURATION_MS = 2000;

export const RoomPage = () => {
  const drawerRef = useRef<DrawManager | null>(null);
  const pixiContainer = useRef<HTMLDivElement>(null);
  const appRef = useRef<pixi.Application | null>(null);
  const { id } = useParams();
  const wsRef = useRef<WSManager | null>(null);
  const navigate = useNavigate();
  const {
    registerBrushSelect,
    registerSetErase,
    setBrushInUse,
    registerUndo,
    registerRedo,
    registerResetView,
    registerExport,
    setHistoryState,
    color,
    strokeScale,
    setUsers,
    addUser,
    removeUser,
  } = useRoomLayout();
  const colorRef = useRef(color);
  const strokeScaleRef = useRef(strokeScale);

  const [isCanvasDataReady, setIsCanvasDataReady] = useState(false);
  const [hasShownLoaderOnce, setHasShownLoaderOnce] = useState(false);

  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  const BASE_MIN_ZOOM = 0.25;
  const MAX_ZOOM = 4;
  const ZOOM_STEP = 1.1;

  const canShowCanvas = isCanvasDataReady && hasShownLoaderOnce;

  const refreshHistoryState = () => {
    setHistoryState(
      drawerRef.current?.canUndo() ?? false,
      drawerRef.current?.canRedo() ?? false,
    );
  };

  const getFitScale = () => {
    if (!drawerRef.current || !pixiContainer.current) return BASE_MIN_ZOOM;

    const { width: canvasWidth, height: canvasHeight } =
      drawerRef.current.getCanvasSize();

    const viewportWidth = pixiContainer.current.clientWidth;
    const viewportHeight = pixiContainer.current.clientHeight;

    if (
      viewportWidth <= 0 ||
      viewportHeight <= 0 ||
      canvasWidth <= 0 ||
      canvasHeight <= 0
    ) {
      return BASE_MIN_ZOOM;
    }

    return Math.min(viewportWidth / canvasWidth, viewportHeight / canvasHeight);
  };

  const fitCanvasToViewport = () => {
    if (!drawerRef.current || !pixiContainer.current) return;

    const world = drawerRef.current.getWorldContainer();
    const { width: canvasWidth, height: canvasHeight } =
      drawerRef.current.getCanvasSize();

    const viewportWidth = pixiContainer.current.clientWidth;
    const viewportHeight = pixiContainer.current.clientHeight;

    if (
      viewportWidth <= 0 ||
      viewportHeight <= 0 ||
      canvasWidth <= 0 ||
      canvasHeight <= 0
    ) {
      return;
    }

    const scale = getFitScale();

    world.scale.set(scale);
    world.position.set(
      (viewportWidth - canvasWidth * scale) / 2,
      (viewportHeight - canvasHeight * scale) / 2,
    );
  };

  const openExportModal = () => {
    modals.openContextModal({
      modal: "exportmodal",
      title: "Download canvas",
      centered: true,
      innerProps: {
        onSubmit: async ({
          format,
          transparentBackground,
          scale,
        }: {
          format: "png" | "jpg";
          transparentBackground: boolean;
          scale: 1 | 2;
        }) => {
          if (!drawerRef.current) return;
          await drawerRef.current.exportCanvas({
            format,
            transparentBackground,
            scale,
          });
        },
      },
    });
  };

  useEffect(() => {
    registerBrushSelect((brush) => {
      drawerRef.current?.setActiveBrush(brush);
    });

    registerUndo(() => {
      drawerRef.current?.undo();
      refreshHistoryState();
    });

    registerRedo(() => {
      drawerRef.current?.redo();
      refreshHistoryState();
    });

    registerResetView(() => {
      fitCanvasToViewport();
    });

    registerExport(() => {
      openExportModal();
    });
  }, [
    registerBrushSelect,
    registerUndo,
    registerRedo,
    registerResetView,
    registerExport,
  ]);

  useEffect(() => {
    drawerRef.current?.setColor(color);
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    registerSetErase((erase) => {
      drawerRef.current?.setErase(erase);
    });
  }, [registerSetErase]);

  useEffect(() => {
    drawerRef.current?.setStrokeScale(strokeScale);
  }, [strokeScale]);

  useEffect(() => {
    setHasShownLoaderOnce(false);

    const timeout = window.setTimeout(() => {
      setHasShownLoaderOnce(true);
    }, LOADER_MIN_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [id]);

  const messageHandlers: MessageHandlers = {
    [WSType.STROKE]: async (message) => {
      if (drawerRef.current && message.data) {
        await drawerRef.current.receiveStroke(message.data as StrokeGetDto);
        refreshHistoryState();
      }
    },
    [WSType.UNDO]: async (message) => {
      if (drawerRef.current && message.data) {
        await drawerRef.current.undoStroke(message.data as number);
        refreshHistoryState();
      }
    },
    [WSType.REDO]: async (message) => {
      if (drawerRef.current && message.data) {
        await drawerRef.current.redoStroke(message.data as StrokeGetDto);
        refreshHistoryState();
      }
    },
    [WSType.READY]: async (message) => {
      if (drawerRef.current && message.data) {
        await drawerRef.current.receiveInit(message.data as StrokeGetDto[]);
        fitCanvasToViewport();
        refreshHistoryState();
        setIsCanvasDataReady(true);
      }
    },
    [WSType.INITUSERS]: async (message) => {
      setUsers(message.data);
    },
    [WSType.USERJOIN]: async (message) => {
      addUser(message.data);
    },
    [WSType.USERLEAVE]: async (message) => {
      removeUser(message.data);
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
    if (!pixiContainer.current || appRef.current || !id) return;

    let canvas: HTMLCanvasElement | null = null;
    let isMounted = true;

    setIsCanvasDataReady(false);

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return;

      e.preventDefault();
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current || !drawerRef.current) return;

      const world = drawerRef.current.getWorldContainer();
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;

      world.position.x += dx;
      world.position.y += dy;

      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isPanningRef.current = false;
    };

    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!drawerRef.current || !pixiContainer.current) return;

      e.preventDefault();

      const world = drawerRef.current.getWorldContainer();
      const rect = pixiContainer.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldScale = world.scale.x;
      const zoomFactor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const FIT_ZOOM_MARGIN = 0.5;
      const dynamicMinZoom = Math.min(
        BASE_MIN_ZOOM,
        getFitScale() * FIT_ZOOM_MARGIN,
      );
      const newScale = Math.max(
        dynamicMinZoom,
        Math.min(MAX_ZOOM, oldScale * zoomFactor),
      );

      if (newScale === oldScale) return;

      const worldX = (mouseX - world.position.x) / oldScale;
      const worldY = (mouseY - world.position.y) / oldScale;

      world.scale.set(newScale);
      world.position.set(
        mouseX - worldX * newScale,
        mouseY - worldY * newScale,
      );
    };

    const initPixi = async () => {
      try {
        const roomResponse = await api.get<RoomGetDto>(`/rooms/${id}`);
        const room = roomResponse.data.data;

        if (!isMounted || !pixiContainer.current) return;

        const app = new pixi.Application();
        appRef.current = app;

        await app.init({
          width: pixiContainer.current.clientWidth,
          height: pixiContainer.current.clientHeight,
          background: "#323232",
          resizeTo: pixiContainer.current,
        });

        if (!isMounted || !pixiContainer.current) return;

        pixiContainer.current.appendChild(app.canvas);
        canvas = app.canvas;

        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("auxclick", handleAuxClick);
        canvas.addEventListener("wheel", handleWheel, { passive: false });
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        const ws = new WSManager(
          wsbaseurl + `/rooms/${id}`,
          messageHandlers,
          closeHandlers,
        );
        wsRef.current = ws;

        await wsRef.current.connect();

        if (!isMounted) return;

        drawerRef.current = new DrawManager(
          app,
          wsRef.current,
          room.width,
          room.height,
        );

        drawerRef.current.setOnStroke((brushId) => setBrushInUse(brushId));
        await drawerRef.current.init();

        if (room.imgurl) {
          await drawerRef.current.loadBaseImage(room.imgurl);
        }

        drawerRef.current.setColor(colorRef.current);
        drawerRef.current.setStrokeScale(strokeScaleRef.current);
        refreshHistoryState();

        const message: WSMessage = { Mtype: WSType.READY, data: true };
        wsRef.current.send(message);
      } catch (error) {
        console.error("Failed to initialize room", error);
        notifications.show({
          title: "Room",
          message: "Failed to load room.",
          color: "red",
        });
        navigate(routes.home);
      }
    };

    initPixi();

    return () => {
      isMounted = false;

      if (canvas) {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("auxclick", handleAuxClick);
        canvas.removeEventListener("wheel", handleWheel);
      }

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (wsRef.current && wsRef.current.isOpen()) {
        wsRef.current.close();
      }

      appRef.current = null;
      drawerRef.current = null;
    };
  }, [id, navigate, setBrushInUse]);

  return (
    <Box
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {!canShowCanvas && <RoomLoadingOverlay />}

      <Box
        ref={pixiContainer}
        style={{
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          visibility: canShowCanvas ? "visible" : "hidden",
        }}
      />
    </Box>
  );
};
