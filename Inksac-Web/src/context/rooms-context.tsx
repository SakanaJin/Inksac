import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import api from "../config/axios";
import { useUser } from "../authentication/use-auth";
import { sortRooms } from "../utils/room-utils";
import type { RoomGetDto } from "../constants/types";

interface RoomContextValue {
  rooms: RoomGetDto[];
  isFetching: boolean;
  hasFetched: boolean;
  refresh: () => Promise<void>;
  invalidateAndRefresh: () => Promise<void>;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export const RoomProvider = ({ children }: { children: ReactNode }) => {
  const user = useUser();
  const currentUserId = user.id;

  const [rooms, setRooms] = useState<RoomGetDto[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchRooms = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await api.get<RoomGetDto[]>("/rooms");
      if (!response.data.has_errors) {
        setRooms(sortRooms(response.data.data, currentUserId));
      }
    } finally {
      setIsFetching(false);
      setHasFetched(true);
    }
  }, [currentUserId]);

  // Initial fetch only once
  useEffect(() => {
    if (!hasFetched) {
      fetchRooms();
    }
  }, [fetchRooms, hasFetched]);

  const invalidateAndRefresh = useCallback(async () => {
    await fetchRooms();
  }, [fetchRooms]);

  return (
    <RoomContext.Provider
      value={{
        rooms,
        isFetching,
        hasFetched,
        refresh: fetchRooms,
        invalidateAndRefresh,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRooms = () => {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRooms must be used within a RoomProvider");
  return ctx;
};
