import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "./app-layout";
import { BrushSidePanel } from "../brushes/brush-side-panel";
import type { BrushGetDto, RoomGetDto } from "../../constants/types";
import api from "../../config/axios";
import { ColorSelector } from "../room-tools/color-selector";
import { Divider } from "@mantine/core";

type RoomLayoutContextValue = {
  registerBrushSelect: (fn: (brush: BrushGetDto) => void) => void;
  setBrushInUse: (brushId: number) => void;
  color: string;
  setColor: (color: string) => void;
};

const RoomLayoutContext = createContext<RoomLayoutContextValue>({
  registerBrushSelect: () => {},
  setBrushInUse: () => {},
  color: "#ffffffff",
  setColor: () => {},
});

export const useRoomLayout = () => useContext(RoomLayoutContext);

export function RoomLayout() {
  const { id } = useParams();
  const [roomName, setRoomName] = useState(`Room ${id}`);
  const [color, setColor] = useState("#ffffffff");

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

  const registerBrushSelect = useCallback(
    (fn: (brush: BrushGetDto) => void) => {
      setOnBrushSelect(() => fn);
    },
    [],
  );

  return (
    <RoomLayoutContext.Provider
      value={{ registerBrushSelect, setBrushInUse, color, setColor }}
    >
      <AppLayout
        headerTitle={roomName}
        sidebarWidth={340}
        hideActions
        hideUserInfo
        overlayNavbar
        sidebarSlots={{
          main: (
            <>
              <ColorSelector />
              <Divider />
              <BrushSidePanel
                onBrushSelect={onBrushSelect ?? undefined}
                registerStroke={registerStroke}
              />
            </>
          ),
          // add more sidebar content here later, e.g:
          // bottom: <RoomParticipants />
        }}
      />
    </RoomLayoutContext.Provider>
  );
}
