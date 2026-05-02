import { Box, ColorPicker } from "@mantine/core";
import { useRoomLayout } from "../layout/room-layout";

export function ColorSelector() {
  const { color, setColor } = useRoomLayout();

  return (
    <>
      <style>{`
        .responsive-color-picker {
          width: 100%;
          height: 100%;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .responsive-color-picker > div {
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .responsive-color-picker .mantine-ColorPicker-wrapper {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .responsive-color-picker .mantine-ColorPicker-saturation {
          flex: 1;
          min-height: 80px;
          height: auto !important;
        }

        .responsive-color-picker .mantine-ColorPicker-sliderOverlay {
          border-radius: 0;
        }
      `}</style>

      <Box
        className="responsive-color-picker"
        style={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <ColorPicker
          fullWidth
          format="hexa"
          value={color}
          onChange={setColor}
          styles={{
            saturationOverlay: {
              borderRadius: 0,
            },
            preview: {
              "--mantine-radius-sm": "0px",
            },
          }}
        />
      </Box>
    </>
  );
}
