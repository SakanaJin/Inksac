import { ActionIcon, ColorPicker, Group, NumberInput, Tooltip } from "@mantine/core";
import { useRoomLayout } from "../layout/room-layout";
import {
  IconEraser,
  IconBrush,
  IconBrushOff,
  IconEraserOff,
} from "@tabler/icons-react";

export function ColorSelector() {
  const { color, setColor, setErase, erase } = useRoomLayout();
  const [r,g,b,a = 1] = color.match(/[\d.]+/g)!.map(Number);

  let modeTooltipLabel = "";
  let eraseMode;
  

  if (erase) {
    modeTooltipLabel = "Draw mode";
    eraseMode = (
      <ActionIcon
        pos="relative"
        size="xl"
        radius={0}
        onClick={() => setErase(false)}
      >
        <IconBrushOff
          size={18}
          color="white"
          opacity="70%"
          style={{ position: "absolute", top: 3, left: 3, zIndex: 0 }}
        />
        <IconEraser
          size={27}
          style={{ position: "absolute", bottom: 3, right: 3, zIndex: 1 }}
        />
      </ActionIcon>
    );
  } else {
    modeTooltipLabel = "Erase mode";
    eraseMode = (
      <ActionIcon
        pos="relative"
        size="xl"
        radius={0}
        onClick={() => setErase(true)}
      >
        <IconEraserOff
          size={18}
          color="white"
          opacity="70%"
          style={{ position: "absolute", top: 3, left: 3, zIndex: 0 }}
        />
        <IconBrush
          size={27}
          style={{ position: "absolute", bottom: 3, right: 3, zIndex: 1 }}
        />
      </ActionIcon>
    );
  }

  return (
    <>
      <style>{`
            .sliders .mantine-ColorPicker-sliderOverlay {
                border-radius: 0;
            }
        `}</style>
      <ColorPicker
        fullWidth
        format="rgba"
        value={color}
        onChange={setColor}
        mb={6}
        swatchesPerRow={7}
        classNames={{
          sliders: "sliders",
        }}
        styles={{
          saturation: { height: 150 },
          saturationOverlay: { borderRadius: 0 },
          preview: { "--mantine-radius-sm": "0px" },
        }}
      />
      <NumberInput
        suffix="%"
        min={0}
        max={100}
        clampBehavior="strict"
        defaultValue={100}
        value={Math.round(a * 100)}
        radius={0}
      />
      <Group>
        <Tooltip label={modeTooltipLabel}>{eraseMode}</Tooltip>
      </Group>
    </>
  );
}
