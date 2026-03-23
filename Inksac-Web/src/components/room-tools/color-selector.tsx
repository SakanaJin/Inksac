import { ColorPicker } from '@mantine/core';

export function ColorSelector() {
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
                classNames={{
                    sliders: 'sliders',
                }}
                styles={{
                    saturation: {height: 150},
                    saturationOverlay: {borderRadius: 0},
                    preview: {'--mantine-radius-sm': '0px'},
                }}
            />
        </>
    )
}