import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Image,
  Menu,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconMinus, IconPlus as IconPlusSmall } from "@tabler/icons-react";
import api from "../../config/axios";
import { useAuth } from "../../authentication/use-auth";
import { EnvVars } from "../../config/env-vars";
import { BrushType, UserRole, type BrushGetDto } from "../../constants/types";
import { useRoomLayout } from "../layout/room-layout";

const baseurl = EnvVars.mediaBaseUrl;

interface BrushSidePanelProps {
  onBrushSelect?: (brush: BrushGetDto) => void;
  registerStroke?: (fn: (brushId: number) => void) => void;
}

export function BrushSidePanel({
  onBrushSelect,
  registerStroke,
}: BrushSidePanelProps) {
  const { user } = useAuth();
  const { strokeScale, setStrokeScale } = useRoomLayout();
  const isguest = user.role === UserRole.GUEST;

  const [brushes, setBrushes] = useState<BrushGetDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const [selectedBrushId, setSelectedBrushId] = useState<number | null>(null);

  const diameterSliderRef = useRef<HTMLDivElement | null>(null);
  const isDiameterDraggingRef = useRef(false);

  const refresh = async () => {
    setLoading(true);

    try {
      const response = await api.get<BrushGetDto[]>("/brushes/user-and-system");

      if (response.data.data) {
        setBrushes(response.data.data);
      }

      if (selectedBrushId === null) {
        const defaultBrush = response.data.data[0];
        setSelectedBrushId(defaultBrush.id);
        onBrushSelect?.(defaultBrush);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!registerStroke) return;
    registerStroke((brushId: number) => {
      setBrushes((prev) =>
        prev.map((b) => (b.id === brushId ? { ...b, in_use: true } : b)),
      );
    });
  }, [registerStroke]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handleDiameterPointerMove);
      window.removeEventListener("pointerup", handleDiameterPointerUp);
    };
  }, []);

  const handleBrushSubmit = (brush: BrushGetDto) => {
    setBrushes((prev) => {
      const exists = prev.some((item) => item.id === brush.id);

      if (exists) {
        return prev.map((item) => (item.id === brush.id ? brush : item));
      }

      return [brush, ...prev];
    });
  };

  const handleBrushClick = (brush: BrushGetDto) => {
    setSelectedBrushId(brush.id);
    onBrushSelect?.(brush);
  };

  const openCreateModal = () => {
    if (isguest) return;

    modals.openContextModal({
      modal: "brusheditormodal",
      title: "Create Brush",
      size: 720,
      centered: true,
      styles: {
        body: { overflow: "hidden" },
        content: { overflow: "hidden" },
      },
      innerProps: {
        onSubmit: handleBrushSubmit,
      },
    });
  };

  const openEditModal = (brush: BrushGetDto) => {
    if (isguest) return;

    modals.openContextModal({
      modal: "brusheditormodal",
      title: "Edit Brush",
      size: 720,
      centered: true,
      styles: {
        body: { overflow: "hidden" },
        content: { overflow: "hidden" },
      },
      innerProps: {
        brush: brush,
        onSubmit: handleBrushSubmit,
      },
    });
  };

  const openDeleteModal = (brush: BrushGetDto) => {
    if (isguest) return;

    modals.openConfirmModal({
      title: "Delete Brush",
      centered: true,
      children: (
        <Text size="sm">Are you sure you want to delete this brush?</Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        const deleteResponse = await api.delete<boolean>(
          `/brushes/${brush.id}`,
        );

        if (deleteResponse.data.data) {
          setBrushes((prev) => prev.filter((item) => item.id !== brush.id));

          if (selectedBrushId === brush.id) {
            const fallback = await api.get<BrushGetDto>("/brushes/1");
            const defaultBrush = fallback.data.data;
            setSelectedBrushId(defaultBrush.id);
            onBrushSelect?.(defaultBrush);
          }
          notifications.show({
            title: "Success",
            message: "Brush deleted successfully",
            color: "green",
          });
        }
      },
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return brushes;

    return brushes.filter((brush) => brush.name.toLowerCase().includes(q));
  }, [brushes, query]);

  const updateDiameter = (nextValue: number) => {
    const clampedValue = Math.max(1, Math.min(512, nextValue));
    setStrokeScale(clampedValue);
  };

  const nudgeDiameter = (delta: number) => {
    updateDiameter(strokeScale + delta);
  };

  const getDiameterFromClientX = (clientX: number) => {
    const slider = diameterSliderRef.current;
    if (!slider) return strokeScale;

    const rect = slider.getBoundingClientRect();
    if (rect.width <= 0) return strokeScale;

    const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = relativeX / rect.width;

    return Math.round(1 + ratio * (512 - 1));
  };

  const handleDiameterPointerMove = (e: PointerEvent) => {
    if (!isDiameterDraggingRef.current) return;
    updateDiameter(getDiameterFromClientX(e.clientX));
  };

  const handleDiameterPointerUp = () => {
    isDiameterDraggingRef.current = false;
    window.removeEventListener("pointermove", handleDiameterPointerMove);
    window.removeEventListener("pointerup", handleDiameterPointerUp);
  };

  const handleDiameterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    isDiameterDraggingRef.current = true;
    updateDiameter(getDiameterFromClientX(e.clientX));

    window.addEventListener("pointermove", handleDiameterPointerMove);
    window.addEventListener("pointerup", handleDiameterPointerUp);
  };

  const diameterPercent = ((strokeScale - 1) / (512 - 1)) * 100;

  return (
    <Stack gap={6} style={{ height: "100%" }}>
      <Group gap={0} wrap="nowrap" align="stretch">
        <Box
          ref={diameterSliderRef}
          onPointerDown={handleDiameterPointerDown}
          style={{
            position: "relative",
            width: "calc(100% - 36px)",
            height: 32,
            cursor: "pointer",
            userSelect: "none",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <Box
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: `${diameterPercent}%`,
              background: "rgba(34, 139, 230, 0.65)",
              pointerEvents: "none",
            }}
          />
          <Box
            style={{
              position: "relative",
              zIndex: 1,
              height: "100%",
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
            }}
          >
            <Text size="sm" fw={500}>
              Diameter: {strokeScale}px
            </Text>
          </Box>
        </Box>

        <Box
          style={{
            width: 36,
            height: 32,
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ActionIcon
            variant="subtle"
            radius={0}
            size={16}
            style={{ width: "100%", height: 16 }}
            disabled={strokeScale >= 512}
            onClick={() => nudgeDiameter(5)}
          >
            <IconPlusSmall size={12} />
          </ActionIcon>

          <ActionIcon
            variant="subtle"
            radius={0}
            size={16}
            style={{
              width: "100%",
              height: 16,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
            disabled={strokeScale <= 1}
            onClick={() => nudgeDiameter(-5)}
          >
            <IconMinus size={12} />
          </ActionIcon>
        </Box>
      </Group>

      <Group justify="space-between" align="center" gap={4}>
        <Text fw={600}>Brushes</Text>

        <Button
          size="xs"
          variant="light"
          onClick={refresh}
          loading={loading}
          radius={0}
        >
          Refresh
        </Button>
      </Group>

      <TextInput
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        radius={0}
        size="xs"
      />

      <Box style={{ flex: 1, minHeight: 0 }}>
        <ScrollArea h="100%" type="always" scrollbarSize={6} offsetScrollbars>
          <SimpleGrid cols={4} spacing={2}>
            {filtered.map((brush) => {
              const isowner = brush.owner?.id === user.id;
              const canedit =
                !isguest && isowner && brush.brush_type !== BrushType.SYSTEM;

              return (
                <Paper
                  key={brush.id}
                  p={4}
                  radius={0}
                  onClick={() => handleBrushClick(brush)}
                  style={{
                    cursor: "pointer",
                    background:
                      selectedBrushId === brush.id ? "#4a4848" : "#323131",
                  }}
                >
                  <Box
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      overflow: "hidden",
                      background: "rgba(0,0,0,0.06)",
                    }}
                  >
                    <Image
                      src={baseurl + brush.imgurl}
                      alt={brush.name}
                      fit="contain"
                      radius={0}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </Box>

                  <Group justify="space-between" mt={4} gap={4} wrap="nowrap">
                    <Text size="xs" fw={600} lineClamp={1} style={{ flex: 1 }}>
                      {brush.name}
                    </Text>

                    {canedit && !brush.in_use ? (
                      <Menu withinPortal position="bottom-end" shadow="sm">
                        <Menu.Target>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            radius={0}
                            disabled={isguest}
                            onClick={(e) => e.stopPropagation()}
                          >
                            ⋮
                          </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                          <Menu.Item onClick={() => openEditModal(brush)}>
                            Edit
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            onClick={() => openDeleteModal(brush)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    ) : null}
                  </Group>
                </Paper>
              );
            })}
          </SimpleGrid>

          {!loading && filtered.length === 0 ? (
            <Text size="xs" c="dimmed" ta="center" mt="sm">
              No brushes found
            </Text>
          ) : null}
        </ScrollArea>
      </Box>

      <Group
        justify="flex-end"
        gap={4}
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 6,
        }}
      >
        <ActionIcon
          size="md"
          variant="filled"
          radius={0}
          onClick={openCreateModal}
          disabled={isguest}
        >
          +
        </ActionIcon>
      </Group>
    </Stack>
  );
}
