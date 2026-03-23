import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "./app-layout";
import { BrushSidePanel } from "../brushes/brush-side-panel";
import type { BrushGetDto, RoomGetDto } from "../../constants/types";
import api from "../../config/axios";

type RoomLayoutContextValue = {
  registerBrushSelect: (fn: (brush: BrushGetDto) => void) => void;
};

const RoomLayoutContext = createContext<RoomLayoutContextValue>({
  registerBrushSelect: () => {},
});

export const useRoomLayout = () => useContext(RoomLayoutContext);

export function RoomLayout() {
  const { id } = useParams();
  const [roomName, setRoomName] = useState(`Room ${id}`);

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
    <RoomLayoutContext.Provider value={{ registerBrushSelect }}>
      <AppLayout
        headerTitle={roomName}
        sidebarWidth={340}
        hideActions
        hideUserInfo
        overlayNavbar
        sidebarSlots={{
          main: <BrushSidePanel onBrushSelect={onBrushSelect ?? undefined} />,
          // add more sidebar content here later, e.g:
          // bottom: <RoomParticipants />
        }}
      />
    </RoomLayoutContext.Provider>
  );
}
