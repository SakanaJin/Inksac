import * as pixi from "pixi.js";
//import softShape from "../../../media/user/brush/softShape.png";
import {
  WSType,
  type BrushCoord,
  type WSMessage,
  type StrokeData,
  type StrokeGetDto,
  type BrushGetDto
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
  private maxUndoSteps: number;
  private lastPosition: pixi.Point;

  private baseLayer: pixi.Texture;
  private baseSprite: pixi.Sprite;
  private drawingContainer: pixi.Container;

  private currentStroke: pixi.Container | null = null;
  private isDrawing = false;
  private strokePoints: BrushCoord[] = [];

  private brushTexture: pixi.Texture | null = null;
  private activeBrush: BrushGetDto | null = null;

  private ws: WSManager | null = null;

  private strokesMap: Map<stringornumber, Stroke>;
  private tempStrokes: Map<string, Stroke>;

  constructor(
    pixiApp: pixi.Application,
    wsManager: WSManager,
    maxUndoSteps: number = 10,
  ) {
    this.app = pixiApp;
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = maxUndoSteps;
    this.lastPosition = new pixi.Point();

    this.baseLayer = pixi.RenderTexture.create({
      width: this.app.screen.width,
      height: this.app.screen.height,
    });
    this.baseSprite = new pixi.Sprite(this.baseLayer);
    this.drawingContainer = new pixi.Container();

    this.app.stage.addChild(this.drawingContainer);
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
    this.brushTexture = await pixi.Assets.load<pixi.Texture>(baseurl + this.activeBrush.imgurl);
  }

  // UNDO/REDO HANDLING
  private flattenOldestUndo() {
    const oldest = this.undoStack.shift();
    if (!oldest) return;

    const tempContainer = new pixi.Container();
    tempContainer.addChild(this.baseSprite);
    tempContainer.addChild(oldest);

    const newBaseLayer = pixi.RenderTexture.create({
      width: this.app.screen.width,
      height: this.app.screen.height,
    });

    this.app.renderer.render({
      container: tempContainer,
      target: newBaseLayer,
    });

    tempContainer.removeChildren();

    this.baseLayer.destroy();
    this.baseLayer = newBaseLayer;
    this.baseSprite.texture = newBaseLayer;

    this.drawingContainer.addChildAt(this.baseSprite, 0);

    this.drawingContainer.removeChild(oldest);
    oldest.destroy();
  }

  public undo() {
    if (this.undoStack.length === 0) return;

    const stroke = this.undoStack.pop()!;
    this.redoStack.push(stroke);
    this.drawingContainer.removeChild(stroke);
    this.strokesMap.delete(stroke.id);

    const message: WSMessage = { Mtype: WSType.UNDO, data: stroke.id };
    this.ws.send(message);
  }

  public redo() {
    if (this.redoStack.length === 0) return;

    const stroke = this.redoStack.pop()!;
    this.undoStack.push(stroke);
    this.drawingContainer.addChild(stroke);
    this.strokesMap.set(stroke.id, stroke);
    (this.drawingContainer.children as Stroke[]).sort(
      (a, b) => (a.id as number) - (b.id as number),
    );

    const message: WSMessage = { Mtype: WSType.REDO, data: stroke.id };
    this.ws.send(message);
  }

  // POINTER EVENTS
  private initMouseEvents() {
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on("pointerdown", (event) => this.onMouseDown(event));
    this.app.stage.on("pointermove", (event) => this.onMouseMove(event));
    this.app.stage.on("pointerup", () => this.onMouseUp());
    this.app.stage.on("pointerleave", () => this.onMouseUp());
    this.app.stage.on("rightdown", () => this.onMouseUp());

  }

  private onMouseDown(event: pixi.FederatedPointerEvent) {
    this.isDrawing = true;
    this.lastPosition.set(event.global.x, event.global.y);
    this.strokePoints = [];

    this.currentStroke = new pixi.Container();
    this.drawingContainer.addChild(this.currentStroke);
  }

  // this is what actually "draws" the brush stroke, prob make a brush class to handle width, opacity, shape, etc
  private onMouseMove(event: pixi.FederatedPointerEvent) {
    if (
      this.isDrawing == false ||
      this.currentStroke == null ||
      this.brushTexture == null
    )
      return;

    const currPosition = event.global;
    const dx = currPosition.x - this.lastPosition.x;
    const dy = currPosition.y - this.lastPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const gap = 1;
    const numStamps = Math.ceil(distance / gap);

    for (let i = 0; i <= numStamps; i++) {
      const t = i / numStamps;
      const x = this.lastPosition.x + dx * t;
      const y = this.lastPosition.y + dy * t;

      this.strokePoints.push({ x, y });

      const brushSprite = new pixi.Sprite(this.brushTexture);
      brushSprite.anchor.set(0.5);
      brushSprite.tint = `rgb(98, 25, 172)`;
      brushSprite.setSize(this.activeBrush.scale);
      brushSprite.position.set(x, y);

      this.currentStroke.addChild(brushSprite);
    }

    this.lastPosition.set(currPosition.x, currPosition.y);
  }

  private onMouseUp() {
    if (this.isDrawing == false || this.currentStroke == null) return;

    this.isDrawing = false;
    const tempid = crypto.randomUUID();

    const bounds = this.currentStroke.getBounds();
    const combinedTexture = this.app.renderer.generateTexture(
      this.currentStroke,
    );
    const combinedSprite = new pixi.Sprite(combinedTexture);
    combinedSprite.position.set(bounds.x, bounds.y);

    const combinedSpriteContainer = new Stroke(tempid);
    combinedSpriteContainer.addChild(combinedSprite);
    this.drawingContainer.addChild(combinedSpriteContainer);

    this.currentStroke.destroy({ children: true });
    this.currentStroke = null;

    this.redoStack = [];
    // this.undoStack.push(combinedSpriteContainer);
    // if (this.undoStack.length > this.maxUndoSteps) {
    //   this.flattenOldestUndo();
    // }

    this.tempStrokes.set(tempid, combinedSpriteContainer);

    const strokeData: StrokeData = {
      tempid: tempid,
      points: this.strokePoints,
      color: "rgb(120, 120, 187)",
      brushid: this.activeBrush?.id ?? 1,
    };

    const message: WSMessage = { Mtype: WSType.STROKE, data: strokeData };
    this.ws.send(message);
  }

  // RECEIVING STROKE FUNCTIONS
  // this is basically just onMouseMove and onMouseUp combined, draws based on the stroke data sent from the original drawer, redo/undo kinda busted for multiple people rn
  private async renderReceivedStroke(strokeData: StrokeGetDto) {
    const receivedBrushTexture = await pixi.Assets.load<pixi.Texture>(baseurl + strokeData.brush.imgurl);
    if (!receivedBrushTexture) return;

    const receivedStroke = new pixi.Container();
    for (const point of strokeData.points) {
      const brushSprite = new pixi.Sprite(receivedBrushTexture);

      brushSprite.anchor.set(0.5);
      brushSprite.tint = strokeData.color;
      brushSprite.setSize(strokeData.brush.scale);
      brushSprite.position.set(point.x, point.y);
      brushSprite.alpha = 1;
      receivedStroke.addChild(brushSprite);
    }

    const bounds = receivedStroke.getBounds();
    const combinedTexture = this.app.renderer.generateTexture(receivedStroke);
    const combinedSprite = new pixi.Sprite(combinedTexture);
    combinedSprite.position.set(bounds.x, bounds.y);

    const combinedSpriteContainer = new Stroke(strokeData.id);
    combinedSpriteContainer.addChild(combinedSprite);
    this.strokesMap.set(strokeData.id, combinedSpriteContainer);
    
    receivedStroke.destroy({ children: true });

    this.drawingContainer.addChild(combinedSpriteContainer);
    // return combinedSpriteContainer;
    // this.undoStack.push(combinedSpriteContainer);
    // if (this.undoStack.length > this.maxUndoSteps) {
    //   this.flattenOldestUndo();
    // }
  }

  public async receiveStroke(strokeData: StrokeGetDto) {
    if (this.tempStrokes.has(strokeData.tempid)) {
      const stroke = this.tempStrokes.get(strokeData.tempid);
      this.tempStrokes.delete(strokeData.tempid);
      stroke.id = strokeData.id;
      this.strokesMap.set(strokeData.id, stroke);
      this.undoStack.push(stroke);
      if (this.undoStack.length > this.maxUndoSteps) {
        //this.flattenOldestUndo();
      }
      return;
    }
    if (this.strokesMap.has(strokeData.id)) return;
    await this.renderReceivedStroke(strokeData);
  }

  public async undoStroke(id: number) {
    if (!this.strokesMap.has(id)) return;
    const stroke = this.strokesMap.get(id);
    this.drawingContainer.removeChild(stroke);
    stroke.destroy();
    this.strokesMap.delete(id);
  }

  public async redoStroke(strokeData: StrokeGetDto) {
    if (this.strokesMap.has(strokeData.id)) return;
    await this.renderReceivedStroke(strokeData);
    (this.drawingContainer.children as Stroke[]).sort(
      (a, b) => (a.id as number) - (b.id as number),
    );
  }

  public async receiveInit(strokeDatalist: StrokeGetDto[]) {
    if (strokeDatalist.length === 0) return;
    for (const strokeData of strokeDatalist) {
      await this.renderReceivedStroke(strokeData);
      // const stroke = this.renderReceivedStroke(strokeData);
      // this.strokesMap.set(stroke.id, stroke);
    }
  }
}

export default DrawManager;

/*
  I think the flatten oldest undo is causing the order of the strokes to mess up.
  Point thinning is a MUST!!!!!

  fix right mouse click disrupting stroke and not pushing stroke to undo stack
*/
