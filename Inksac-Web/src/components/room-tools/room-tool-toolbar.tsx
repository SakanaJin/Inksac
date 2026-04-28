import { ActionIcon, Menu, Paper, Stack, Tooltip } from "@mantine/core";
import {
  IconBrush,
  IconEraser,
  IconColorPicker,
  IconLine,
  IconSquare,
  IconCircle,
  IconFlipVertical,
  IconArrowsMove,
} from "@tabler/icons-react";
import { useRoomLayout } from "../layout/room-layout";

type RoomToolToolbarProps = {
  leftOffset?: number;
};

export function RoomToolToolbar({ leftOffset = 16 }: RoomToolToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    shapeType,
    setShapeType,
    mirrorEnabled,
    setMirrorEnabled,
    isActiveLayerMovable,
    moveToolDisabledReason,
  } = useRoomLayout();

  const shapeLabel =
    shapeType === "line"
      ? "Shapes (Line)"
      : shapeType === "rectangle"
        ? "Shapes (Rectangle)"
        : "Shapes (Ellipse)";

  return (
    <Paper
      radius={0}
      p={6}
      style={{
        position: "absolute",
        top: 16,
        left: leftOffset,
        zIndex: 1,
        pointerEvents: "auto",
        background: "rgba(40, 40, 40, 0.86)",
        backdropFilter: "blur(4px)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.28)",
        transition: "left 160ms ease",
      }}
    >
      <Stack gap={6}>
        <Tooltip label="Brush">
          <ActionIcon
            variant={activeTool === "brush" ? "filled" : "subtle"}
            size="lg"
            radius={0}
            onClick={() => setActiveTool("brush")}
          >
            <IconBrush size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Eraser">
          <ActionIcon
            variant={activeTool === "eraser" ? "filled" : "subtle"}
            size="lg"
            radius={0}
            color={activeTool === "eraser" ? "red" : undefined}
            onClick={() => setActiveTool("eraser")}
          >
            <IconEraser size={18} />
          </ActionIcon>
        </Tooltip>

        <Menu withinPortal position="right-start" shadow="sm">
          <Menu.Target>
            <div>
              <Tooltip label={shapeLabel}>
                <ActionIcon
                  variant={activeTool === "shapes" ? "filled" : "subtle"}
                  size="lg"
                  radius={0}
                  onClick={() => setActiveTool("shapes")}
                >
                  {shapeType === "line" ? (
                    <IconLine size={18} />
                  ) : shapeType === "rectangle" ? (
                    <IconSquare size={18} />
                  ) : (
                    <IconCircle size={18} />
                  )}
                </ActionIcon>
              </Tooltip>
            </div>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconLine size={16} />}
              onClick={() => {
                setShapeType("line");
                setActiveTool("shapes");
              }}
            >
              Line
            </Menu.Item>
            <Menu.Item
              leftSection={<IconSquare size={16} />}
              onClick={() => {
                setShapeType("rectangle");
                setActiveTool("shapes");
              }}
            >
              Rectangle
            </Menu.Item>
            <Menu.Item
              leftSection={<IconCircle size={16} />}
              onClick={() => {
                setShapeType("ellipse");
                setActiveTool("shapes");
              }}
            >
              Ellipse
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Tooltip label={moveToolDisabledReason ?? "Move layer"}>
          <ActionIcon
            variant={activeTool === "move" ? "filled" : "subtle"}
            size="lg"
            radius={0}
            color={activeTool === "move" ? "blue" : undefined}
            disabled={!isActiveLayerMovable}
            onClick={() => setActiveTool("move")}
          >
            <IconArrowsMove size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Mirror">
          <ActionIcon
            variant={mirrorEnabled ? "filled" : "subtle"}
            size="lg"
            radius={0}
            color={mirrorEnabled ? "blue" : undefined}
            onClick={() => setMirrorEnabled(!mirrorEnabled)}
          >
            <IconFlipVertical size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Eyedropper">
          <ActionIcon
            variant={activeTool === "eyedropper" ? "filled" : "subtle"}
            size="lg"
            radius={0}
            onClick={() => setActiveTool("eyedropper")}
          >
            <IconColorPicker size={18} />
          </ActionIcon>
        </Tooltip>
      </Stack>
    </Paper>
  );
}
