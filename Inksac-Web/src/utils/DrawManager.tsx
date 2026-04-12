import * as pixi from "pixi.js";
import {
  WSType,
  type BrushCoord,
  type WSMessage,
  type StrokeData,
  type StrokeGetDto,
  type BrushGetDto,
  type ClientLayerDto,
} from "../constants/types";
import type { WSManager } from "../config/websocket-manager";
import { Stroke, type stringornumber } from "./Stroke";
import api from "../config/axios";
import { EnvVars } from "../config/env-vars";

const baseurl = EnvVars.mediaBaseUrl;

class DrawManager {
  private app: pixi.Application;
  private undoStack: Stroke[];
  private redoStack: Stroke[];
  private lastPosition: pixi.Point;

  private canvasWidth: number;
  private canvasHeight: number;
  private canvasColor: string;

  private baseLayer: pixi.RenderTexture;
  private baseSprite: pixi.Sprite;
  private drawingContainer: pixi.Container;
  private boardContentContainer: pixi.Container;
  private worldContainer: pixi.Container;
  private boardBackground: pixi.Graphics;
  private boardMask: pixi.Graphics;

  private layersContainer: pixi.Container;
  private layerContainers: Map<number, pixi.Container>;
  private layers: ClientLayerDto[] = [];
  private activeLayerId: number | null = null;
  private currentStrokeLayerId: number | null = null;

  private currentStroke: pixi.Container | null = null;
  private erasePreviewTexture: pixi.RenderTexture | null = null;
  private erasePreviewSprite: pixi.Sprite | null = null;
  private isDrawing = false;
  private strokePoints: BrushCoord[] = [];

  private brushTexture: pixi.Texture | null = null;
  private activeBrush: BrushGetDto | null = null;
  private activeColor: string = "#ffffffff";
  private activeOpacity: number = 1;
  private activeErase: boolean = false;
  private strokeScale: number = 16;

  private ws: WSManager | null = null;

  private strokesMap: Map<stringornumber, Stroke>;
  private tempStrokes: Map<string, Stroke>;
  private onStroke: ((brushId: number) => void) | null = null;

  constructor(
    pixiApp: pixi.Application,
    wsManager: WSManager,
    canvasWidth: number,
    canvasHeight: number,
    canvasColor: string,
    maxUndoSteps: number = 10,
  ) {
    this.app = pixiApp;
    this.undoStack = [];
    this.redoStack = [];
    this.lastPosition = new pixi.Point();

    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.canvasColor = canvasColor;

    this.baseLayer = pixi.RenderTexture.create({
      width: this.canvasWidth,
      height: this.canvasHeight,
    });
    this.baseSprite = new pixi.Sprite(this.baseLayer);
    this.baseSprite.position.set(0, 0);

    this.drawingContainer = new pixi.Container();
    this.boardContentContainer = new pixi.Container();
    this.drawingContainer.filters = [new pixi.AlphaFilter()];
    this.worldContainer = new pixi.Container();

    this.layersContainer = new pixi.Container();
    this.layerContainers = new Map<number, pixi.Container>();

    this.boardBackground = new pixi.Graphics();
    this.boardBackground
      .rect(0, 0, this.canvasWidth, this.canvasHeight)
      .fill(this.canvasColor)
      .stroke({ color: "#8a8a8a", width: 2 });

    this.boardMask = new pixi.Graphics();
    this.boardMask
      .rect(0, 0, this.canvasWidth, this.canvasHeight)
      .fill("#ffffff");

    this.boardContentContainer.addChild(this.baseSprite);
    this.boardContentContainer.addChild(this.layersContainer);
    this.boardContentContainer.mask = this.boardMask;

    this.worldContainer.addChild(this.boardBackground);
    this.worldContainer.addChild(this.boardMask);
    this.worldContainer.addChild(this.boardContentContainer);

    this.worldContainer.position.set(
      (this.app.screen.width - this.canvasWidth) / 2,
      (this.app.screen.height - this.canvasHeight) / 2,
    );

    this.app.stage.addChild(this.worldContainer);
    this.initMouseEvents();

    this.ws = wsManager;

    this.strokesMap = new Map<number, Stroke>();
    this.tempStrokes = new Map<string, Stroke>();
  }

  async init() {
    const response = await api.get<BrushGetDto>("/brushes/1");
    this.setActiveBrush(response.data.data);
  }

  public async setActiveBrush(brush: BrushGetDto) {
    // pixijs automatically caches textures by url
    this.activeBrush = brush;
    this.brushTexture = await pixi.Assets.load<pixi.Texture>(
      baseurl + this.activeBrush.imgurl,
    );
  }

  public async loadBaseImage(imgurl: string) {
    const texture = await pixi.Assets.load<pixi.Texture>(baseurl + imgurl);

    const sprite = new pixi.Sprite(texture);
    sprite.position.set(0, 0);
    sprite.width = this.canvasWidth;
    sprite.height = this.canvasHeight;

    this.app.renderer.render({
      container: sprite,
      target: this.baseLayer,
      clear: true,
    });

    sprite.destroy();
  }

  public setLayers(layers: ClientLayerDto[]) {
    const sortedLayers = [...layers].sort((a, b) => a.position - b.position);
    const nextLayerContainers = new Map<number, pixi.Container>();

    this.layers = sortedLayers;
    this.layersContainer.removeChildren();

    for (const layer of sortedLayers) {
      const existingContainer = this.layerContainers.get(layer.id);
      const container = existingContainer ?? new pixi.Container();

      if (!existingContainer) {
        container.filters = [new pixi.AlphaFilter()];
      }

      container.visible = layer.visible;

      const alphaFilter = container.filters?.[0] as
        | pixi.AlphaFilter
        | undefined;

      if (alphaFilter) {
        alphaFilter.alpha = layer.opacity ?? 1;
      }

      nextLayerContainers.set(layer.id, container);
      this.layersContainer.addChild(container);
    }

    this.layerContainers = nextLayerContainers;

    if (
      this.activeLayerId !== null &&
      !sortedLayers.some((layer) => layer.id === this.activeLayerId)
    ) {
      this.activeLayerId = sortedLayers[0]?.id ?? null;
    }

    if (this.activeLayerId === null && sortedLayers.length > 0) {
      this.activeLayerId = sortedLayers[0].id;
    }
  }

  public setActiveLayer(layerId: number | null) {
    this.activeLayerId = layerId;
  }

  public setLayerVisibility(layerId: number, visible: boolean) {
    const layer = this.layers.find((item) => item.id === layerId);
    if (layer) {
      layer.visible = visible;
    }

    const container = this.layerContainers.get(layerId);
    if (container) {
      container.visible = visible;
    }
  }

  public setColor(color: string) {
    this.activeColor = color;
    const alpha = color.slice(-2);
    this.activeOpacity = parseInt(alpha, 16) / 255;
  }

  public setStrokeScale(strokeScale: number) {
    this.strokeScale =
      strokeScale <= 512 && strokeScale >= 1 ? strokeScale : 16;
  }

  public getWorldContainer() {
    return this.worldContainer;
  }

  public getCanvasSize() {
    return {
      width: this.canvasWidth,
      height: this.canvasHeight,
    };
  }

  public canUndo() {
    return this.undoStack.length > 0;
  }

  public canRedo() {
    return this.redoStack.length > 0;
  }

  private isInsideBoard(x: number, y: number) {
    return x >= 0 && x <= this.canvasWidth && y >= 0 && y <= this.canvasHeight;
  }

  public setOnStroke(fn: (brushId: number) => void) {
    this.onStroke = fn;
  }

  public setErase(eraser: boolean) {
    this.activeErase = eraser;
  }

  public async exportCanvas(options: {
    format: "png" | "jpg";
    transparentBackground?: boolean;
    scale?: number;
  }) {
    const { format, transparentBackground = false, scale = 1 } = options;

    const previousBackgroundVisible = this.boardBackground.visible;

    if (format === "png" && transparentBackground) {
      this.boardBackground.visible = false;
    }

    const exportTexture = this.app.renderer.generateTexture({
      target: this.worldContainer,
      frame: new pixi.Rectangle(0, 0, this.canvasWidth, this.canvasHeight),
      resolution: scale,
    });

    try {
      const extension = format === "jpg" ? "jpg" : "png";

      const dataUrl = await this.app.renderer.extract.base64({
        target: exportTexture,
        format: format === "jpg" ? "jpg" : "png",
        quality: 1,
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `canvas-export-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      exportTexture.destroy(true);
      this.boardBackground.visible = previousBackgroundVisible;
    }
  }

  // UNDO/REDO HANDLING ------------------------------------------------------------------------------------
  // private flattenOldestUndo() {
  //   const oldest = this.undoStack.shift();
  //   if (!oldest) return;

  //   const tempContainer = new pixi.Container();
  //   tempContainer.addChild(this.baseSprite);
  //   tempContainer.addChild(oldest);

  //   const newBaseLayer = pixi.RenderTexture.create({
  //     width: this.app.screen.width,
  //     height: this.app.screen.height,
  //   });

  //   this.app.renderer.render({
  //     container: tempContainer,
  //     target: newBaseLayer,
  //   });

  //   tempContainer.removeChildren();

  //   this.baseLayer.destroy();
  //   this.baseLayer = newBaseLayer;
  //   this.baseSprite.texture = newBaseLayer;

  //   this.drawingContainer.addChildAt(this.baseSprite, 0);

  //   this.drawingContainer.removeChild(oldest);
  //   oldest.destroy();
  // }

  public undo() {
    if (this.undoStack.length === 0) return;

    const stroke = this.undoStack.pop()!;
    this.redoStack.push(stroke);

    const layerContainer = this.layerContainers.get(stroke.layerId);
    if (layerContainer) {
      layerContainer.removeChild(stroke);
    }

    this.strokesMap.delete(stroke.id);

    const message: WSMessage = { Mtype: WSType.UNDO, data: stroke.id };
    this.ws.send(message);
  }

  public redo() {
    if (this.redoStack.length === 0) return;

    const stroke = this.redoStack.pop()!;
    this.undoStack.push(stroke);

    const layerContainer = this.layerContainers.get(stroke.layerId);
    if (layerContainer) {
      layerContainer.addChild(stroke);
      (layerContainer.children as Stroke[]).sort(
        (a, b) => (a.id as number) - (b.id as number),
      );
    }

    this.strokesMap.set(stroke.id, stroke);

    const message: WSMessage = { Mtype: WSType.REDO, data: stroke.id };
    this.ws.send(message);
  }

  // POINTER EVENTS ----------------------------------------------------------------------------------------
  private initMouseEvents() {
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on("pointerdown", (event) => this.onMouseDown(event));
    this.app.stage.on("pointermove", (event) => this.onMouseMove(event));
    this.app.stage.on("pointerup", () => this.onMouseUp());
    this.app.stage.on("pointerupoutside", () => this.onMouseUp());
    this.app.stage.on("pointerleave", () => this.onMouseUp());
    this.app.stage.on("rightdown", () => this.onMouseUp());
  }

  private onMouseDown(event: pixi.FederatedPointerEvent) {
    if (event.button !== 0) return;
    if (this.activeBrush == null) return;
    if (this.activeLayerId === null) return;

    const activeLayer = this.layers.find(
      (layer) => layer.id === this.activeLayerId,
    );
    if (!activeLayer) return;
    if (!activeLayer.visible) return;
    if (activeLayer.locked) return;

    const localPosition = this.worldContainer.toLocal(event.global);

    if (!this.isInsideBoard(localPosition.x, localPosition.y)) return;

    const layerContainer = this.layerContainers.get(this.activeLayerId);
    if (!layerContainer) return;

    this.isDrawing = true;
    this.lastPosition.set(localPosition.x, localPosition.y);
    this.strokePoints = [];
    this.currentStrokeLayerId = this.activeLayerId;

    this.currentStroke = new pixi.Container();

    if (this.activeErase) {
      this.erasePreviewTexture = pixi.RenderTexture.create({
        width: this.canvasWidth,
        height: this.canvasHeight,
      });
      this.erasePreviewSprite = new pixi.Sprite(this.erasePreviewTexture);
      this.erasePreviewSprite. blendMode = "erase";
      layerContainer.addChild(this.erasePreviewSprite);
    }
    else {
      layerContainer.addChild(this.currentStroke);  
    }
  }

  // this is what actually "draws" the brush stroke
  private onMouseMove(event: pixi.FederatedPointerEvent) {
    if (
      this.isDrawing == false ||
      this.currentStroke == null ||
      this.brushTexture == null ||
      this.activeBrush == null
    )
      return;

    const currPosition = this.worldContainer.toLocal(event.global);
    const dx = currPosition.x - this.lastPosition.x;
    const dy = currPosition.y - this.lastPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const gap = 1;
    const numStamps = Math.max(1, Math.ceil(distance / gap));

    for (let i = 0; i <= numStamps; i++) {
      const t = i / numStamps;
      const x = this.lastPosition.x + dx * t;
      const y = this.lastPosition.y + dy * t;

      if (!this.isInsideBoard(x, y)) continue;

      this.strokePoints.push({ x, y });

      const brushSprite = new pixi.Sprite(this.brushTexture);
      brushSprite.anchor.set(0.5);
      brushSprite.tint = this.activeColor;
      brushSprite.setSize(this.strokeScale);
      brushSprite.position.set(x, y);
      this.currentStroke.addChild(brushSprite);
    }

    if (this.activeErase && this.erasePreviewTexture && this.erasePreviewSprite) {
      this.currentStroke.filters = [new pixi.AlphaFilter({ alpha: this.activeOpacity })];
      this.app.renderer.render({
        container: this.currentStroke,
        target: this.erasePreviewTexture,
        clear: true,
      });
      this.currentStroke.filters = [];
    }
    else {
      this.currentStroke.filters = [new pixi.AlphaFilter({alpha: this.activeOpacity})];
    }
    
    this.lastPosition.set(currPosition.x, currPosition.y);
  }

  private onMouseUp() {
    if (
      this.isDrawing == false ||
      this.currentStroke == null ||
      this.currentStrokeLayerId === null
    )
      return;

    if (this.currentStroke.children.length === 0) {
      this.isDrawing = false;
      this.currentStroke.destroy({ children: true });
      this.currentStroke = null;
      this.currentStrokeLayerId = null;

      if (this.erasePreviewSprite) {
        this.erasePreviewSprite.destroy();
        this.erasePreviewSprite = null;
      }
      if (this.erasePreviewTexture) {
        this.erasePreviewTexture.destroy(true);
        this.erasePreviewTexture = null;
      }
      return;
    }

    this.isDrawing = false;
    const tempid = crypto.randomUUID();

    if (this.erasePreviewSprite) {
      this.erasePreviewSprite.parent?.removeChild(this.erasePreviewSprite);
      this.erasePreviewSprite.destroy();
      this.erasePreviewSprite = null;
    }
    if (this.erasePreviewTexture) {
      this.erasePreviewTexture.destroy(true);
      this.erasePreviewTexture = null;
    }

    if (this.activeErase) {
      this.currentStroke.filters = [new pixi.AlphaFilter({ alpha: this.activeOpacity })];
    }

    const bounds = this.currentStroke.getLocalBounds();
    const frame = new pixi.Rectangle(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );

    const combinedTexture = this.app.renderer.generateTexture({
      target: this.currentStroke,
      frame,
    });
    const combinedSprite = new pixi.Sprite(combinedTexture);
    combinedSprite.position.set(frame.x, frame.y);
    if (this.activeErase) combinedSprite.blendMode = "erase";

    const combinedSpriteContainer = new Stroke(
      tempid,
      this.currentStrokeLayerId,
    );
    combinedSpriteContainer.addChild(combinedSprite);

    const layerContainer = this.layerContainers.get(this.currentStrokeLayerId);
    if (!layerContainer) {
      this.currentStroke.destroy({ children: true });
      this.currentStroke = null;
      this.currentStrokeLayerId = null;
      return;
    }

    layerContainer.addChild(combinedSpriteContainer);

    this.currentStroke.destroy({ children: true });
    this.currentStroke = null;

    this.undoStack.push(combinedSpriteContainer);
    this.redoStack = [];
    this.tempStrokes.set(tempid, combinedSpriteContainer);

    const strokeData: StrokeData = {
      tempid: tempid,
      points: this.strokePoints,
      color: this.activeColor,
      opacity: this.activeOpacity,
      iseraser: this.activeErase,
      scale: this.strokeScale,
      brushid: this.activeBrush?.id ?? 1,
      layerid: this.currentStrokeLayerId,
    };

    const message: WSMessage = { Mtype: WSType.STROKE, data: strokeData };
    this.onStroke?.(this.activeBrush?.id ?? 1);
    this.ws.send(message);

    this.currentStrokeLayerId = null;
  }

  // RECEIVING STROKE FUNCTIONS ----------------------------------------------------------------------------
  // this is basically just onMouseMove and onMouseUp combined, draws based on the stroke data sent from the original drawer
  private async renderReceivedStroke(strokeData: StrokeGetDto) {
    const layerContainer = this.layerContainers.get(strokeData.layer_id);
    if (!layerContainer) return;

    const receivedBrushTexture = await pixi.Assets.load<pixi.Texture>(
      baseurl + strokeData.brush.imgurl,
    );
    if (!receivedBrushTexture) return;

    const receivedStroke = new pixi.Container();
    for (const point of strokeData.points) {
      const brushSprite = new pixi.Sprite(receivedBrushTexture);

      brushSprite.anchor.set(0.5);
      brushSprite.tint = strokeData.color;
      brushSprite.setSize(strokeData.scale);
      brushSprite.position.set(point.x, point.y);
      brushSprite.alpha = strokeData.opacity;
      receivedStroke.addChild(brushSprite);
    }
    if (strokeData.iseraser) receivedStroke.blendMode = "erase";

    const bounds = receivedStroke.getLocalBounds();
    const frame = new pixi.Rectangle(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );

    const combinedTexture = this.app.renderer.generateTexture({
      target: receivedStroke,
      frame,
    });
    const combinedSprite = new pixi.Sprite(combinedTexture);
    combinedSprite.position.set(frame.x, frame.y);
    if (strokeData.iseraser) combinedSprite.blendMode = "erase";

    const combinedSpriteContainer = new Stroke(
      strokeData.id,
      strokeData.layer_id,
    );
    combinedSpriteContainer.addChild(combinedSprite);
    this.strokesMap.set(strokeData.id, combinedSpriteContainer);

    receivedStroke.destroy({ children: true });

    layerContainer.addChild(combinedSpriteContainer);
  }

  public async receiveStroke(strokeData: StrokeGetDto) {
    if (strokeData.tempid && this.tempStrokes.has(strokeData.tempid)) {
      const stroke = this.tempStrokes.get(strokeData.tempid)!;
      this.tempStrokes.delete(strokeData.tempid);
      stroke.id = strokeData.id;
      this.strokesMap.set(strokeData.id, stroke);
      return;
    }
    if (this.strokesMap.has(strokeData.id)) return;
    await this.renderReceivedStroke(strokeData);
  }

  public async undoStroke(id: number) {
    if (!this.strokesMap.has(id)) return;
    const stroke = this.strokesMap.get(id)!;

    const layerContainer = this.layerContainers.get(stroke.layerId);
    if (layerContainer) {
      layerContainer.removeChild(stroke);
    }

    stroke.destroy();
    this.strokesMap.delete(id);
  }

  public async redoStroke(strokeData: StrokeGetDto) {
    if (this.strokesMap.has(strokeData.id)) return;
    await this.renderReceivedStroke(strokeData);

    const layerContainer = this.layerContainers.get(strokeData.layer_id);
    if (layerContainer) {
      (layerContainer.children as Stroke[]).sort(
        (a, b) => (a.id as number) - (b.id as number),
      );
    }
  }

  public async receiveInit(
    layers: ClientLayerDto[],
    strokeDatalist: StrokeGetDto[],
  ) {
    this.setLayers(layers);
    if (strokeDatalist.length === 0) return;
    for (const strokeData of strokeDatalist) {
      await this.renderReceivedStroke(strokeData);
    }
  }
}

export default DrawManager;

/*
  I think the flatten oldest undo is causing the order of the strokes to mess up.
  Point thinning is a MUST!!!!!

  fix right mouse click disrupting stroke and not pushing stroke to undo stack

  probably a better way to load the brushtexture for a stroke in renderReceivedStroke, i'll do it later

  the lines that say "change to selected color / opacity" that's going to eventually be the color / opacity from the color picker.
  there's also an issue right now where since it's layering so many sprites over top each other the opacity is only noticeable at really low values.
*/
