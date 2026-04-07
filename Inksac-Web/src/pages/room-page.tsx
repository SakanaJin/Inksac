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
  type BrushGetDto,
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
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
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
    toggleSidebar,
    strokeScale,
    setStrokeScale,
    erase,
    setErase,
  } = useRoomLayout();

  const colorRef = useRef(color);
  const strokeScaleRef = useRef(strokeScale);
  const exportModalOpenRef = useRef(false);
  const browserCursorRef = useRef<React.CSSProperties["cursor"]>("default");

  const [spacePanActive, setSpacePanActive] = useState(false);

  const [isCanvasDataReady, setIsCanvasDataReady] = useState(false);
  const [hasShownLoaderOnce, setHasShownLoaderOnce] = useState(false);

  const [activeBrush, setActiveBrush] = useState<BrushGetDto | null>(null);
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
  const [isOverDrawableArea, setIsOverDrawableArea] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorScale, setCursorScale] = useState(1);

  const isPanningRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);

  const BASE_MIN_ZOOM = 0.25;
  const MAX_ZOOM = 4;
  const ZOOM_STEP = 1.1;

  const updateCursor = () => {
    const cursor = isPanningRef.current
      ? "grabbing"
      : isSpacePressedRef.current
        ? "grab"
        : "default";

    if (pixiContainer.current) {
      pixiContainer.current.style.cursor = cursor;
    }

    if (overlayRef.current) {
      overlayRef.current.style.cursor = cursor;
    }
  };

  const canShowCanvas = isCanvasDataReady && hasShownLoaderOnce;

  const refreshCursorScale = () => {
    const nextScale = drawerRef.current?.getWorldContainer().scale.x ?? 1;
    setCursorScale(nextScale);
  };

  const getDisplayedCursorSize = () => {
    const scaled = strokeScale * cursorScale;
    return Math.max(8, scaled);
  };

  const getDrawableScreenRect = () => {
    if (!drawerRef.current || !pixiContainer.current) return null;

    const world = drawerRef.current.getWorldContainer();
    const { width, height } = drawerRef.current.getCanvasSize();
    const rect = pixiContainer.current.getBoundingClientRect();

    return {
      left: rect.left + world.position.x,
      top: rect.top + world.position.y,
      width: width * world.scale.x,
      height: height * world.scale.y,
    };
  };

  const updateCursorTrackingFromClientPoint = (
    clientX: number,
    clientY: number,
  ) => {
    if (!pixiContainer.current) return;

    const rect = pixiContainer.current.getBoundingClientRect();

    setCursorPos({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });

    const drawableRect = getDrawableScreenRect();

    if (!drawableRect) {
      setIsOverDrawableArea(false);
      return;
    }

    const insideDrawableArea =
      clientX >= drawableRect.left &&
      clientX <= drawableRect.left + drawableRect.width &&
      clientY >= drawableRect.top &&
      clientY <= drawableRect.top + drawableRect.height;

    setIsOverDrawableArea(insideDrawableArea);
  };

  const shouldShowBrushCursor =
    canShowCanvas &&
    isHoveringCanvas &&
    isOverDrawableArea &&
    !spacePanActive &&
    !isPanningRef.current;

  const browserCursor: React.CSSProperties["cursor"] = isPanningRef.current
    ? "grabbing"
    : isSpacePressedRef.current
      ? "grab"
      : shouldShowBrushCursor
        ? "none"
        : "default";

  const syncCanvasCursor = () => {
    const currentCursor = browserCursorRef.current;

    if (pixiContainer.current) {
      pixiContainer.current.style.cursor = currentCursor;
    }

    if (canvasElementRef.current) {
      canvasElementRef.current.style.cursor = currentCursor;
    }

    if (overlayRef.current) {
      overlayRef.current.style.cursor = currentCursor;
    }
  };

  const beginPan = (clientX: number, clientY: number) => {
    isPanningRef.current = true;
    lastPanPosRef.current = { x: clientX, y: clientY };
    browserCursorRef.current = "grabbing";
    syncCanvasCursor();
  };

  const endPan = () => {
    isPanningRef.current = false;
    lastPanPosRef.current = null;
    browserCursorRef.current = isSpacePressedRef.current ? "grab" : "default";
    syncCanvasCursor();
  };

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

    refreshCursorScale();
  };

  const openExportModal = () => {
    if (exportModalOpenRef.current) return;

    exportModalOpenRef.current = true;

    modals.openContextModal({
      modal: "exportmodal",
      title: "Download canvas",
      centered: true,
      onClose: () => {
        exportModalOpenRef.current = false;
      },
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

          try {
            await drawerRef.current.exportCanvas({
              format,
              transparentBackground,
              scale,
            });
          } finally {
            exportModalOpenRef.current = false;
          }
        },
      },
    });
  };

  useEffect(() => {
    registerBrushSelect((brush) => {
      setActiveBrush(brush);
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
    registerSetErase((nextErase) => {
      drawerRef.current?.setErase(nextErase);
    });
  }, [registerSetErase]);

  useEffect(() => {
    drawerRef.current?.setErase(erase);
  }, [erase]);

  useEffect(() => {
    browserCursorRef.current = browserCursor;
    syncCanvasCursor();
  }, [
    browserCursor,
    isHoveringCanvas,
    isOverDrawableArea,
    spacePanActive,
    erase,
    activeBrush,
    strokeScale,
    cursorScale,
  ]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;

      const tagName = target.tagName.toLowerCase();
      return (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        openExportModal();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();

        if (e.shiftKey) {
          drawerRef.current?.redo();
        } else {
          drawerRef.current?.undo();
        }

        refreshHistoryState();
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        setErase(!erase);
        return;
      }

      if (e.key === "[") {
        e.preventDefault();
        setStrokeScale(Math.max(1, strokeScale - 4));
        return;
      }

      if (e.key === "]") {
        e.preventDefault();
        setStrokeScale(Math.min(512, strokeScale + 4));
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();

        if (!isSpacePressedRef.current) {
          isSpacePressedRef.current = true;
          setSpacePanActive(true);
          browserCursorRef.current = "grab";
          syncCanvasCursor();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        setSpacePanActive(false);
        endPan();
      }
    };

    const handleWindowBlur = () => {
      isSpacePressedRef.current = false;
      setSpacePanActive(false);
      endPan();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [toggleSidebar, erase, setErase, strokeScale, setStrokeScale]);

  useEffect(() => {
    drawerRef.current?.setStrokeScale(strokeScale);
    strokeScaleRef.current = strokeScale;
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
      beginPan(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (
        !drawerRef.current ||
        !isPanningRef.current ||
        !lastPanPosRef.current
      ) {
        return;
      }

      const world = drawerRef.current.getWorldContainer();
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;

      world.position.x += dx;
      world.position.y += dy;

      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      refreshCursorScale();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isPanningRef.current) return;

      updateCursorTrackingFromClientPoint(e.clientX, e.clientY);
      endPan();
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

      refreshCursorScale();
    };

    const handleCanvasPointerEnterCapture = (e: PointerEvent) => {
      setIsHoveringCanvas(true);
      updateCursorTrackingFromClientPoint(e.clientX, e.clientY);
      syncCanvasCursor();
    };

    const handleCanvasPointerLeaveCapture = () => {
      setIsHoveringCanvas(false);
      setIsOverDrawableArea(false);
      syncCanvasCursor();
    };

    const handleCanvasPointerMoveCapture = (e: PointerEvent) => {
      updateCursorTrackingFromClientPoint(e.clientX, e.clientY);
      syncCanvasCursor();
    };

    const handleCanvasPointerDownCapture = (e: PointerEvent) => {
      updateCursorTrackingFromClientPoint(e.clientX, e.clientY);
      syncCanvasCursor();

      window.requestAnimationFrame(() => {
        syncCanvasCursor();
      });
    };

    const handleCanvasPointerUpCapture = (e: PointerEvent) => {
      updateCursorTrackingFromClientPoint(e.clientX, e.clientY);
      syncCanvasCursor();

      window.requestAnimationFrame(() => {
        syncCanvasCursor();
      });
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
        canvasElementRef.current = canvas;

        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        syncCanvasCursor();

        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("auxclick", handleAuxClick);
        canvas.addEventListener("wheel", handleWheel, { passive: false });

        canvas.addEventListener(
          "pointerenter",
          handleCanvasPointerEnterCapture,
          true,
        );
        canvas.addEventListener(
          "pointerleave",
          handleCanvasPointerLeaveCapture,
          true,
        );
        canvas.addEventListener(
          "pointermove",
          handleCanvasPointerMoveCapture,
          true,
        );
        canvas.addEventListener(
          "pointerdown",
          handleCanvasPointerDownCapture,
          true,
        );
        canvas.addEventListener(
          "pointerup",
          handleCanvasPointerUpCapture,
          true,
        );
        canvas.addEventListener(
          "pointercancel",
          handleCanvasPointerUpCapture,
          true,
        );

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
          room.canvas_color,
        );

        drawerRef.current.setOnStroke((brushId) => setBrushInUse(brushId));
        await drawerRef.current.init();

        if (room.imgurl) {
          await drawerRef.current.loadBaseImage(room.imgurl);
        }

        drawerRef.current.setColor(colorRef.current);
        drawerRef.current.setStrokeScale(strokeScaleRef.current);
        drawerRef.current.setErase(erase);
        refreshCursorScale();
        refreshHistoryState();
        syncCanvasCursor();

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

        canvas.removeEventListener(
          "pointerenter",
          handleCanvasPointerEnterCapture,
          true,
        );
        canvas.removeEventListener(
          "pointerleave",
          handleCanvasPointerLeaveCapture,
          true,
        );
        canvas.removeEventListener(
          "pointermove",
          handleCanvasPointerMoveCapture,
          true,
        );
        canvas.removeEventListener(
          "pointerdown",
          handleCanvasPointerDownCapture,
          true,
        );
        canvas.removeEventListener(
          "pointerup",
          handleCanvasPointerUpCapture,
          true,
        );
        canvas.removeEventListener(
          "pointercancel",
          handleCanvasPointerUpCapture,
          true,
        );
      }

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (pixiContainer.current) {
        pixiContainer.current.style.cursor = "default";
      }

      canvasElementRef.current = null;

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
        onMouseEnter={() => {
          setIsHoveringCanvas(true);
        }}
        onMouseLeave={() => {
          setIsHoveringCanvas(false);
          setIsOverDrawableArea(false);
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();

          setCursorPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });

          const drawableRect = getDrawableScreenRect();

          if (!drawableRect) {
            setIsOverDrawableArea(false);
            return;
          }

          const insideDrawableArea =
            e.clientX >= drawableRect.left &&
            e.clientX <= drawableRect.left + drawableRect.width &&
            e.clientY >= drawableRect.top &&
            e.clientY <= drawableRect.top + drawableRect.height;

          setIsOverDrawableArea(insideDrawableArea);
        }}
        style={{
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          visibility: canShowCanvas ? "visible" : "hidden",
          cursor: browserCursor,
        }}
      />

      {shouldShowBrushCursor ? (
        <Box
          style={{
            position: "absolute",
            left: cursorPos.x,
            top: cursorPos.y,
            width: getDisplayedCursorSize(),
            height: getDisplayedCursorSize(),
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          <Box
            style={{
              position: "absolute",
              inset: 0,
              border: `1px solid ${erase ? "#ff8383" : "white"}`,
              borderRadius: "50%",
              boxShadow: "0 0 0 1px black",
            }}
          />

          <Box
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: Math.max(6, getDisplayedCursorSize() * 0.2),
              height: 1,
              background: "white",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 0 1px black",
            }}
          />

          <Box
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 1,
              height: Math.max(6, getDisplayedCursorSize() * 0.2),
              background: "white",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 0 1px black",
            }}
          />
        </Box>
      ) : null}

      {canShowCanvas && spacePanActive ? (
        <Box
          ref={overlayRef}
          onMouseDown={(e) => {
            if (e.button !== 0) return;

            e.preventDefault();
            e.stopPropagation();
            beginPan(e.clientX, e.clientY);
          }}
          onDragStart={(e) => {
            e.preventDefault();
          }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1000,
            background: "transparent",
            cursor: isPanningRef.current ? "grabbing" : "grab",
          }}
        />
      ) : null}
    </Box>
  );
};
