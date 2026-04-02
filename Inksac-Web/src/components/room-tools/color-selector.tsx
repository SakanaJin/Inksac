import { Button, ColorPicker, Group } from '@mantine/core';
import { useRoomLayout } from '../layout/room-layout';

export function ColorSelector() {
    const { color, setColor, setErase } = useRoomLayout();
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
                <Button onClick={() => setErase(false)}>Brush</Button>
                <Button onClick={() => setErase(true)}>Erase</Button>
            </Group>

        </>
    );
}