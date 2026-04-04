import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useParams } from "react-router-dom";
import { ActionIcon, Box, Divider, Group, Paper, Tooltip } from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconZoomReset,
} from "@tabler/icons-react";
import { AppLayout } from "./app-layout";
import { BrushSidePanel } from "../brushes/brush-side-panel";
import type { BrushGetDto, RoomGetDto } from "../../constants/types";
import api from "../../config/axios";
import { ColorSelector } from "../room-tools/color-selector";

type RoomLayoutContextValue = {
  registerBrushSelect: (fn: (brush: BrushGetDto) => void) => void;
  setBrushInUse: (brushId: number) => void;
  registerUndo: (fn: () => void) => void;
  registerRedo: (fn: () => void) => void;
  registerResetView: (fn: () => void) => void;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;
  color: string;
  setColor: (color: string) => void;
};

const RoomLayoutContext = createContext<RoomLayoutContextValue>({
  registerBrushSelect: () => {},
  setBrushInUse: () => {},
  registerUndo: () => {},
  registerRedo: () => {},
  registerResetView: () => {},
  setHistoryState: () => {},
  color: "#ffffffff",
  setColor: () => {},
});

export const useRoomLayout = () => useContext(RoomLayoutContext);

export function RoomLayout() {
  const { id } = useParams();
  const [roomName, setRoomName] = useState(`Room ${id}`);
  const [color, setColor] = useState("#ffffffff");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const onStrokeRef = useRef<((brushId: number) => void) | null>(null);

  const setBrushInUse = useCallback((brushId: number) => {
    onStrokeRef.current?.(brushId);
  }, []);

  const registerStroke = useCallback((fn: (brushId: number) => void) => {
    onStrokeRef.current = fn;
  }, []);

  useEffect(() => {
    api.get<RoomGetDto>(`/rooms/${id}`).then((res) => {
      if (res.data.data) setRoomName(res.data.data.name);
    });
  }, [id]);

  const [onBrushSelect, setOnBrushSelect] = useState<
    ((brush: BrushGetDto) => void) | null
  >(null);
  const [onUndo, setOnUndo] = useState<(() => void) | null>(null);
  const [onRedo, setOnRedo] = useState<(() => void) | null>(null);
  const [onResetView, setOnResetView] = useState<(() => void) | null>(null);

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

  const setHistoryState = useCallback(
    (nextCanUndo: boolean, nextCanRedo: boolean) => {
      setCanUndo(nextCanUndo);
      setCanRedo(nextCanRedo);
    },
    [],
  );

  return (
    <RoomLayoutContext.Provider
      value={{
        registerBrushSelect,
        setBrushInUse,
        registerUndo,
        registerRedo,
        registerResetView,
        setHistoryState,
        color,
        setColor,
      }}
    >
      <AppLayout
        headerTitle={roomName}
        sidebarWidth={340}
        hideActions
        hideUserInfo
        overlayNavbar
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

              <Box style={{ flexShrink: 0 }}>
                <Divider />
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
