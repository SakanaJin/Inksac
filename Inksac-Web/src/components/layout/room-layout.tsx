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
  Avatar,
  Box,
  Divider,
  Group,
  NumberInput,
  Paper,
  Slider,
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
} from "@tabler/icons-react";
import { IconKeyboard } from "@tabler/icons-react";
import { AppLayout } from "./app-layout";
import { BrushSidePanel } from "../brushes/brush-side-panel";
import { LayerSidePanel } from "../layers/layer-side-panel";
import {
  type UserGetDto,
  type BrushGetDto,
  type RoomGetDto,
  type LayerGetDto,
  type ClientLayerDto,
} from "../../constants/types";
import api from "../../config/axios";
import { ColorSelector } from "../room-tools/color-selector";
import { EnvVars } from "../../config/env-vars";
import { UserAvatars } from "../room-tools/UserAvatars";

const baseurl = EnvVars.mediaBaseUrl;

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

export function RoomLayout() {
  const { id } = useParams();
  const [roomName, setRoomName] = useState(`Room ${id}`);
  const [canManageLayers, setCanManageLayers] = useState(false);
  const [color, setColor] = useState("#ffffffff");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [erase, setEraseState] = useState(false);
  const [strokeScale, setStrokeScale] = useState(16);
  const [users, setUsers] = useState<UserGetDto[]>([]);
  const [layers, setLayersState] = useState<ClientLayerDto[]>([]);
  const [activeLayerId, setActiveLayerIdState] = useState<number | null>(null);
  const [layersPanelOpen, setLayersPanelOpen] = useState(true);

  const addUser = (user: UserGetDto) => {
    setUsers((users) => {
      if (users.some((u) => u.id === user.id)) return users;
      return [...users, user];
    });
  };

  const removeUser = (userid: number) => {
    setUsers((users) => users.filter((user) => user.id !== userid));
  };

  const setLayers = useCallback((nextLayers: LayerGetDto[]) => {
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
  }, []);

  const setActiveLayerId = useCallback((layerId: number | null) => {
    setActiveLayerIdState(layerId);
  }, []);

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
            setLayers(nextLayers);

            if (activeLayerId === layerId) {
              setActiveLayerIdState(nextLayers[0]?.id ?? null);
            }

            notifications.show({
              title: "Success",
              message: "Layer deleted",
              color: "green",
            });
          } catch {
            notifications.show({
              title: "Error",
              message: "Could not delete layer",
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

  const onStrokeRef = useRef<((brushId: number) => void) | null>(null);
  const navigate = useNavigate();

  const setBrushInUse = useCallback((brushId: number) => {
    onStrokeRef.current?.(brushId);
  }, []);

  const registerStroke = useCallback((fn: (brushId: number) => void) => {
    onStrokeRef.current = fn;
  }, []);

  const [onSetErase, setOnSetErase] = useState<
    ((erase: boolean) => void) | null
  >(null);

  const registerSetErase = useCallback((fn: (erase: boolean) => void) => {
    setOnSetErase(() => fn);
  }, []);

  const setErase = useCallback(
    (erase: boolean) => {
      setEraseState(erase);
      onSetErase?.(erase);
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

  const setHistoryState = useCallback(
    (nextCanUndo: boolean, nextCanRedo: boolean) => {
      setCanUndo(nextCanUndo);
      setCanRedo(nextCanRedo);
    },
    [],
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const toggleLayersPanel = useCallback(() => {
    setLayersPanelOpen((prev) => !prev);
  }, []);

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
      }}
    >
      <AppLayout
        headerTitle={roomName}
        headerActions={
          <Group gap="xs">
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
                  <div>E - Toggle eraser</div>
                  <div>[ - Decrease brush size</div>
                  <div>] - Increase brush size</div>
                  <div>Ctrl+S - Open export modal</div>
                  <div>Tab - Toggle brush panel</div>
                  <div>Space+Left Click - Pan canvas</div>
                </div>
              }
            >
              <ActionIcon variant="subtle" size="lg" radius={0} c="gray.5">
                <IconKeyboard size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Back to home">
              <ActionIcon
                variant="subtle"
                size="lg"
                radius={0}
                color="red"
                onClick={() => navigate("/")}
              >
                <IconX size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        }
        sidebarWidth={340}
        hideActions
        hideUserInfo
        overlayNavbar
        opened={sidebarOpen}
        toggle={toggleSidebar}
        rightPanel={
          <Box
            style={{
              height: "100%",
              overflow: "visible",
              position: "relative",
            }}
          >
            <Box
              style={{
                position: "absolute",
                left: -18,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 200,
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
        sidebarSlots={{
          main: (
            <Box
              style={{
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Box style={{ flexShrink: 0 }}>
                <ColorSelector />
              </Box>

              <Box style={{ flexShrink: 0 }} mt={7} mb={7}>
                <Divider w="100%" />
                <Text size="sm" fw={600}>
                  Diameter
                </Text>
                <Group wrap="nowrap" align="center">
                  <Slider
                    style={{ flex: 1 }}
                    min={1}
                    max={512}
                    step={1}
                    value={strokeScale}
                    onChange={setStrokeScale}
                  />
                  <NumberInput
                    radius={0}
                    w={90}
                    min={1}
                    max={512}
                    step={1}
                    value={strokeScale}
                    onChange={(value) => setStrokeScale(value as number)}
                  />
                </Group>
                <Divider w="100%" mt={7} mb={7} />
              </Box>

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
            </Box>
          ),
          // add more sidebar content here later, e.g:
          // bottom: <RoomParticipants />
        }}
      />
    </RoomLayoutContext.Provider>
  );
}
