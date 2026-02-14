import { useRef, useEffect } from 'react';
import { AppShell, Text, Grid, Button, Group, AppShellHeader, Container } from '@mantine/core';
import * as pixi from 'pixi.js'
import DrawManager from '../utils/DrawManager';

export const RoomPage = () => {
  const drawerRef = useRef<DrawManager | null>(null);
  const pixiContainer = useRef<HTMLDivElement>(null);
  const appRef = useRef<pixi.Application | null>(null);

  useEffect(() => {
    if (!pixiContainer.current || appRef.current) return;

    const width = pixiContainer.current!.clientWidth;
    const height = pixiContainer.current!.clientHeight;

        const initPixi = async () => {
            const app = new pixi.Application();
            appRef.current = app;

            await app.init({
                width: width,
                height: height,
                background: '#636363',
                resizeTo: pixiContainer.current!
            });

            pixiContainer.current!.appendChild(app.canvas);
            drawerRef.current = new DrawManager(app);
            drawerRef.current.init();
        };

        initPixi();
}, []);


  const handleUndo = () => {
    drawerRef.current?.undo();
  };

  const handleRedo = () => {
    drawerRef.current?.redo();
  };

  return (
      <Container size='100%' style={{padding: '60px'}}>
          <Group justify='center'>
            <Group h='80vh' w='80vw' ref={pixiContainer}></Group>
            </Group>
            <Group justify='center'>
              <Button variant='filled' onClick={handleUndo}>Undo</Button>
              <Button variant='filled' onClick={handleRedo}>Redo</Button>
            </Group>   
      </Container>
  );
};