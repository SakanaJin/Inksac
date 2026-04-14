import { useRef, useEffect, useState, useLayoutEffect } from "react";
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
  type ReadyDataDto,
  type LayerGetDto,
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
  const eyedropperPreviewRef = useRef<HTMLDivElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<pixi.Application | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
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
    setColor,
    toggleSidebar,
    strokeScale,
    setStrokeScale,
    erase,
    setUsers,
    addUser,
    removeUser,
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    smoothingEnabled,
    smoothingStrength,
    pressureEnabled,
    pressureMinSize,
    pressureSensitivity,
    pressureStabilizationEnabled,
    pressureStabilizationStrength,
    taperInEnabled,
    taperInDistance,
    taperInStartSizePercent,
    taperOutEnabled,
    taperOutDistance,
    taperOutEndSizePercent,
    shapeType,
    activeTool,
    setActiveTool,
  } = useRoomLayout();

  const colorRef = useRef(color);
  const strokeScaleRef = useRef(strokeScale);
  const eraseRef = useRef(erase);
  const smoothingEnabledRef = useRef(smoothingEnabled);
  const smoothingStrengthRef = useRef(smoothingStrength);
  const pressureEnabledRef = useRef(pressureEnabled);
  const pressureMinSizeRef = useRef(pressureMinSize);
  const pressureSensitivityRef = useRef(pressureSensitivity);
  const pressureStabilizationEnabledRef = useRef(pressureStabilizationEnabled);
  const pressureStabilizationStrengthRef = useRef(
    pressureStabilizationStrength,
  );
  const taperInEnabledRef = useRef(taperInEnabled);
  const taperInDistanceRef = useRef(taperInDistance);
  const taperInStartSizePercentRef = useRef(taperInStartSizePercent);
  const taperOutEnabledRef = useRef(taperOutEnabled);
  const taperOutDistanceRef = useRef(taperOutDistance);
  const taperOutEndSizePercentRef = useRef(taperOutEndSizePercent);
  const shapeTypeRef = useRef(shapeType);
  const activeToolRef = useRef(activeTool);
  const setBrushInUseRef = useRef(setBrushInUse);
  const exportModalOpenRef = useRef(false);
  const browserCursorRef = useRef<React.CSSProperties["cursor"]>("default");

  const previousToolRef = useRef<"brush" | "eraser" | "eyedropper" | "shapes">(
    "brush",
  );
  const ctrlPressedRef = useRef(false);
  const ctrlEyedropperActiveRef = useRef(false);

  const [spacePanActive, setSpacePanActive] = useState(false);

  const [isCanvasDataReady, setIsCanvasDataReady] = useState(false);
  const [hasShownLoaderOnce, setHasShownLoaderOnce] = useState(false);

  const [activeBrush, setActiveBrush] = useState<BrushGetDto | null>(null);
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
  const [isOverDrawableArea, setIsOverDrawableArea] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorScale, setCursorScale] = useState(1);
  const [livePointerPressure, setLivePointerPressure] = useState(1);
  const [livePointerType, setLivePointerType] = useState("mouse");
  const [hoverSampleColor, setHoverSampleColor] = useState<string | null>(null);

  const isPanningRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);
  const panPointerIdRef = useRef<number | null>(null);

  const BASE_MIN_ZOOM = 0.25;
  const MAX_ZOOM = 4;
  const ZOOM_STEP = 1.1;

  const canShowCanvas = isCanvasDataReady && hasShownLoaderOnce;

  useEffect(() => {
    eraseRef.current = erase;
    smoothingEnabledRef.current = smoothingEnabled;
    smoothingStrengthRef.current = smoothingStrength;
    pressureEnabledRef.current = pressureEnabled;
    pressureMinSizeRef.current = pressureMinSize;
    pressureSensitivityRef.current = pressureSensitivity;
    pressureStabilizationEnabledRef.current = pressureStabilizationEnabled;
    pressureStabilizationStrengthRef.current = pressureStabilizationStrength;
    taperInEnabledRef.current = taperInEnabled;
    taperInDistanceRef.current = taperInDistance;
    taperInStartSizePercentRef.current = taperInStartSizePercent;
    taperOutEnabledRef.current = taperOutEnabled;
    taperOutDistanceRef.current = taperOutDistance;
    taperOutEndSizePercentRef.current = taperOutEndSizePercent;
    shapeTypeRef.current = shapeType;
    activeToolRef.current = activeTool;
  }, [
    erase,
    smoothingEnabled,
    smoothingStrength,
    pressureEnabled,
    pressureMinSize,
    pressureSensitivity,
    pressureStabilizationEnabled,
    pressureStabilizationStrength,
    taperInEnabled,
    taperInDistance,
    taperInStartSizePercent,
    taperOutEnabled,
    taperOutDistance,
    taperOutEndSizePercent,
    shapeType,
    activeTool,
  ]);

  useEffect(() => {
    setBrushInUseRef.current = setBrushInUse;
  }, [setBrushInUse]);

  useEffect(() => {
    if (!eyedropperPreviewRef.current) return;

    eyedropperPreviewRef.current.style.display =
      activeTool === "eyedropper" &&
      isHoveringCanvas &&
      isOverDrawableArea &&
      !spacePanActive &&
      !isPanningRef.current &&
      hoverSampleColor
        ? "block"
        : "none";
  }, [
    activeTool,
    isHoveringCanvas,
    isOverDrawableArea,
    spacePanActive,
    hoverSampleColor,
  ]);

  useEffect(() => {
    if (!eyedropperPreviewRef.current) return;
    eyedropperPreviewRef.current.style.background =
      hoverSampleColor ?? "transparent";
  }, [hoverSampleColor]);

  const refreshCursorScale = () => {
    const nextScale = drawerRef.current?.getWorldContainer().scale.x ?? 1;
    setCursorScale(nextScale);
  };

  const getCursorPressureMultiplier = () => {
    if (!pressureEnabled || livePointerType !== "pen") return 1;

    const minRatio = Math.max(0, Math.min(1, pressureMinSize / 100));
    const safePressure = Math.max(0.001, Math.min(1, livePointerPressure));
    const t = Math.max(0, Math.min(100, pressureSensitivity)) / 100;
    const exponent = 2.2 - t * 1.9;
    const curvedPressure = Math.pow(safePressure, exponent);

    return minRatio + (1 - minRatio) * curvedPressure;
  };

  const getDisplayedCursorSize = () => {
    const baseSize = strokeScale * cursorScale;
    const pressureAdjusted = baseSize * getCursorPressureMultiplier();
    return Math.max(8, pressureAdjusted);
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
    pressure?: number,
    pointerType?: string,
  ) => {
    if (!pixiContainer.current) return;

    const rect = pixiContainer.current.getBoundingClientRect();
    const nextX = clientX - rect.left;
    const nextY = clientY - rect.top;

    setCursorPos({
      x: nextX,
      y: nextY,
    });

    if (eyedropperPreviewRef.current) {
      eyedropperPreviewRef.current.style.transform = `translate3d(${nextX + 10}px, ${nextY - 24}px, 0)`;
    }

    if (typeof pressure === "number") {
      setLivePointerPressure(pressure > 0 ? pressure : 1);
    }

    if (pointerType) {
      setLivePointerType(pointerType);
    }

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
    !isPanningRef.current &&
    activeTool !== "eyedropper" &&
    activeTool !== "shapes";

  const browserCursor: React.CSSProperties["cursor"] = isPanningRef.current
    ? "grabbing"
    : isSpacePressedRef.current
      ? "grab"
      : canShowCanvas &&
          isHoveringCanvas &&
          isOverDrawableArea &&
          activeTool === "eyedropper"
        ? "crosshair"
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

  const beginPan = (pointerId: number, clientX: number, clientY: number) => {
    isPanningRef.current = true;
    panPointerIdRef.current = pointerId;
    lastPanPosRef.current = { x: clientX, y: clientY };
    browserCursorRef.current = "grabbing";
    syncCanvasCursor();
  };

  const endPan = () => {
    isPanningRef.current = false;
    panPointerIdRef.current = null;
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

  const forceRendererResize = () => {
    const app = appRef.current;
    const container = pixiContainer.current;
    const canvas = canvasElementRef.current;

    if (!app || !container) return;

    const width = Math.max(1, Math.floor(container.clientWidth));
    const height = Math.max(1, Math.floor(container.clientHeight));

    app.renderer.resize(width, height);
    app.stage.hitArea = new pixi.Rectangle(0, 0, width, height);

    if (canvas) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    refreshCursorScale();
  };

  useLayoutEffect(() => {
    forceRendererResize();
  });

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
    if (!drawerRef.current) return;

    drawerRef.current.setErase(erase);
    drawerRef.current.setActiveTool(activeTool);
    drawerRef.current.setShapeType(shapeType);
    drawerRef.current.setSmoothing(smoothingEnabled, smoothingStrength);
    drawerRef.current.setPressureSettings(
      pressureEnabled,
      pressureMinSize,
      pressureSensitivity,
    );
    drawerRef.current.setPressureStabilization(
      pressureStabilizationEnabled,
      pressureStabilizationStrength,
    );
    drawerRef.current.setTaperIn(
      taperInEnabled,
      taperInDistance,
      taperInStartSizePercent,
    );
    drawerRef.current.setTaperOut(
      taperOutEnabled,
      taperOutDistance,
      taperOutEndSizePercent,
    );
  }, [
    erase,
    activeTool,
    shapeType,
    smoothingEnabled,
    smoothingStrength,
    pressureEnabled,
    pressureMinSize,
    pressureSensitivity,
    pressureStabilizationEnabled,
    pressureStabilizationStrength,
    taperInEnabled,
    taperInDistance,
    taperInStartSizePercent,
    taperOutEnabled,
    taperOutDistance,
    taperOutEndSizePercent,
  ]);

  useEffect(() => {
    if (!drawerRef.current) return;

    drawerRef.current.setLayers(layers);

    if (activeLayerId !== null) {
      drawerRef.current.setActiveLayer(activeLayerId);
    }
  }, [layers, activeLayerId]);

  useEffect(() => {
    browserCursorRef.current = browserCursor;
    syncCanvasCursor();
  }, [
    browserCursor,
    isHoveringCanvas,
    isOverDrawableArea,
    spacePanActive,
    erase,
    activeTool,
    activeBrush,
    strokeScale,
    cursorScale,
    pressureEnabled,
    pressureMinSize,
    pressureSensitivity,
    livePointerPressure,
    livePointerType,
    hoverSampleColor,
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

      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        setActiveTool("brush");
        return;
      }

      if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        setActiveTool("eraser");
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

      if (e.key === "Control") {
        if (!ctrlPressedRef.current) {
          ctrlPressedRef.current = true;

          if (activeToolRef.current !== "eyedropper") {
            ctrlEyedropperActiveRef.current = true;
            previousToolRef.current = activeToolRef.current;
            setActiveTool("eyedropper");
          }
        }

        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        setSpacePanActive(false);
        endPan();
      }

      if (e.key === "Control") {
        ctrlPressedRef.current = false;

        if (ctrlEyedropperActiveRef.current) {
          ctrlEyedropperActiveRef.current = false;
          setActiveTool(previousToolRef.current);
        }

        setHoverSampleColor(null);
      }
    };

    const handleWindowBlur = () => {
      isSpacePressedRef.current = false;
      setSpacePanActive(false);
      endPan();

      ctrlPressedRef.current = false;

      if (ctrlEyedropperActiveRef.current) {
        ctrlEyedropperActiveRef.current = false;
        setActiveTool(previousToolRef.current);
      }

      setHoverSampleColor(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [toggleSidebar, strokeScale, setStrokeScale, setActiveTool]);

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
        const readyData = message.data as ReadyDataDto;

        setLayers(readyData.layers);
        setActiveLayerId(readyData.layers[0]?.id ?? null);

        await drawerRef.current.receiveInit(
          readyData.layers.map((layer) => ({
            ...layer,
            visible: true,
          })),
          readyData.strokes,
        );

        fitCanvasToViewport();
        refreshHistoryState();
        setIsCanvasDataReady(true);
      }
    },
    [WSType.LAYERS_SYNC]: async (message) => {
      if (!message.data) return;
      setLayers(message.data as LayerGetDto[]);
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
    let didInitApp = false;

    setIsCanvasDataReady(false);

    const handleCanvasPointerDownForPan = (e: PointerEvent) => {
      const isMiddleButton = e.button === 1;
      const isSpacePanLeftClick = spacePanActive && e.button === 0;

      if (!isMiddleButton && !isSpacePanLeftClick) return;

      e.preventDefault();

      if (canvas?.hasPointerCapture?.(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }

      beginPan(e.pointerId, e.clientX, e.clientY);
    };

    const handleWindowPointerMoveForPan = (e: PointerEvent) => {
      if (
        !drawerRef.current ||
        !isPanningRef.current ||
        !lastPanPosRef.current ||
        panPointerIdRef.current !== e.pointerId
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
      updateCursorTrackingFromClientPoint(
        e.clientX,
        e.clientY,
        e.pressure,
        e.pointerType,
      );
    };

    const handleWindowPointerUpForPan = (e: PointerEvent) => {
      if (!isPanningRef.current || panPointerIdRef.current !== e.pointerId) {
        return;
      }

      updateCursorTrackingFromClientPoint(
        e.clientX,
        e.clientY,
        e.pressure,
        e.pointerType,
      );
      endPan();
    };

    const handleWindowPointerCancelForPan = (e: PointerEvent) => {
      if (!isPanningRef.current || panPointerIdRef.current !== e.pointerId) {
        return;
      }

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
      updateCursorTrackingFromClientPoint(
        e.clientX,
        e.clientY,
        e.pressure,
        e.pointerType,
      );
      syncCanvasCursor();
    };

    const handleCanvasPointerLeaveCapture = () => {
      setIsHoveringCanvas(false);
      setIsOverDrawableArea(false);
      setLivePointerPressure(1);
      setLivePointerType("mouse");
      setHoverSampleColor(null);
      syncCanvasCursor();
    };

    const handleCanvasPointerMoveCapture = (e: PointerEvent) => {
      updateCursorTrackingFromClientPoint(
        e.clientX,
        e.clientY,
        e.pressure,
        e.pointerType,
      );

      if (activeToolRef.current === "eyedropper") {
        void (async () => {
          const sampledColor =
            await drawerRef.current?.sampleColorAtClientPoint(
              e.clientX,
              e.clientY,
            );

          setHoverSampleColor(sampledColor ?? null);
        })();
      } else {
        setHoverSampleColor(null);
      }

      syncCanvasCursor();
    };

    const handleCanvasPointerDownCapture = (e: PointerEvent) => {
      updateCursorTrackingFromClientPoint(
        e.clientX,
        e.clientY,
        e.pressure,
        e.pointerType,
      );

      if (spacePanActive && e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        beginPan(e.pointerId, e.clientX, e.clientY);
        return;
      }

      if (activeToolRef.current === "eyedropper" && e.button === 0) {
        e.preventDefault();
        e.stopPropagation();

        void (async () => {
          const sampledColor =
            await drawerRef.current?.sampleColorAtClientPoint(
              e.clientX,
              e.clientY,
            );

          if (!sampledColor) {
            return;
          }

          const currentAlpha = colorRef.current.slice(7, 9) || "ff";
          const sampledRgb = sampledColor.slice(0, 7);
          setColor(`${sampledRgb}${currentAlpha}`);

          if (ctrlEyedropperActiveRef.current) {
            ctrlEyedropperActiveRef.current = false;
            ctrlPressedRef.current = false;
            setActiveTool(previousToolRef.current);
            setHoverSampleColor(null);
          } else {
            setActiveTool("brush");
          }
        })();

        return;
      }
    };

    const handleCanvasPointerUpCapture = (e: PointerEvent) => {
      updateCursorTrackingFromClientPoint(
        e.clientX,
        e.clientY,
        e.pressure,
        e.pointerType,
      );

      if (
        spacePanActive &&
        isPanningRef.current &&
        panPointerIdRef.current === e.pointerId &&
        e.button === 0
      ) {
        e.preventDefault();
        e.stopPropagation();
        endPan();
      }
    };

    const init = async () => {
      try {
        const roomRes = await api.get<RoomGetDto>(`/rooms/${id}`);
        const room = roomRes.data.data;

        if (!isMounted || !pixiContainer.current) return;

        const app = new pixi.Application();
        await app.init({
          resizeTo: pixiContainer.current,
          backgroundAlpha: 0,
          antialias: true,
        });

        if (!isMounted) {
          app.destroy(true);
          return;
        }

        appRef.current = app;
        didInitApp = true;

        canvas = app.canvas;
        canvasElementRef.current = canvas;

        pixiContainer.current.appendChild(canvas);

        const ws = new WSManager(
          `${wsbaseurl}/rooms/${id}`,
          messageHandlers,
          closeHandlers,
        );
        wsRef.current = ws;

        await ws.connect();

        if (!isMounted) return;

        const drawer = new DrawManager(
          app,
          ws,
          room.width,
          room.height,
          room.canvas_color,
        );
        drawerRef.current = drawer;

        await drawer.init();

        if (room.imgurl) {
          await drawer.loadBaseImage(room.imgurl);
        }

        drawer.setColor(colorRef.current);
        drawer.setStrokeScale(strokeScaleRef.current);
        drawer.setErase(eraseRef.current);
        drawer.setActiveTool(activeToolRef.current);
        drawer.setShapeType(shapeTypeRef.current);
        drawer.setSmoothing(
          smoothingEnabledRef.current,
          smoothingStrengthRef.current,
        );
        drawer.setPressureSettings(
          pressureEnabledRef.current,
          pressureMinSizeRef.current,
          pressureSensitivityRef.current,
        );
        drawer.setPressureStabilization(
          pressureStabilizationEnabledRef.current,
          pressureStabilizationStrengthRef.current,
        );
        drawer.setTaperIn(
          taperInEnabledRef.current,
          taperInDistanceRef.current,
          taperInStartSizePercentRef.current,
        );
        drawer.setTaperOut(
          taperOutEnabledRef.current,
          taperOutDistanceRef.current,
          taperOutEndSizePercentRef.current,
        );
        drawer.setOnStroke((brushId) => {
          setBrushInUseRef.current(brushId);
          refreshHistoryState();
        });

        forceRendererResize();
        fitCanvasToViewport();
        refreshCursorScale();

        canvas.addEventListener("pointerdown", handleCanvasPointerDownForPan);
        window.addEventListener("pointermove", handleWindowPointerMoveForPan);
        window.addEventListener("pointerup", handleWindowPointerUpForPan);
        window.addEventListener(
          "pointercancel",
          handleWindowPointerCancelForPan,
        );
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

        resizeObserverRef.current = new ResizeObserver(() => {
          forceRendererResize();
        });

        resizeObserverRef.current.observe(pixiContainer.current);

        ws.send({
          Mtype: WSType.READY,
          data: true,
        } as WSMessage);
      } catch {
        notifications.show({
          title: "Error",
          message: "Failed to load room",
          color: "red",
        });
        navigate(routes.home);
      }
    };

    void init();

    return () => {
      isMounted = false;

      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      if (canvas) {
        canvas.removeEventListener(
          "pointerdown",
          handleCanvasPointerDownForPan,
        );
        window.removeEventListener(
          "pointermove",
          handleWindowPointerMoveForPan,
        );
        window.removeEventListener("pointerup", handleWindowPointerUpForPan);
        window.removeEventListener(
          "pointercancel",
          handleWindowPointerCancelForPan,
        );
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
      }

      wsRef.current?.close();
      wsRef.current = null;

      drawerRef.current = null;

      if (didInitApp) {
        appRef.current?.destroy(true, {
          children: true,
          texture: true,
          textureSource: true,
        });
        appRef.current = null;
      }

      canvasElementRef.current = null;
    };
  }, [id]);

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

      <Box
        ref={eyedropperPreviewRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 16,
          height: 16,
          background: hoverSampleColor ?? "transparent",
          border: "1px solid white",
          boxShadow: "0 0 0 1px black",
          pointerEvents: "none",
          zIndex: 10000,
          display: "none",
          willChange: "transform",
        }}
      />

      {canShowCanvas && spacePanActive ? (
        <Box
          ref={overlayRef}
          onPointerDown={(e) => {
            if (e.button !== 0) return;

            e.preventDefault();
            e.stopPropagation();
            beginPan(e.pointerId, e.clientX, e.clientY);
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
