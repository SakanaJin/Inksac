import { ActionIcon, ColorPicker, Group, Tooltip } from '@mantine/core';
import { useRoomLayout } from '../layout/room-layout';
import {
  IconEraser,
  IconBrush,
  IconBrushOff,
  IconEraserOff,
} from "@tabler/icons-react";


export function ColorSelector() {
    const { color, setColor, setErase, erase } = useRoomLayout();

    let eraseMode;
    if (erase) {
        eraseMode = (
            <ActionIcon 
                pos="relative" 
                size='xl'
                radius={0}
                onClick={() => setErase(false)}
            >
                <IconBrushOff 
                    size={18}
                    color='white'
                    opacity='70%'
                    style={{ position: 'absolute', top: 3, left: 3, zIndex: 0}}
                />
                <IconEraser 
                    size={27}
                    style={{ position: 'absolute', bottom: 3, right: 3, zIndex: 1}}
                />
            </ActionIcon>
        );
    }
    else {
        eraseMode = (
            <ActionIcon 
                pos="relative" 
                size='xl'
                radius={0}
                onClick={() => setErase(true)}
            >
                <IconEraserOff 
                    size={18}
                    color='white'
                    opacity='70%'
                    style={{ position: 'absolute', top: 3, left: 3, zIndex: 0}}
                />
                <IconBrush 
                    size={27}
                    style={{ position: 'absolute', bottom: 3, right: 3, zIndex: 1}}
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
                format='hexa'
                value={color}
                onChange={setColor}
                mb={6}
                classNames={{
                    sliders: 'sliders',
                }}
                styles={{
                    saturation: {height: 150},
                    saturationOverlay: {borderRadius: 0},
                    preview: {'--mantine-radius-sm': '0px'},
                }}
            />
            <Group>
                <Tooltip label="Erase Mode">
                    {eraseMode}
                </Tooltip> 
            </Group>

        </>
    );
}