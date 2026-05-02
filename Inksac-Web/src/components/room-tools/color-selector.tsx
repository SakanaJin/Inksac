import { Box, ColorInput, ColorPicker, NumberInput } from "@mantine/core";
import { useRoomLayout } from "../layout/room-layout";
import { useEffect, useRef, useState } from "react";

export function ColorSelector() {
  const { color, setColor } = useRoomLayout();
  const [r,g,b,a = 1] = color.match(/[\d.]+/g)!.map(Number);
  const [localHex, setLocalHex] = useState(
    `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`.toUpperCase()
  );
  const hexInputFocus = useRef(false);

  useEffect(() => {
    if (!hexInputFocus.current) {
      setLocalHex(
        `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`.toUpperCase()
      )
    }
  }, [r, g, b]);

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

        .sliders .mantine-ColorPicker-sliderOverlay {
          border-radius: 0;
        }

        .preview {

        }
      `}</style>

      <Box>
        <ColorPicker
          fullWidth
          format="rgba"
          value={color}
          onChange={setColor}
          mb={6}
          swatchesPerRow={7}
          pos={"relative"}
          classNames={{
            sliders: "sliders",
            preview: "preview",
            body: "body",
          }}
          styles={{
            saturation: { height: 150 },
            saturationOverlay: { borderRadius: 0 },
            preview: { "--mantine-radius-sm": "0px" },
            body: {paddingRight: 71},
          }}
        />
        <Box 
          style={{
            position: "absolute",
            top: 184,
            right: 8
          }}
        >
          <ColorInput
            format="hex"
            value={localHex}
            onFocus={() => { hexInputFocus.current = true;}}
            onBlur={() => {
              hexInputFocus.current = false;
              setLocalHex(
                `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`.toUpperCase()
              );
            }}
            radius={0}
            size="18.3"
            withPicker={false}
            leftSectionWidth={6}
            styles={{
              section: { display: "none" },
              input: {
                fontSize: "80%"
              }
            }}
            style={{
              width: 65,
              marginBottom: 6,
            }}
            onChange={(val) => {
              setLocalHex(val);
              const hex = val.replace('#', '');
              if (hex.length !== 6) return;

              const newR = parseInt(hex.slice(0,2), 16);
              const newG = parseInt(hex.slice(2,4), 16);
              const newB = parseInt(hex.slice(4,6), 16);
              setColor(`rgba(${newR}, ${newG}, ${newB}, ${a})`);
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
            size="18.3"
            className="mantine-focus-never"
            styles={{
              input: { 
                fontSize: "80%"
              }
            }}
            style={{
              width: 65
            }}
            onChange={(val) => {
              const newAlpha = (Number(val) / 100).toFixed(2);
              setColor(`rgba(${r}, ${g}, ${b}, ${newAlpha})`);
            }}
          />
        </Box>
      </Box>
    </>
  );
}