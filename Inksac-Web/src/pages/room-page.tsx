import { useRef, useEffect } from 'react';
import { AppShell, Text, Grid, Button, Group } from '@mantine/core';
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
    <AppShell>
      <AppShell.Main>
         <Grid style={{overflow: 'hidden', textAlign: 'center'}}>
          <Grid.Col span={12} h='5vh'>1</Grid.Col>
          <Grid.Col span={1}>2</Grid.Col>
          <Grid.Col span={10} h='85vh'><div ref={pixiContainer} style={{width: '100%', height: '100%'}} /></Grid.Col>
          <Grid.Col span={1}>4</Grid.Col>
          <Grid.Col span={12} h='8vh'>
            <Group justify='center'>
              <Button variant='filled' onClick={handleUndo}>Undo</Button>
              <Button variant='filled' onClick={handleRedo}>Redo</Button>
            </Group>
          </Grid.Col>          
         </Grid>
      </AppShell.Main>
    </AppShell>
  );
};