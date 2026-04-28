import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  Paper,
  Slider,
  Stack,
  ScrollArea,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconZoomReset,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconSettings,
  IconDots,
  IconAdjustments,
  IconLine,
  IconSquare,
  IconHome,
  IconCircle,
} from "@tabler/icons-react";
import { IconKeyboard } from "@tabler/icons-react";
import { AppLayout } from "./app-layout";
import { BrushSidePanel } from "../brushes/brush-side-panel";
import { LayerSidePanel } from "../layers/layer-side-panel";
import { RoomToolToolbar } from "../room-tools/room-tool-toolbar";
import {
  type UserGetDto,
  type BrushGetDto,
  type RoomGetDto,
  type LayerGetDto,
  type ClientLayerDto,
} from "../../constants/types";
import api from "../../config/axios";
import { ColorSelector } from "../room-tools/color-selector";
import { UserAvatars } from "../room-tools/UserAvatars";

type ToolType = "brush" | "eraser" | "eyedropper" | "shapes" | "move";
export type ShapeType = "line" | "rectangle" | "ellipse";

type RoomLayoutContextValue = {
  registerBrushSelect: (fn: (brush: BrushGetDto) => void) => void;
  setBrushInUse: (brushId: number) => void;
  registerUndo: (fn: () => void) => void;
  registerRedo: (fn: () => void) => void;
  registerResetView: (fn: () => void) => void;
  registerExport: (fn: () => void) => void;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;
  strokeScale: number;
  setColor: (color: string) => void;
  toggleSidebar: () => void;
  registerSetErase: (fn: (erase: boolean) => void) => void;
  setErase: (erase: boolean) => void;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  shapeType: ShapeType;
  setShapeType: (shapeType: ShapeType) => void;
  color: string;
  erase: boolean;
  setStrokeScale: (strokeScale: number) => void;
  setUsers: (users: UserGetDto[]) => void;
  addUser: (user: UserGetDto) => void;
  removeUser: (userid: number) => void;
  layers: ClientLayerDto[];
  setLayers: (layers: LayerGetDto[]) => void;
  activeLayerId: number | null;
  setActiveLayerId: (layerId: number | null) => void;
  updateLayerOpacity: (
    layerId: number,
    opacityPercent: number,
  ) => Promise<void>;
  smoothingEnabled: boolean;
  setSmoothingEnabled: (enabled: boolean) => void;
  smoothingStrength: number;
  setSmoothingStrength: (strength: number) => void;
  pressureEnabled: boolean;
  setPressureEnabled: (enabled: boolean) => void;
  pressureMinSize: number;
  setPressureMinSize: (value: number) => void;
  pressureSensitivity: number;
  setPressureSensitivity: (value: number) => void;
  pressureStabilizationEnabled: boolean;
  setPressureStabilizationEnabled: (enabled: boolean) => void;
  pressureStabilizationStrength: number;
  setPressureStabilizationStrength: (value: number) => void;
  taperInEnabled: boolean;
  setTaperInEnabled: (enabled: boolean) => void;
  taperInDistance: number;
  setTaperInDistance: (value: number) => void;
  taperInStartSizePercent: number;
  setTaperInStartSizePercent: (value: number) => void;
  taperOutEnabled: boolean;
  setTaperOutEnabled: (enabled: boolean) => void;
  taperOutDistance: number;
  setTaperOutDistance: (value: number) => void;
  taperOutEndSizePercent: number;
  setTaperOutEndSizePercent: (value: number) => void;
  mirrorEnabled: boolean;
  setMirrorEnabled: (enabled: boolean) => void;
  mirrorCenterX: number;
  setMirrorCenterX: (x: number) => void;
  mirrorCenterY: number;
  setMirrorCenterY: (y: number) => void;
  mirrorAngleDegrees: number;
  setMirrorAngleDegrees: (angle: number) => void;
  mirrorAxes: 1 | 2;
  setMirrorAxes: (axes: 1 | 2) => void;
  mirrorHandleVisible: boolean;
  setMirrorHandleVisible: (visible: boolean) => void;
  isActiveLayerMovable: boolean;
  moveToolDisabledReason: string | null;
};

const RoomLayoutContext = createContext<RoomLayoutContextValue>({
  registerBrushSelect: () => {},
  setBrushInUse: () => {},
  registerUndo: () => {},
  registerRedo: () => {},
  registerResetView: () => {},
  registerExport: () => {},
  setHistoryState: () => {},
  setColor: () => {},
  registerSetErase: () => {},
  setErase: () => {},
  activeTool: "brush",
  setActiveTool: () => {},
  shapeType: "line",
  setShapeType: () => {},
  color: "#ffffffff",
  toggleSidebar: () => {},
  erase: false,
  strokeScale: 16,
  setStrokeScale: () => {},
  setUsers: () => {},
  addUser: () => {},
  removeUser: () => {},
  layers: [],
  setLayers: () => {},
  activeLayerId: null,
  setActiveLayerId: () => {},
  updateLayerOpacity: async () => {},
  smoothingEnabled: false,
  setSmoothingEnabled: () => {},
  smoothingStrength: 35,
  setSmoothingStrength: () => {},
  pressureEnabled: true,
  setPressureEnabled: () => {},
  pressureMinSize: 10,
  setPressureMinSize: () => {},
  pressureSensitivity: 65,
  setPressureSensitivity: () => {},
  pressureStabilizationEnabled: true,
  setPressureStabilizationEnabled: () => {},
  pressureStabilizationStrength: 30,
  setPressureStabilizationStrength: () => {},
  taperInEnabled: false,
  setTaperInEnabled: () => {},
  taperInDistance: 32,
  setTaperInDistance: () => {},
  taperInStartSizePercent: 5,
  setTaperInStartSizePercent: () => {},
  taperOutEnabled: false,
  setTaperOutEnabled: () => {},
  taperOutDistance: 32,
  setTaperOutDistance: () => {},
  taperOutEndSizePercent: 5,
  setTaperOutEndSizePercent: () => {},
  mirrorEnabled: false,
  setMirrorEnabled: () => {},
  mirrorCenterX: 0.5,
  setMirrorCenterX: () => {},
  mirrorCenterY: 0.5,
  setMirrorCenterY: () => {},
  mirrorAngleDegrees: 90,
  setMirrorAngleDegrees: () => {},
  mirrorAxes: 1,
  setMirrorAxes: () => {},
  mirrorHandleVisible: true,
  setMirrorHandleVisible: () => {},
  isActiveLayerMovable: false,
  moveToolDisabledReason: null,
});

export const useRoomLayout = () => useContext(RoomLayoutContext);

function mergeClientLayerVisibility(
  incomingLayers: LayerGetDto[],
  previousLayers: ClientLayerDto[],
): ClientLayerDto[] {
  const visibilityMap = new Map(
    previousLayers.map((layer) => [layer.id, layer.visible]),
  );

  return incomingLayers
    .map((layer) => ({
      ...layer,
      visible: visibilityMap.get(layer.id) ?? true,
    }))
    .sort((a, b) => a.position - b.position);
}

function PressurePreview({
  pressureEnabled,
  pressureMinSize,
  pressureSensitivity,
  pressureStabilizationEnabled,
  pressureStabilizationStrength,
}: {
  pressureEnabled: boolean;
  pressureMinSize: number;
  pressureSensitivity: number;
  pressureStabilizationEnabled: boolean;
  pressureStabilizationStrength: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < height; y += 12) {
      for (let x = 0; x < width; x += 12) {
        ctx.fillStyle = (x / 12 + y / 12) % 2 === 0 ? "#272727" : "#2d2d2d";
        ctx.fillRect(x, y, 12, 12);
      }
    }

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));

    const getPressureStabilizationFollowFactor = () => {
      const t = clamp(pressureStabilizationStrength, 0, 100) / 100;
      const curved = t * t;
      return 1 - curved * 0.965;
    };

    const normalizePressure = (pressure: number) => {
      if (!pressureEnabled) return 1;
      const safePressure = clamp(pressure || 0, 0, 1);
      return safePressure > 0 ? safePressure : 0.001;
    };

    const getAdjustedSize = (normalizedPressure: number) => {
      if (!pressureEnabled) return 22;

      const minRatio = clamp(pressureMinSize / 100, 0, 1);
      const sensitivityT = clamp(pressureSensitivity, 0, 100) / 100;
      const exponent = 2.2 - sensitivityT * 1.9;
      const curvedPressure = Math.pow(normalizedPressure, exponent);
      const sizeRatio = minRatio + (1 - minRatio) * curvedPressure;

      return Math.max(3, 22 * sizeRatio);
    };

    const buildRawPressureValues = (kind: "up" | "down" | "jitter") => {
      const values: number[] = [];

      for (let i = 0; i < 80; i += 1) {
        const t = i / 79;

        if (kind === "up") {
          values.push(0.08 + t * 0.92);
        } else if (kind === "down") {
          values.push(1 - t * 0.92);
        } else {
          const base = 0.5 + Math.sin(t * Math.PI * 3.5) * 0.18;
          const jitter = Math.sin(t * Math.PI * 17) * 0.1;
          values.push(clamp(base + jitter, 0.05, 1));
        }
      }

      return values;
    };

    const drawStrokeRow = (
      top: number,
      label: string,
      kind: "up" | "down" | "jitter",
    ) => {
      const rawValues = buildRawPressureValues(kind);
      const follow = getPressureStabilizationFollowFactor();
      let smoothed = normalizePressure(rawValues[0]);

      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 12, top - 14);

      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, top);
      ctx.lineTo(width - 12, top);
      ctx.stroke();

      for (let i = 0; i < rawValues.length; i += 1) {
        const rawPressure = normalizePressure(rawValues[i]);

        if (!pressureEnabled) {
          smoothed = 1;
        } else if (!pressureStabilizationEnabled) {
          smoothed = rawPressure;
        } else if (i === 0) {
          smoothed = rawPressure;
        } else {
          smoothed = smoothed + (rawPressure - smoothed) * follow;
        }

        const x = 18 + (i / (rawValues.length - 1)) * (width - 36);
        const y =
          top +
          Math.sin(i / 7) * (kind === "jitter" ? 5 : 3) +
          (kind === "up" ? -3 : kind === "down" ? 3 : 0);

        const size = getAdjustedSize(smoothed);

        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fill();
      }
    };

    drawStrokeRow(62, "Light → Heavy", "up");
    drawStrokeRow(145, "Heavy → Light", "down");
    drawStrokeRow(228, "Jitter Test", "jitter");

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  }, [
    pressureEnabled,
    pressureMinSize,
    pressureSensitivity,
    pressureStabilizationEnabled,
    pressureStabilizationStrength,
  ]);

  return (
    <Stack gap={6}>
      <Text size="sm" fw={600}>
        Live Preview
      </Text>
      <Box
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#262626",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          width={220}
          height={290}
          style={{ display: "block", width: "100%", height: 290 }}
        />
      </Box>
      <Text size="xs" c="dimmed">
        Shows how pressure response and stabilization affect stroke thickness.
      </Text>
    </Stack>
  );
}

function TaperPreview({
  taperInEnabled,
  taperInDistance,
  taperInStartSizePercent,
  taperOutEnabled,
  taperOutDistance,
  taperOutEndSizePercent,
}: {
  taperInEnabled: boolean;
  taperInDistance: number;
  taperInStartSizePercent: number;
  taperOutEnabled: boolean;
  taperOutDistance: number;
  taperOutEndSizePercent: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const taperInMinMultiplier = Math.max(
      0.01,
      Math.min(1, taperInStartSizePercent / 100),
    );
    const taperOutMinMultiplier = Math.max(
      0.01,
      Math.min(1, taperOutEndSizePercent / 100),
    );

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < height; y += 12) {
      for (let x = 0; x < width; x += 12) {
        ctx.fillStyle = (x / 12 + y / 12) % 2 === 0 ? "#272727" : "#2d2d2d";
        ctx.fillRect(x, y, 12, 12);
      }
    }

    const samplePoint = (t: number) => ({
      x:
        width / 2 +
        Math.sin(t * Math.PI * 1.15) * 24 -
        Math.sin(t * Math.PI * 2.4) * 7,
      y: 20 + t * (height - 40),
    });

    const rawPoints: { x: number; y: number }[] = [];
    for (let i = 0; i <= 140; i += 1) {
      rawPoints.push(samplePoint(i / 140));
    }

    const cumulativeDistances: number[] = [0];
    for (let i = 1; i < rawPoints.length; i += 1) {
      const prev = rawPoints[i - 1];
      const current = rawPoints[i];
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      cumulativeDistances.push(
        cumulativeDistances[i - 1] + Math.sqrt(dx * dx + dy * dy),
      );
    }

    const totalDistance =
      cumulativeDistances[cumulativeDistances.length - 1] ?? 0;
    const baseSize = 20;
    const normalSpacing = baseSize * 0.45;

    const getTaperInMultiplier = (distance: number) => {
      if (!taperInEnabled || taperInDistance <= 0) return 1;
      const progress = Math.max(0, Math.min(1, distance / taperInDistance));
      return taperInMinMultiplier + (1 - taperInMinMultiplier) * progress;
    };

    const getTaperOutMultiplier = (distanceFromEnd: number) => {
      if (!taperOutEnabled || taperOutDistance <= 0) return 1;
      const progress = Math.max(
        0,
        Math.min(1, distanceFromEnd / taperOutDistance),
      );
      return taperOutMinMultiplier + (1 - taperOutMinMultiplier) * progress;
    };

    const getSizeAtDistance = (distance: number) => {
      const taperInMultiplier = getTaperInMultiplier(distance);
      const taperOutMultiplier = getTaperOutMultiplier(
        totalDistance - distance,
      );
      return Math.max(1.5, baseSize * taperInMultiplier * taperOutMultiplier);
    };

    const getSpacingAtDistance = (distance: number) => {
      const size = getSizeAtDistance(distance);
      return Math.min(normalSpacing, Math.max(size * 0.15, 2));
    };

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rawPoints[0].x, rawPoints[0].y);
    for (let i = 1; i < rawPoints.length; i += 1) {
      ctx.lineTo(rawPoints[i].x, rawPoints[i].y);
    }
    ctx.stroke();

    const dabs: { x: number; y: number; size: number }[] = [];
    dabs.push({
      x: rawPoints[0].x,
      y: rawPoints[0].y,
      size: getSizeAtDistance(0),
    });

    let spacingCarry = 0;

    for (let i = 1; i < rawPoints.length; i += 1) {
      const start = rawPoints[i - 1];
      const end = rawPoints[i];
      const startDistance = cumulativeDistances[i - 1];
      const endDistance = cumulativeDistances[i];

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      let segment = Math.sqrt(dx * dx + dy * dy);

      if (segment <= 0) continue;

      const dirX = dx / segment;
      const dirY = dy / segment;
      let cursorX = start.x;
      let cursorY = start.y;
      let traveled = 0;

      while (segment > 0) {
        const distance = startDistance + traveled;
        const spacing = getSpacingAtDistance(distance);

        if (spacingCarry + segment < spacing) {
          spacingCarry += segment;
          break;
        }

        const step = spacing - spacingCarry;
        cursorX += dirX * step;
        cursorY += dirY * step;
        segment -= step;
        traveled += step;
        spacingCarry = 0;

        const dabDistance = Math.max(
          0,
          Math.min(endDistance, startDistance + traveled),
        );

        dabs.push({
          x: cursorX,
          y: cursorY,
          size: getSizeAtDistance(dabDistance),
        });
      }
    }

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    for (const dab of dabs) {
      ctx.beginPath();
      ctx.arc(dab.x, dab.y, dab.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  }, [
    taperInEnabled,
    taperInDistance,
    taperInStartSizePercent,
    taperOutEnabled,
    taperOutDistance,
    taperOutEndSizePercent,
  ]);

  return (
    <Stack gap={6}>
      <Text size="sm" fw={600}>
        Live Preview
      </Text>
      <Box
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#262626",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          width={180}
          height={320}
          style={{ display: "block", width: "100%", height: 320 }}
        />
      </Box>
      <Text size="xs" c="dimmed">
        Updates as you adjust taper in and taper out settings.
      </Text>
    </Stack>
  );
}

export function RoomLayout() {
  const { id } = useParams();
  const [canManageLayers, setCanManageLayers] = useState(false);
  const [roomName, setRoomName] = useState<string | undefined>(undefined);
  const [color, setColor] = useState("#ffffffff");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [erase, setEraseState] = useState(false);
  const [activeToolState, setActiveToolState] = useState<ToolType>("brush");
  const [shapeType, setShapeType] = useState<ShapeType>("line");
  const [strokeScale, setStrokeScale] = useState(16);
  const [users, setUsers] = useState<UserGetDto[]>([]);
  const [layers, setLayersState] = useState<ClientLayerDto[]>([]);
  const [activeLayerId, setActiveLayerIdState] = useState<number | null>(null);
  const [layersPanelOpen, setLayersPanelOpen] = useState(true);
  const [smoothingEnabled, setSmoothingEnabled] = useState(false);
  const [smoothingStrength, setSmoothingStrength] = useState(35);
  const [smoothingModalOpen, setSmoothingModalOpen] = useState(false);
  const [optionsMenuOpened, setOptionsMenuOpened] = useState(false);
  const [toolSettingsMenuOpened, setToolSettingsMenuOpened] = useState(false);

  const [pressureEnabled, setPressureEnabled] = useState(true);
  const [pressureMinSize, setPressureMinSize] = useState(10);
  const [pressureSensitivity, setPressureSensitivity] = useState(65);
  const [pressureModalOpen, setPressureModalOpen] = useState(false);

  const [pressureStabilizationEnabled, setPressureStabilizationEnabled] =
    useState(true);
  const [pressureStabilizationStrength, setPressureStabilizationStrength] =
    useState(30);

  const [taperInEnabled, setTaperInEnabled] = useState(false);
  const [taperInDistance, setTaperInDistance] = useState(32);
  const [taperInStartSizePercent, setTaperInStartSizePercent] = useState(5);
  const [taperOutEnabled, setTaperOutEnabled] = useState(false);
  const [taperOutDistance, setTaperOutDistance] = useState(32);
  const [taperOutEndSizePercent, setTaperOutEndSizePercent] = useState(5);
  const [taperModalOpen, setTaperModalOpen] = useState(false);
  const [mirrorEnabled, setMirrorEnabled] = useState(false);
  const [mirrorCenterX, setMirrorCenterX] = useState(0.5);
  const [mirrorCenterY, setMirrorCenterY] = useState(0.5);
  const [mirrorAngleDegrees, setMirrorAngleDegrees] = useState(90);
  const [mirrorAxes, setMirrorAxes] = useState<1 | 2>(1);
  const [mirrorHandleVisible, setMirrorHandleVisible] = useState(true);

  const leftPanelContentRef = useRef<HTMLDivElement | null>(null);
  const brushPanelResizeStateRef = useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);
  const hasInitializedBrushSplitRef = useRef(false);

  const BRUSH_TOOLS_MIN_HEIGHT = 190;
  const BRUSH_TOOLS_MAX_HEIGHT = 360;
  const BRUSH_LIBRARY_MIN_HEIGHT = 0;
  const BRUSH_SECTION_DIVIDER_HEIGHT = 12;

  const [brushToolsHeight, setBrushToolsHeight] = useState(220);
  const [isResizingBrushSections, setIsResizingBrushSections] = useState(false);

  function resetPressureDefaults() {
    setPressureEnabled(true);
    setPressureMinSize(10);
    setPressureSensitivity(65);
  }

  function resetPressureStabilizationDefaults() {
    setPressureStabilizationEnabled(true);
    setPressureStabilizationStrength(30);
  }

  function resetTaperInDefaults() {
    setTaperInDistance(32);
    setTaperInStartSizePercent(5);
  }

  function resetTaperOutDefaults() {
    setTaperOutDistance(32);
    setTaperOutEndSizePercent(5);
  }

  const addUser = (user: UserGetDto) => {
    setUsers((users) => {
      if (users.some((u) => u.id === user.id)) return users;
      return [...users, user];
    });
  };

  const removeUser = (userid: number) => {
    setUsers((users) => users.filter((user) => user.id !== userid));
  };

  const setLayers = useCallback(
    (nextLayers: LayerGetDto[] | null | undefined) => {
      if (!Array.isArray(nextLayers)) return;

      setLayersState((prevLayers) => {
        const merged = mergeClientLayerVisibility(nextLayers, prevLayers);

        setActiveLayerIdState((prev) => {
          if (
            prev !== null &&
            merged.some((layer) => layer.id === prev && layer.visible)
          ) {
            return prev;
          }

          return (
            merged.find((layer) => layer.visible)?.id ?? merged[0]?.id ?? null
          );
        });

        return merged;
      });
    },
    [],
  );

  function setActiveLayerId(layerId: number | null) {
    setActiveLayerIdState(layerId);
  }

  const createLayer = useCallback(async () => {
    if (!id || !canManageLayers) return;

    const numberedLayerValues = layers
      .map((layer) => {
        const match = layer.name.match(/^Layer\s+(\d+)$/i);
        return match ? Number(match[1]) : null;
      })
      .filter((value): value is number => value !== null);

    const nextNumber =
      numberedLayerValues.length > 0 ? Math.max(...numberedLayerValues) + 1 : 1;

    try {
      const response = await api.post<LayerGetDto[]>(`/layers/room/${id}`, {
        name: `Layer ${nextNumber}`,
      });

      const nextLayers = response.data.data;
      setLayers(nextLayers);

      const newestLayer =
        [...nextLayers].sort((a, b) => b.position - a.position)[0] ?? null;

      if (newestLayer) {
        setActiveLayerIdState(newestLayer.id);
      }

      notifications.show({
        title: "Success",
        message: "Layer created",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Could not create layer",
        color: "red",
      });
    }
  }, [id, canManageLayers, layers, setLayers]);

  const renameLayer = useCallback(
    (layerId: number) => {
      if (!canManageLayers) return;

      const layer = layers.find((item) => item.id === layerId);
      if (!layer) return;

      modals.openContextModal({
        modal: "layereditmodal",
        title: "Edit Layer",
        centered: true,
        innerProps: {
          initialName: layer.name,
          onSubmit: async (name: string) => {
            try {
              const response = await api.patch<LayerGetDto[]>(
                `/layers/${layerId}`,
                {
                  name,
                },
              );

              setLayers(response.data.data);

              notifications.show({
                title: "Success",
                message: "Layer updated",
                color: "green",
              });
            } catch {
              notifications.show({
                title: "Error",
                message: "Could not update layer",
                color: "red",
              });
            }
          },
        },
      });
    },
    [canManageLayers, layers, setLayers],
  );

  const deleteLayer = useCallback(
    async (layerId: number) => {
      if (!canManageLayers) return;

      if (layers.length <= 1) {
        notifications.show({
          title: "Error",
          message: "You cannot delete the last layer.",
          color: "red",
        });
        return;
      }

      const layer = layers.find((item) => item.id === layerId);
      if (!layer) return;

      modals.openConfirmModal({
        title: "Delete layer",
        centered: true,
        children: (
          <Text size="sm">Are you sure you want to delete "{layer.name}"?</Text>
        ),
        labels: { confirm: "Delete", cancel: "Cancel" },
        confirmProps: { color: "red" },
        onConfirm: async () => {
          try {
            const response = await api.delete<LayerGetDto[]>(
              `/layers/${layerId}`,
            );
            const nextLayers = response.data.data;

            if (!Array.isArray(nextLayers)) {
              notifications.show({
                title: "Error",
                message: "Could not delete layer",
                color: "red",
              });
              return;
            }

            setLayers(nextLayers);

            if (activeLayerId === layerId) {
              setActiveLayerIdState(nextLayers[0]?.id ?? null);
            }

            notifications.show({
              title: "Success",
              message: "Layer deleted",
              color: "green",
            });
          } catch (error: any) {
            const backendMessage =
              error?.response?.data?.errors?.[0]?.message ?? "";

            notifications.show({
              title: "Error",
              message:
                backendMessage === "cannot delete the last layer"
                  ? "You cannot delete the last layer."
                  : "Could not delete layer",
              color: "red",
            });
          }
        },
      });
    },
    [canManageLayers, layers, activeLayerId, setLayers],
  );

  const toggleLayerVisibility = useCallback((layerId: number) => {
    setLayersState((prevLayers) => {
      const nextLayers = prevLayers.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer,
      );

      setActiveLayerIdState((prevActiveLayerId) => {
        if (prevActiveLayerId !== layerId) {
          return prevActiveLayerId;
        }

        const updatedLayer = nextLayers.find((layer) => layer.id === layerId);
        if (!updatedLayer) return prevActiveLayerId;

        if (updatedLayer.visible) {
          return prevActiveLayerId;
        }

        return nextLayers.find((layer) => layer.visible)?.id ?? updatedLayer.id;
      });

      return nextLayers;
    });
  }, []);

  const toggleLayerLocked = useCallback(
    async (layerId: number) => {
      if (!canManageLayers) return;

      const layer = layers.find((item) => item.id === layerId);
      if (!layer) return;

      try {
        const response = await api.patch<LayerGetDto[]>(`/layers/${layerId}`, {
          locked: !layer.locked,
        });

        setLayers(response.data.data);
      } catch {
        notifications.show({
          title: "Error",
          message: "Could not update layer lock",
          color: "red",
        });
      }
    },
    [canManageLayers, layers, setLayers],
  );

  const reorderLayers = useCallback(
    async (orderedLayerIds: number[]) => {
      if (!id || !canManageLayers) return;

      try {
        const response = await api.patch<LayerGetDto[]>(
          `/layers/room/${id}/reorder`,
          {
            ordered_layer_ids: orderedLayerIds,
          },
        );

        setLayers(response.data.data);
      } catch {
        notifications.show({
          title: "Error",
          message: "Could not reorder layers",
          color: "red",
        });
      }
    },
    [id, canManageLayers, setLayers],
  );

  const updateLayerOpacity = useCallback(
    async (layerId: number, opacityPercent: number) => {
      if (!canManageLayers) return;

      const opacity = Math.max(0, Math.min(100, opacityPercent)) / 100;

      try {
        const response = await api.patch<LayerGetDto[]>(`/layers/${layerId}`, {
          opacity,
        });

        setLayers(response.data.data);
      } catch {
        notifications.show({
          title: "Error",
          message: "Could not update layer opacity",
          color: "red",
        });
      }
    },
    [canManageLayers, setLayers],
  );

  const [onSetErase, setOnSetErase] = useState<
    ((erase: boolean) => void) | null
  >(null);

  const activeLayer =
    layers.find((layer) => layer.id === activeLayerId) ?? null;
  const isActiveLayerMovable = Boolean(
    activeLayer && activeLayer.visible && !activeLayer.locked,
  );
  const moveToolDisabledReason = !activeLayer
    ? "Select a layer first"
    : !activeLayer.visible
      ? "The active layer is hidden"
      : activeLayer.locked
        ? "The active layer is locked"
        : null;

  useEffect(() => {
    if (activeToolState === "move" && !isActiveLayerMovable) {
      setActiveToolState("brush");
      setEraseState(false);
      onSetErase?.(false);
    }
  }, [activeToolState, isActiveLayerMovable, onSetErase]);

  const onStrokeRef = useRef<((brushId: number) => void) | null>(null);
  const navigate = useNavigate();

  const setBrushInUse = useCallback((brushId: number) => {
    onStrokeRef.current?.(brushId);
  }, []);

  const registerStroke = useCallback((fn: (brushId: number) => void) => {
    onStrokeRef.current = fn;
  }, []);

  const registerSetErase = useCallback((fn: (erase: boolean) => void) => {
    setOnSetErase(() => fn);
  }, []);

  const setErase = useCallback(
    (erase: boolean) => {
      setEraseState(erase);
      setActiveToolState(erase ? "eraser" : "brush");
      onSetErase?.(erase);
    },
    [onSetErase],
  );

  const setActiveTool = useCallback(
    (tool: ToolType) => {
      setActiveToolState(tool);
      const nextErase = tool === "eraser";
      setEraseState(nextErase);
      onSetErase?.(nextErase);
    },
    [onSetErase],
  );

  useEffect(() => {
    if (!id) return;

    void Promise.all([
      api.get<RoomGetDto>(`/rooms/${id}`),
      api.get<{ can_manage_layers: boolean }>(`/layers/room/${id}/permissions`),
    ]).then(([roomRes, permissionsRes]) => {
      if (roomRes.data.data) {
        setRoomName(roomRes.data.data.name);
      }

      setCanManageLayers(Boolean(permissionsRes.data.data?.can_manage_layers));
    });
  }, [id]);

  const [onBrushSelect, setOnBrushSelect] = useState<
    ((brush: BrushGetDto) => void) | null
  >(null);
  const [onUndo, setOnUndo] = useState<(() => void) | null>(null);
  const [onRedo, setOnRedo] = useState<(() => void) | null>(null);
  const [onResetView, setOnResetView] = useState<(() => void) | null>(null);
  const [onExport, setOnExport] = useState<(() => void) | null>(null);

  const registerBrushSelect = useCallback(
    (fn: (brush: BrushGetDto) => void) => {
      setOnBrushSelect(() => fn);
    },
    [],
  );

  const registerUndo = useCallback((fn: () => void) => {
    setOnUndo(() => fn);
  }, []);

  const registerRedo = useCallback((fn: () => void) => {
    setOnRedo(() => fn);
  }, []);

  const registerResetView = useCallback((fn: () => void) => {
    setOnResetView(() => fn);
  }, []);

  const registerExport = useCallback((fn: () => void) => {
    setOnExport(() => fn);
  }, []);

  function setHistoryState(nextCanUndo: boolean, nextCanRedo: boolean) {
    setCanUndo(nextCanUndo);
    setCanRedo(nextCanRedo);
  }

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
  }

  function toggleLayersPanel() {
    setLayersPanelOpen((prev) => !prev);
  }

  const snapMirrorToCenter = useCallback(() => {
    setMirrorCenterX(0.5);
    setMirrorCenterY(0.5);
  }, []);

  const clampBrushToolsHeight = useCallback((nextHeight: number) => {
    const containerHeight = leftPanelContentRef.current?.clientHeight ?? 0;

    const boundedByPreset = Math.max(
      BRUSH_TOOLS_MIN_HEIGHT,
      Math.min(BRUSH_TOOLS_MAX_HEIGHT, nextHeight),
    );

    if (containerHeight <= 0) {
      return boundedByPreset;
    }

    const maxHeightFromContainer = Math.max(
      BRUSH_TOOLS_MIN_HEIGHT,
      containerHeight - BRUSH_LIBRARY_MIN_HEIGHT - BRUSH_SECTION_DIVIDER_HEIGHT,
    );

    return Math.min(boundedByPreset, maxHeightFromContainer);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;

    const container = leftPanelContentRef.current;
    if (!container) return;

    const syncBrushSplit = () => {
      const height = container.clientHeight;
      if (height <= 0) return;

      if (!hasInitializedBrushSplitRef.current) {
        hasInitializedBrushSplitRef.current = true;
        setBrushToolsHeight(clampBrushToolsHeight(220));
        return;
      }

      setBrushToolsHeight((prev) => clampBrushToolsHeight(prev));
    };

    syncBrushSplit();

    const resizeObserver = new ResizeObserver(() => {
      syncBrushSplit();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [sidebarOpen, clampBrushToolsHeight]);

  useEffect(() => {
    if (!isResizingBrushSections) return;

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = brushPanelResizeStateRef.current;
      if (!resizeState) return;

      const deltaY = event.clientY - resizeState.startY;
      setBrushToolsHeight(
        clampBrushToolsHeight(resizeState.startHeight + deltaY),
      );
    };

    const handlePointerUp = () => {
      brushPanelResizeStateRef.current = null;
      setIsResizingBrushSections(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizingBrushSections, clampBrushToolsHeight]);

  const handleBrushSectionResizeStart = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    brushPanelResizeStateRef.current = {
      startY: event.clientY,
      startHeight: brushToolsHeight,
    };

    setIsResizingBrushSections(true);
  };

  const leftPanelWidth = sidebarOpen ? 340 : 0;
  const toolbarLeftOffset = sidebarOpen ? 340 + 16 : 16;

  return (
    <RoomLayoutContext.Provider
      value={{
        registerBrushSelect,
        registerSetErase,
        setBrushInUse,
        registerUndo,
        registerRedo,
        registerResetView,
        registerExport,
        setHistoryState,
        strokeScale,
        setColor,
        toggleSidebar,
        setErase,
        activeTool: activeToolState,
        setActiveTool,
        shapeType,
        setShapeType,
        color,
        erase,
        setStrokeScale,
        setUsers,
        addUser,
        removeUser,
        layers,
        setLayers,
        activeLayerId,
        setActiveLayerId,
        updateLayerOpacity,
        smoothingEnabled,
        setSmoothingEnabled,
        smoothingStrength,
        setSmoothingStrength,
        pressureEnabled,
        setPressureEnabled,
        pressureMinSize,
        setPressureMinSize,
        pressureSensitivity,
        setPressureSensitivity,
        pressureStabilizationEnabled,
        setPressureStabilizationEnabled,
        pressureStabilizationStrength,
        setPressureStabilizationStrength,
        taperInEnabled,
        setTaperInEnabled,
        taperInDistance,
        setTaperInDistance,
        taperInStartSizePercent,
        setTaperInStartSizePercent,
        taperOutEnabled,
        setTaperOutEnabled,
        taperOutDistance,
        setTaperOutDistance,
        taperOutEndSizePercent,
        setTaperOutEndSizePercent,
        mirrorEnabled,
        setMirrorEnabled,
        mirrorCenterX,
        setMirrorCenterX,
        mirrorCenterY,
        setMirrorCenterY,
        mirrorAngleDegrees,
        setMirrorAngleDegrees,
        mirrorAxes,
        setMirrorAxes,
        mirrorHandleVisible,
        setMirrorHandleVisible,
        isActiveLayerMovable,
        moveToolDisabledReason,
      }}
    >
      <Modal
        opened={smoothingModalOpen}
        onClose={() => setSmoothingModalOpen(false)}
        title="Stroke smoothing"
        centered
      >
        <Stack gap="md">
          <Box>
            <Group justify="space-between" mb={6}>
              <Text size="sm" fw={600}>
                Smoothing strength
              </Text>
              <Text size="sm" c="dimmed">
                {smoothingStrength}
              </Text>
            </Group>

            <Slider
              min={0}
              max={100}
              step={1}
              value={smoothingStrength}
              onChange={setSmoothingStrength}
            />

            <Text size="xs" c="dimmed" mt={8}>
              Higher values add more stabilizer lag.
            </Text>
          </Box>
        </Stack>
      </Modal>

      <Modal
        opened={pressureModalOpen}
        onClose={() => setPressureModalOpen(false)}
        title="Pen pressure"
        centered
        size="xl"
      >
        <Group align="stretch" wrap="nowrap" gap="md">
          <Box style={{ width: 230, flexShrink: 0 }}>
            <PressurePreview
              pressureEnabled={pressureEnabled}
              pressureMinSize={pressureMinSize}
              pressureSensitivity={pressureSensitivity}
              pressureStabilizationEnabled={pressureStabilizationEnabled}
              pressureStabilizationStrength={pressureStabilizationStrength}
            />
          </Box>

          <Box
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              maxHeight: "70vh",
            }}
          >
            <ScrollArea
              offsetScrollbars
              scrollbarSize={10}
              style={{ flex: 1, minHeight: 0 }}
            >
              <Stack gap="md" pr="xs">
                <Paper withBorder p="sm" radius={0}>
                  <Stack gap="md">
                    <Switch
                      checked={pressureEnabled}
                      onChange={(event) =>
                        setPressureEnabled(event.currentTarget.checked)
                      }
                      label="Enable pressure size"
                    />

                    <Box>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={600}>
                          Minimum size
                        </Text>
                        <Text size="sm" c="dimmed">
                          {pressureMinSize}%
                        </Text>
                      </Group>

                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={pressureMinSize}
                        onChange={setPressureMinSize}
                      />

                      <Text size="xs" c="dimmed" mt={8}>
                        Sets the smallest brush size reached with very light pen
                        pressure.
                      </Text>
                    </Box>

                    <Box>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={600}>
                          Sensitivity
                        </Text>
                        <Text size="sm" c="dimmed">
                          {pressureSensitivity}
                        </Text>
                      </Group>

                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={pressureSensitivity}
                        onChange={setPressureSensitivity}
                      />

                      <Text size="xs" c="dimmed" mt={8}>
                        Higher values make the brush react more quickly to pen
                        pressure.
                      </Text>
                    </Box>
                  </Stack>
                </Paper>

                <Paper withBorder p="sm" radius={0}>
                  <Stack gap="md">
                    <Switch
                      checked={pressureStabilizationEnabled}
                      onChange={(event) =>
                        setPressureStabilizationEnabled(
                          event.currentTarget.checked,
                        )
                      }
                      label="Enable pressure stabilization"
                    />

                    <Box>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={600}>
                          Stabilization strength
                        </Text>
                        <Text size="sm" c="dimmed">
                          {pressureStabilizationStrength}
                        </Text>
                      </Group>

                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={pressureStabilizationStrength}
                        onChange={setPressureStabilizationStrength}
                      />

                      <Text size="xs" c="dimmed" mt={8}>
                        Higher values smooth out pressure changes more strongly.
                      </Text>
                    </Box>
                  </Stack>
                </Paper>
              </Stack>
            </ScrollArea>

            <Group justify="space-between" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  resetPressureDefaults();
                  resetPressureStabilizationDefaults();
                }}
              >
                Restore defaults
              </Button>

              <Button onClick={() => setPressureModalOpen(false)}>Done</Button>
            </Group>
          </Box>
        </Group>
      </Modal>

      <Modal
        opened={taperModalOpen}
        onClose={() => setTaperModalOpen(false)}
        title="Taper"
        centered
        size="xl"
      >
        <Group align="stretch" wrap="nowrap" gap="md">
          <Box style={{ width: 190, flexShrink: 0 }}>
            <TaperPreview
              taperInEnabled={taperInEnabled}
              taperInDistance={taperInDistance}
              taperInStartSizePercent={taperInStartSizePercent}
              taperOutEnabled={taperOutEnabled}
              taperOutDistance={taperOutDistance}
              taperOutEndSizePercent={taperOutEndSizePercent}
            />
          </Box>

          <Box
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              maxHeight: "70vh",
            }}
          >
            <ScrollArea
              offsetScrollbars
              scrollbarSize={10}
              style={{ flex: 1, minHeight: 0 }}
            >
              <Stack gap="md" pr="xs">
                <Paper withBorder p="sm" radius={0}>
                  <Stack gap="md">
                    <Switch
                      checked={taperInEnabled}
                      onChange={(event) =>
                        setTaperInEnabled(event.currentTarget.checked)
                      }
                      label="Enable taper in"
                    />

                    <Box>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={600}>
                          Taper in distance
                        </Text>
                        <Text size="sm" c="dimmed">
                          {taperInDistance}px
                        </Text>
                      </Group>

                      <Slider
                        min={0}
                        max={128}
                        step={1}
                        value={taperInDistance}
                        onChange={setTaperInDistance}
                      />

                      <Text size="xs" c="dimmed" mt={8}>
                        Higher values make the stroke take longer to reach full
                        size.
                      </Text>
                    </Box>

                    <Box>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={600}>
                          Taper in start size
                        </Text>
                        <Text size="sm" c="dimmed">
                          {taperInStartSizePercent}%
                        </Text>
                      </Group>

                      <Slider
                        min={1}
                        max={100}
                        step={1}
                        value={taperInStartSizePercent}
                        onChange={setTaperInStartSizePercent}
                      />

                      <Text size="xs" c="dimmed" mt={8}>
                        Controls how thin the very start of the stroke can be
                        before it ramps up.
                      </Text>
                    </Box>
                  </Stack>
                </Paper>

                <Paper withBorder p="sm" radius={0}>
                  <Stack gap="md">
                    <Switch
                      checked={taperOutEnabled}
                      onChange={(event) =>
                        setTaperOutEnabled(event.currentTarget.checked)
                      }
                      label="Enable taper out"
                    />

                    <Box>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={600}>
                          Taper out distance
                        </Text>
                        <Text size="sm" c="dimmed">
                          {taperOutDistance}px
                        </Text>
                      </Group>

                      <Slider
                        min={0}
                        max={128}
                        step={1}
                        value={taperOutDistance}
                        onChange={setTaperOutDistance}
                      />

                      <Text size="xs" c="dimmed" mt={8}>
                        Higher values make the stroke fade out over a longer
                        tail.
                      </Text>
                    </Box>

                    <Box>
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={600}>
                          Taper out end size
                        </Text>
                        <Text size="sm" c="dimmed">
                          {taperOutEndSizePercent}%
                        </Text>
                      </Group>

                      <Slider
                        min={1}
                        max={100}
                        step={1}
                        value={taperOutEndSizePercent}
                        onChange={setTaperOutEndSizePercent}
                      />

                      <Text size="xs" c="dimmed" mt={8}>
                        Controls how small the stroke tail gets at the very end.
                      </Text>
                    </Box>
                  </Stack>
                </Paper>
              </Stack>
            </ScrollArea>

            <Group justify="space-between" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  resetTaperInDefaults();
                  resetTaperOutDefaults();
                }}
              >
                Restore defaults
              </Button>

              <Button onClick={() => setTaperModalOpen(false)}>Done</Button>
            </Group>
          </Box>
        </Group>
      </Modal>

      <AppLayout
        headerTitle={roomName}
        headerActions={
          <Group gap="xs">
            {mirrorEnabled ? (
              <Menu
                shadow="sm"
                width={300}
                position="bottom-end"
                withinPortal
                opened={toolSettingsMenuOpened}
                onChange={setToolSettingsMenuOpened}
              >
                <Menu.Target>
                  <Tooltip label="Tool settings">
                    <ActionIcon variant="subtle" size="lg" radius={0}>
                      <IconAdjustments size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Menu.Target>

                <Menu.Dropdown>
                  <Box p="xs">
                    <Text size="sm" fw={600} mb={8}>
                      Mirror settings
                    </Text>

                    <Button
                      size="xs"
                      variant="default"
                      fullWidth
                      onClick={snapMirrorToCenter}
                    >
                      Snap to center
                    </Button>

                    <Box mt="sm">
                      <Group justify="space-between" mb={6}>
                        <Text size="sm" fw={500}>
                          Axis rotation
                        </Text>
                        <Text size="sm" c="dimmed">
                          {mirrorAngleDegrees}°
                        </Text>
                      </Group>

                      <Slider
                        min={0}
                        max={359}
                        step={1}
                        value={mirrorAngleDegrees}
                        onChange={setMirrorAngleDegrees}
                      />

                      <Text size="xs" c="dimmed" mt={8}>
                        Rotates the mirror axis around its center point.
                      </Text>
                    </Box>

                    <Box mt="sm">
                      <Text size="sm" fw={500} mb={6}>
                        Mirror axes
                      </Text>
                      <Group grow>
                        <Button
                          size="xs"
                          variant={mirrorAxes === 1 ? "filled" : "default"}
                          onClick={() => setMirrorAxes(1)}
                          leftSection={<IconLine size={14} />}
                        >
                          1 axis
                        </Button>
                        <Button
                          size="xs"
                          variant={mirrorAxes === 2 ? "filled" : "default"}
                          onClick={() => setMirrorAxes(2)}
                          leftSection={<IconCircle size={14} />}
                        >
                          2 axes
                        </Button>
                      </Group>

                      <Text size="xs" c="dimmed" mt={8}>
                        Two axes adds a second perpendicular mirror line and
                        creates the extra mirrored copies.
                      </Text>
                    </Box>

                    <Switch
                      mt="sm"
                      checked={mirrorHandleVisible}
                      onChange={(event) =>
                        setMirrorHandleVisible(event.currentTarget.checked)
                      }
                      label="Show move handle"
                    />
                  </Box>
                </Menu.Dropdown>
              </Menu>
            ) : null}

            <Menu
              shadow="sm"
              width={280}
              position="bottom-end"
              withinPortal
              opened={optionsMenuOpened}
              onChange={setOptionsMenuOpened}
            >
              <Menu.Target>
                <Tooltip label="Options">
                  <ActionIcon variant="subtle" size="lg" radius={0}>
                    <IconSettings size={18} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>

              <Menu.Dropdown>
                <Box p="xs">
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <Switch
                        checked={pressureEnabled}
                        onChange={(event) =>
                          setPressureEnabled(event.currentTarget.checked)
                        }
                        size="sm"
                      />
                      <Text size="sm">Pen Pressure</Text>
                    </Group>

                    <ActionIcon
                      variant="subtle"
                      radius={0}
                      onClick={() => {
                        setOptionsMenuOpened(false);
                        setPressureModalOpen(true);
                      }}
                    >
                      <IconDots size={16} />
                    </ActionIcon>
                  </Group>

                  <Text size="xs" c="dimmed" mt={8}>
                    Controls pressure size and pressure stabilization.
                  </Text>
                </Box>

                <Divider />

                <Box p="xs">
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <Switch
                        checked={smoothingEnabled}
                        onChange={(event) =>
                          setSmoothingEnabled(event.currentTarget.checked)
                        }
                        size="sm"
                      />

                      <Text size="sm">Stroke Smoothing</Text>
                    </Group>

                    <ActionIcon
                      variant="subtle"
                      radius={0}
                      onClick={() => {
                        setOptionsMenuOpened(false);
                        setSmoothingModalOpen(true);
                      }}
                    >
                      <IconDots size={16} />
                    </ActionIcon>
                  </Group>

                  <Text size="xs" c="dimmed" mt={8}>
                    Stabilizes strokes with lag.
                  </Text>
                </Box>

                <Divider />

                <Box p="xs">
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <Switch
                        checked={taperInEnabled || taperOutEnabled}
                        onChange={(event) => {
                          const enabled = event.currentTarget.checked;
                          setTaperInEnabled(enabled);
                          setTaperOutEnabled(enabled);
                        }}
                        size="sm"
                      />
                      <Text size="sm">Taper</Text>
                    </Group>

                    <ActionIcon
                      variant="subtle"
                      radius={0}
                      onClick={() => {
                        setOptionsMenuOpened(false);
                        setTaperModalOpen(true);
                      }}
                    >
                      <IconDots size={16} />
                    </ActionIcon>
                  </Group>

                  <Text size="xs" c="dimmed" mt={8}>
                    Controls how strokes narrow at the start and end.
                  </Text>
                </Box>
              </Menu.Dropdown>
            </Menu>

            <Tooltip label="Export canvas">
              <ActionIcon
                variant="subtle"
                size="lg"
                radius={0}
                onClick={() => onExport?.()}
              >
                <IconDownload size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip
              multiline
              w={260}
              label={
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Keybinds:
                  </div>
                  <div>Ctrl+Z - Undo</div>
                  <div>Ctrl+Shift+Z - Redo</div>
                  <div>B - Brush</div>
                  <div>E - Eraser</div>
                  <div>Ctrl+Left Click - Eyedropper</div>
                  <div>[ - Decrease brush size</div>
                  <div>] - Increase brush size</div>
                  <div>Ctrl+S - Open export modal</div>
                  <div>Tab - Toggle brush panel</div>
                  <div>Space+Left Click - Pan canvas</div>
                </div>
              }
            >
              <ActionIcon
                color="grey.5"
                variant="subtle"
                styles={{
                  root: {
                    "&:hover": {
                      backgroundColor: "transparent",
                    },
                  },
                }}
              >
                <IconKeyboard size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Back to home">
              <ActionIcon
                variant="subtle"
                size="lg"
                radius={0}
                color="white"
                onClick={() => navigate("/")}
              >
                <IconHome size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        }
        hideActions
        hideUserInfo
        overlayNavbar
        opened={sidebarOpen}
        toggle={toggleSidebar}
        leftOverlaySlot={<RoomToolToolbar leftOffset={toolbarLeftOffset} />}
        leftPanel={
          <Box
            style={{
              height: "100%",
              position: "relative",
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <Box
              style={{
                position: "absolute",
                right: -18,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 200,
                pointerEvents: "auto",
              }}
            ></Box>

            {sidebarOpen ? (
              <Box
                style={{
                  height: "100%",
                  width: "340px",
                  pointerEvents: "auto",
                  overflow: "hidden",
                }}
              >
                <Box
                  ref={leftPanelContentRef}
                  style={{
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    padding: 0,
                    gap: 0,
                  }}
                >
                  <Paper
                    radius={0}
                    p={8}
                    style={{
                      height: brushToolsHeight,
                      minHeight: BRUSH_TOOLS_MIN_HEIGHT,
                      maxHeight: BRUSH_TOOLS_MAX_HEIGHT,
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "var(--mantine-color-dark-7)",
                    }}
                  >
                    <Box
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflow: "hidden",
                      }}
                    >
                      <ColorSelector />
                    </Box>
                  </Paper>

                  <Box
                    onPointerDown={handleBrushSectionResizeStart}
                    style={{
                      height: BRUSH_SECTION_DIVIDER_HEIGHT,
                      minHeight: BRUSH_SECTION_DIVIDER_HEIGHT,
                      cursor: "row-resize",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      userSelect: "none",
                      touchAction: "none",
                    }}
                  >
                    <Box
                      style={{
                        width: 46,
                        height: 4,
                        borderRadius: 999,
                        background: isResizingBrushSections
                          ? "rgba(34, 139, 230, 0.9)"
                          : "rgba(255,255,255,0.18)",
                        transition: "background 120ms ease",
                      }}
                    />
                  </Box>

                  <Paper
                    radius={0}
                    p={8}
                    style={{
                      flex: 1,
                      minHeight: BRUSH_LIBRARY_MIN_HEIGHT,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "var(--mantine-color-dark-7)",
                    }}
                  >
                    <Box
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflow: "hidden",
                      }}
                    >
                      <BrushSidePanel
                        onBrushSelect={onBrushSelect ?? undefined}
                        registerStroke={registerStroke}
                      />
                    </Box>
                  </Paper>
                </Box>
              </Box>
            ) : null}
          </Box>
        }
        leftPanelWidth={leftPanelWidth}
        rightPanel={
          <Box
            style={{
              height: "100%",
              position: "relative",
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <Box
              style={{
                position: "absolute",
                left: -18,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 200,
                pointerEvents: "auto",
              }}
            >
              <ActionIcon
                variant="filled"
                radius="xl"
                size={28}
                onClick={toggleLayersPanel}
                style={{
                  background: "rgba(80, 80, 80, 0.72)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.28)",
                }}
              >
                {layersPanelOpen ? (
                  <IconChevronRight size={16} />
                ) : (
                  <IconChevronLeft size={16} />
                )}
              </ActionIcon>
            </Box>

            {layersPanelOpen ? (
              <Box
                style={{
                  height: "100%",
                  width: "260px",
                  pointerEvents: "auto",
                  overflow: "hidden",
                }}
              >
                <LayerSidePanel
                  layers={layers}
                  activeLayerId={activeLayerId}
                  canManageLayers={canManageLayers}
                  onSelectLayer={(layerId) => {
                    const layer = layers.find((item) => item.id === layerId);
                    if (!layer || !layer.visible) return;
                    setActiveLayerId(layerId);
                  }}
                  onToggleVisibility={toggleLayerVisibility}
                  onToggleLocked={toggleLayerLocked}
                  onCreateLayer={createLayer}
                  onRenameLayer={renameLayer}
                  onDeleteLayer={deleteLayer}
                  onReorderLayers={reorderLayers}
                  onUpdateLayerOpacity={updateLayerOpacity}
                />
              </Box>
            ) : null}
          </Box>
        }
        rightPanelWidth={layersPanelOpen ? 260 : 0}
        bottomHeight={64}
        bottomSlot={
          <Paper
            radius={0}
            withBorder
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "0 12px",
            }}
          >
            <Group gap="xs" wrap="nowrap">
              <UserAvatars users={users} />
              <Tooltip label="Undo">
                <ActionIcon
                  variant="filled"
                  size="lg"
                  radius={0}
                  onClick={() => onUndo?.()}
                  disabled={!canUndo}
                >
                  <IconArrowBackUp size={18} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Redo">
                <ActionIcon
                  variant="filled"
                  size="lg"
                  radius={0}
                  onClick={() => onRedo?.()}
                  disabled={!canRedo}
                >
                  <IconArrowForwardUp size={18} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Fit to viewport">
                <ActionIcon
                  variant="filled"
                  size="lg"
                  radius={0}
                  onClick={() => onResetView?.()}
                >
                  <IconZoomReset size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Paper>
        }
      />
    </RoomLayoutContext.Provider>
  );
}
