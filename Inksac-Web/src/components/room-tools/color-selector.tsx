import { Box, ColorInput, ColorPicker, NumberInput, TextInput } from "@mantine/core";
import { useRoomLayout } from "../layout/room-layout";
import { useEffect, useRef, useState } from "react";


function toRgba(input: string): string {
  const hexMatch = input.trim().match(/^#?(?<hex>[0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    let h = hexMatch.groups!.hex;

    if (h.length === 3) {
      h = h.split("").map(c => c + c).join("");
    }

    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }
  return input;
}

export function ColorSelector() {
  const { color, setColor } = useRoomLayout();
  const normalizedColor = toRgba(color);
  const [r,g,b,a = 1] = normalizedColor.match(/[\d.]+/g)!.map(Number);
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
        
        .responsive-color-picker .mantine-ColorPicker-body {
          display: grid;
          grid-template-columns: 1fr 65px;
          grid-template-rows: auto auto;
          column-gap: 0px;
        }

        .responsive-color-picker .mantine-ColorPicker-saturation {
          flex: 1;
          min-height: 80px;
          height: auto !important;
        }
        
        .responsive-color-picker .mantine-ColorPicker-sliders {
          grid-column: 1;
          grid-row: 1;
        }

        .responsive-color-picker .mantine-ColorPicker-preview {
          grid-column: 2;
          grid-row: 1;
          margin-left: -3px;
        }

        .responsive-color-picker .mantine-ColorPicker-sliderOverlay {
          border-radius: 0;
        }

        .sliders .mantine-ColorPicker-sliderOverlay {
          border-radius: 0;
        }

        .responsive-color-picker .mantine-ColorPicker-swatch {
          --cp-swatch-size: 30px;
          grid-column: 1;
          grid-row: 2;
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
        <Box style={{ position: "relative" }}>
          <ColorPicker
            fullWidth
            format="rgba"
            value={normalizedColor}
            onChange={setColor}
            mb={5}
            //swatches={["#ffffff00", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff" ]}
            pos={"relative"}
            classNames={{
              sliders: "sliders",
              preview: "preview",
              body: "body",
              swatches: "swatches",
              swatch: "swatch"
            }}
            styles={{
              saturation: { height: 150 },
              saturationOverlay: { borderRadius: 0 },
              preview: { "--mantine-radius-sm": "0px" },
              body: {paddingRight: 43},
            }}
          />
          <Box 
            style={{
              position: "absolute",
              bottom: 6,
              right: 0
            }}
          >
            <TextInput
              value={localHex.replace("#", "")}
              leftSection="#"
              leftSectionWidth={13}
              onFocus={() => { hexInputFocus.current = true;}}
              onBlur={() => {
                hexInputFocus.current = false;
                setLocalHex(
                  `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`.toUpperCase()
                );
              }}
              radius={0}
              size="18"
              styles={{
                input: {
                  fontSize: "70%"
                }
              }}
              style={{
                width: 65,
                marginBottom: 6,
              }}
              onChange={(e) => {
                const val = e.currentTarget.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                setLocalHex("#" + val);
                if (val.length !== 6) return;

                const newR = parseInt(val.slice(0,2), 16);
                const newG = parseInt(val.slice(2,4), 16);
                const newB = parseInt(val.slice(4,6), 16);
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
      </Box>
    </>
  );
}