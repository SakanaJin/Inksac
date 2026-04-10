import {
  ActionIcon,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Box,
  Menu,
  Title,
} from "@mantine/core";
import {
  IconEye,
  IconEyeOff,
  IconPlus,
  IconDotsVertical,
  IconLock,
  IconLockOpen,
  IconChevronUp,
  IconChevronDown,
  IconMinus,
  IconPlus as IconPlusSmall,
} from "@tabler/icons-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ClientLayerDto } from "../../constants/types";

interface LayerSidePanelProps {
  layers: ClientLayerDto[];
  activeLayerId: number | null;
  canManageLayers: boolean;
  onSelectLayer: (layerId: number) => void;
  onToggleVisibility: (layerId: number) => void;
  onToggleLocked: (layerId: number) => void;
  onCreateLayer: () => void;
  onRenameLayer: (layerId: number) => void;
  onDeleteLayer: (layerId: number) => void;
  onReorderLayers: (orderedLayerIds: number[]) => void;
  onUpdateLayerOpacity: (
    layerId: number,
    opacityPercent: number,
  ) => Promise<void>;
}

export function LayerSidePanel({
  layers,
  activeLayerId,
  canManageLayers,
  onSelectLayer,
  onToggleVisibility,
  onToggleLocked,
  onCreateLayer,
  onRenameLayer,
  onDeleteLayer,
  onReorderLayers,
  onUpdateLayerOpacity,
}: LayerSidePanelProps) {
  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => b.position - a.position),
    [layers],
  );

  const [displayLayers, setDisplayLayers] =
    useState<ClientLayerDto[]>(sortedLayers);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [opacityValue, setOpacityValue] = useState(100);

  const draggingIdRef = useRef<number | null>(null);
  const dragStartYRef = useRef(0);
  const currentIndexRef = useRef<number | null>(null);
  const dragOffsetYRef = useRef(0);
  const displayLayersRef = useRef<ClientLayerDto[]>(sortedLayers);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const prevTopsRef = useRef<Record<number, number>>({});
  const opacitySliderRef = useRef<HTMLDivElement | null>(null);
  const isOpacityDraggingRef = useRef(false);
  const skipNextReorderAnimationRef = useRef(false);
  const shouldAnimateReorderRef = useRef(false);

  useEffect(() => {
    if (draggingIdRef.current !== null) return;
    setDisplayLayers(sortedLayers);
    displayLayersRef.current = sortedLayers;
  }, [sortedLayers]);

  useEffect(() => {
    const activeLayer =
      layers.find((layer) => layer.id === activeLayerId) ?? null;
    setOpacityValue(Math.round((activeLayer?.opacity ?? 1) * 100));
  }, [layers, activeLayerId]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointermove", handleOpacityPointerMove);
      window.removeEventListener("pointerup", handleOpacityPointerUp);
    };
  }, []);

  useEffect(() => {
    const nextTops: Record<number, number> = {};

    if (skipNextReorderAnimationRef.current) {
      for (const layer of displayLayers) {
        const el = rowRefs.current[layer.id];
        if (!el) continue;

        el.style.transition = "none";
        el.style.transform = "translateY(0px)";
        nextTops[layer.id] = el.getBoundingClientRect().top;
      }

      prevTopsRef.current = nextTops;
      skipNextReorderAnimationRef.current = false;
      return;
    }

    if (!shouldAnimateReorderRef.current && draggingIdRef.current === null) {
      for (const layer of displayLayers) {
        const el = rowRefs.current[layer.id];
        if (!el) continue;

        el.style.transition = "none";
        el.style.transform = "translateY(0px)";
        nextTops[layer.id] = el.getBoundingClientRect().top;
      }

      prevTopsRef.current = nextTops;
      return;
    }

    for (const layer of displayLayers) {
      const el = rowRefs.current[layer.id];
      if (!el) continue;

      const newTop = el.getBoundingClientRect().top;
      nextTops[layer.id] = newTop;

      if (layer.id === draggingIdRef.current) continue;

      const prevTop = prevTopsRef.current[layer.id];
      if (prevTop === undefined) continue;

      const delta = prevTop - newTop;
      if (delta === 0) continue;

      el.style.transition = "none";
      el.style.transform = `translateY(${delta}px)`;

      requestAnimationFrame(() => {
        el.style.transition = "transform 180ms ease";
        el.style.transform = "translateY(0px)";
      });
    }

    prevTopsRef.current = nextTops;
  }, [displayLayers]);

  const commitOrder = (layersInDisplayOrder: ClientLayerDto[]) => {
    if (!canManageLayers) return;

    const backendOrder = [...layersInDisplayOrder]
      .reverse()
      .map((layer) => layer.id);

    onReorderLayers(backendOrder);
  };

  const moveActiveLayer = (direction: "up" | "down") => {
    if (!canManageLayers) return;
    if (activeLayerId === null) return;

    const currentLayers = [...displayLayersRef.current];
    const currentIndex = currentLayers.findIndex(
      (layer) => layer.id === activeLayerId,
    );
    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= currentLayers.length) return;

    const [moved] = currentLayers.splice(currentIndex, 1);
    currentLayers.splice(targetIndex, 0, moved);

    displayLayersRef.current = currentLayers;
    shouldAnimateReorderRef.current = false;
    skipNextReorderAnimationRef.current = true;
    setDisplayLayers(currentLayers);
    commitOrder(currentLayers);
  };

  const updateOpacity = (nextValue: number) => {
    if (!canManageLayers) return;

    const activeLayer =
      layers.find((layer) => layer.id === activeLayerId) ?? null;
    if (!activeLayer) return;

    const clampedValue = Math.max(0, Math.min(100, nextValue));
    setOpacityValue(clampedValue);
    void onUpdateLayerOpacity(activeLayer.id, clampedValue);
  };

  const nudgeOpacity = (delta: number) => {
    if (!canManageLayers) return;
    updateOpacity(opacityValue + delta);
  };

  const getOpacityFromClientX = (clientX: number) => {
    const slider = opacitySliderRef.current;
    if (!slider) return opacityValue;

    const rect = slider.getBoundingClientRect();
    if (rect.width <= 0) return opacityValue;

    const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return Math.round((relativeX / rect.width) * 100);
  };

  const handleOpacityPointerMove = (e: PointerEvent) => {
    if (!isOpacityDraggingRef.current) return;
    updateOpacity(getOpacityFromClientX(e.clientX));
  };

  const handleOpacityPointerUp = () => {
    isOpacityDraggingRef.current = false;
    window.removeEventListener("pointermove", handleOpacityPointerMove);
    window.removeEventListener("pointerup", handleOpacityPointerUp);
  };

  const handleOpacityPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canManageLayers) return;

    e.preventDefault();
    e.stopPropagation();

    isOpacityDraggingRef.current = true;
    updateOpacity(getOpacityFromClientX(e.clientX));

    window.addEventListener("pointermove", handleOpacityPointerMove);
    window.addEventListener("pointerup", handleOpacityPointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!canManageLayers) return;
    if (draggingIdRef.current === null || currentIndexRef.current === null) {
      return;
    }

    const deltaY = e.clientY - dragStartYRef.current;
    const rowHeight = 40;

    dragOffsetYRef.current += deltaY;
    setDragOffsetY(dragOffsetYRef.current);

    const moveBy = Math.trunc(dragOffsetYRef.current / rowHeight);

    if (moveBy !== 0) {
      const currentLayers = [...displayLayersRef.current];
      let newIndex = currentIndexRef.current + moveBy;
      newIndex = Math.max(0, Math.min(currentLayers.length - 1, newIndex));

      if (newIndex !== currentIndexRef.current) {
        const [moved] = currentLayers.splice(currentIndexRef.current, 1);
        currentLayers.splice(newIndex, 0, moved);

        currentIndexRef.current = newIndex;
        displayLayersRef.current = currentLayers;
        setDisplayLayers(currentLayers);

        dragOffsetYRef.current -= moveBy * rowHeight;
        setDragOffsetY(dragOffsetYRef.current);
      }
    }

    dragStartYRef.current = e.clientY;
  };

  const handlePointerUp = () => {
    const finalLayers = [...displayLayersRef.current];

    draggingIdRef.current = null;
    currentIndexRef.current = null;
    dragOffsetYRef.current = 0;

    setDraggingId(null);
    setDragOffsetY(0);

    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);

    commitOrder(finalLayers);
    shouldAnimateReorderRef.current = false;
  };

  const handlePointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    layerId: number,
  ) => {
    if (!canManageLayers) return;

    if ((e.target as HTMLElement).closest("button,[role='menuitem'],input")) {
      return;
    }

    shouldAnimateReorderRef.current = true;
    draggingIdRef.current = layerId;
    dragStartYRef.current = e.clientY;
    currentIndexRef.current = displayLayersRef.current.findIndex(
      (layer) => layer.id === layerId,
    );
    dragOffsetYRef.current = 0;

    setDraggingId(layerId);
    setDragOffsetY(0);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <Paper
      h="100%"
      w="100%"
      radius={0}
      p={0}
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Title
        order={5}
        px="sm"
        py="xs"
        ta="center"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          fontWeight: 600,
        }}
      >
        Layers
      </Title>

      <Group gap={0} wrap="nowrap" align="stretch">
        <Box
          ref={opacitySliderRef}
          onPointerDown={handleOpacityPointerDown}
          style={{
            position: "relative",
            width: "calc(100% - 36px)",
            height: 32,
            cursor: canManageLayers ? "pointer" : "default",
            userSelect: "none",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
            opacity: canManageLayers ? 1 : 0.7,
          }}
        >
          <Box
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: `${opacityValue}%`,
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
              Opacity: {opacityValue}%
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
            disabled={
              !canManageLayers || activeLayerId === null || opacityValue >= 100
            }
            onClick={() => nudgeOpacity(5)}
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
            disabled={
              !canManageLayers || activeLayerId === null || opacityValue <= 0
            }
            onClick={() => nudgeOpacity(-5)}
          >
            <IconMinus size={12} />
          </ActionIcon>
        </Box>
      </Group>

      <Box
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          background: "var(--mantine-color-dark-8)", // 👈 darker than panel
        }}
      >
        <ScrollArea h="100%" scrollbarSize={10} type="always">
          <Box w="100%">
            <Stack gap={0} w="100%">
              {displayLayers.map((layer) => {
                const isActive = layer.id === activeLayerId;
                const isDragging = layer.id === draggingId;

                return (
                  <Box
                    key={layer.id}
                    ref={(el) => {
                      rowRefs.current[layer.id] = el;
                    }}
                    onClick={() => onSelectLayer(layer.id)}
                    onPointerDown={(e) => handlePointerDown(e, layer.id)}
                    style={{
                      height: 40,
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      cursor: canManageLayers
                        ? isDragging
                          ? "grabbing"
                          : "grab"
                        : "pointer",
                      opacity: isDragging ? 0.75 : 1,
                      transform: isDragging
                        ? `translateY(${dragOffsetY}px)`
                        : undefined,
                      zIndex: isDragging ? 10 : 1,
                      position: "relative",
                      minHeight: 40,
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 8,
                      paddingRight: 0,
                      userSelect: "none",
                      background: isActive
                        ? "rgba(255,255,255,0.08)"
                        : "transparent",
                    }}
                  >
                    <Group
                      justify="space-between"
                      wrap="nowrap"
                      w="100%"
                      gap={8}
                    >
                      <Group
                        gap={8}
                        wrap="nowrap"
                        style={{ minWidth: 0, flex: 1 }}
                      >
                        <ActionIcon
                          variant="subtle"
                          radius={0}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(layer.id);
                          }}
                        >
                          {layer.visible ? (
                            <IconEye size={18} />
                          ) : (
                            <IconEyeOff size={18} />
                          )}
                        </ActionIcon>

                        <Text
                          size="sm"
                          truncate
                          style={{
                            flex: 1,
                            fontWeight: isActive ? 600 : 400,
                          }}
                        >
                          {layer.name}
                        </Text>
                      </Group>

                      {canManageLayers ? (
                        <Group gap={2} wrap="nowrap">
                          <ActionIcon
                            variant="subtle"
                            radius={0}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleLocked(layer.id);
                            }}
                          >
                            {layer.locked ? (
                              <IconLock size={18} />
                            ) : (
                              <IconLockOpen size={18} />
                            )}
                          </ActionIcon>

                          <Menu withinPortal position="bottom-end">
                            <Menu.Target>
                              <ActionIcon
                                variant="subtle"
                                radius={0}
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconDotsVertical size={18} />
                              </ActionIcon>
                            </Menu.Target>

                            <Menu.Dropdown>
                              <Menu.Item
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRenameLayer(layer.id);
                                }}
                              >
                                Rename
                              </Menu.Item>
                              <Menu.Item
                                color="red"
                                disabled={layers.length <= 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteLayer(layer.id);
                                }}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      ) : null}
                    </Group>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </ScrollArea>
      </Box>

      <Box
        px={8}
        style={{
          height: 64,
          minHeight: 64,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {canManageLayers ? (
          <Group justify="space-between" wrap="nowrap" w="100%">
            <Group gap={4} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                radius={0}
                size="lg"
                onClick={onCreateLayer}
              >
                <IconPlus size={24} />
              </ActionIcon>
            </Group>

            <Group gap={4} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                radius={0}
                size="lg"
                disabled={!activeLayerId}
                onClick={() => moveActiveLayer("up")}
              >
                <IconChevronUp size={22} />
              </ActionIcon>

              <ActionIcon
                variant="subtle"
                radius={0}
                size="lg"
                disabled={!activeLayerId}
                onClick={() => moveActiveLayer("down")}
              >
                <IconChevronDown size={22} />
              </ActionIcon>
            </Group>
          </Group>
        ) : (
          <Text size="xs" c="dimmed">
            You can select layers and toggle visibility.
          </Text>
        )}
      </Box>
    </Paper>
  );
}
