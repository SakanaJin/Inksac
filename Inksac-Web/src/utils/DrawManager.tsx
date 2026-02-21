import * as pixi from "pixi.js";
import softShape from "../../../media/user/brush/softShape.png";
import {
  WSType,
  type BrushCoord,
  type WSMessage,
  type StrokeData,
} from "../constants/types";
import type { WSManager } from "../config/websocket-manager";
import { Stroke } from "./Stroke";

class DrawManager {
  private app: pixi.Application;
  private undoStack: pixi.Container[];
  private redoStack: pixi.Container[];
  private maxUndoSteps: number;
  private lastPosition: pixi.Point;

  private baseLayer: pixi.Texture;
  private baseSprite: pixi.Sprite;
  private drawingContainer: pixi.Container;

  private currentStroke: pixi.Container | null = null;
  private isDrawing = false;
  private strokePoints: BrushCoord[] = [];

  private brushShape: pixi.Texture | null = null;

  private ws: WSManager | null = null;

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
  }

  async init() {
    this.brushShape = await pixi.Assets.load(softShape);
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
  }

  public redo() {
    if (this.redoStack.length === 0) return;

    const stroke = this.redoStack.pop()!;
    this.undoStack.push(stroke);
    this.drawingContainer.addChild(stroke);
  }

  // POINTER EVENTS
  private initMouseEvents() {
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on("pointerdown", (event) => this.onMouseDown(event));
    this.app.stage.on("pointermove", (event) => this.onMouseMove(event));
    this.app.stage.on("pointerup", () => this.onMouseUp());
    this.app.stage.on("pointerleave", () => this.onMouseUp());
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
      this.brushShape == null
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

      const brushSprite = new pixi.Sprite(this.brushShape);
      brushSprite.anchor.set(0.5);
      brushSprite.tint = `rgb(24, 20, 36)`;
      brushSprite.scale.set(0.05);
      brushSprite.position.set(x, y);

      this.currentStroke.addChild(brushSprite);
    }

    this.lastPosition.set(currPosition.x, currPosition.y);
  }

  private onMouseUp() {
    if (this.isDrawing == false || this.currentStroke == null) return;

    this.isDrawing = false;

    const bounds = this.currentStroke.getBounds();
    const combinedTexture = this.app.renderer.generateTexture(
      this.currentStroke,
    );
    const combinedSprite = new pixi.Sprite(combinedTexture);
    combinedSprite.position.set(bounds.x, bounds.y);

    const combinedSpriteContainer = new pixi.Container();
    combinedSpriteContainer.addChild(combinedSprite);
    this.drawingContainer.addChild(combinedSpriteContainer);

    this.currentStroke.destroy({ children: true });
    this.currentStroke = null;

    this.redoStack = [];
    this.undoStack.push(combinedSpriteContainer);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.flattenOldestUndo();
    }

    const strokeData: StrokeData = {
      points: this.strokePoints,
      color: "rgb(81, 46, 146)",
      scale: 0.05,
      opacity: 1,
    };

    const message: WSMessage = { Mtype: WSType.STROKE, data: strokeData };
    this.ws.send(message);
  }

  // RECEIVING STROKE FUNCTIONS
  // this is basically just onMouseMove and onMouseUp combined, draws based on the stroke data sent from the original drawer, redo/undo kinda busted for multiple people rn
  public async renderReceivedStroke(strokeData: StrokeData) {
    if (this.brushShape == null) return;

    const receivedStroke = new pixi.Container();

    for (const point of strokeData.points) {
      const brushSprite = new pixi.Sprite(this.brushShape);

      brushSprite.anchor.set(0.5);
      brushSprite.tint = strokeData.color;
      brushSprite.scale.set(strokeData.scale);
      brushSprite.position.set(point.x, point.y);
      receivedStroke.addChild(brushSprite);
    }

    const bounds = receivedStroke.getBounds();
    const combinedTexture = this.app.renderer.generateTexture(receivedStroke);
    const combinedSprite = new pixi.Sprite(combinedTexture);
    combinedSprite.position.set(bounds.x, bounds.y);

    // const combinedSpriteContainer = new pixi.Container();
    // combinedSpriteContainer.addChild(combinedSprite);
    const combinedSpriteContainer = new Stroke(crypto.randomUUID());
    combinedSpriteContainer.addChild(combinedSprite);

    receivedStroke.destroy({ children: true });

    this.drawingContainer.addChild(combinedSpriteContainer);
    this.undoStack.push(combinedSpriteContainer);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.flattenOldestUndo();
    }
  }
}

export default DrawManager;

/*
we can hold strokes and temp strokes in maps 
strokesmap = new Map<number, PIXI.Graphics>()
tempStrokesmap = new Map<string, PIXI.Graphics>() string will likely be uuid4

[UNDO]
-> send stroke to redo stack
-> ws sends undo to backend
{
id
}
-> backend deletes stroke
-> backend sends undo to all clients except sender
-> client searches map for stroke
stroke = strokesmap.get(id)
-> client removes stroke from draw container by ref
this.drawingContainer.remove(stroke)
-> client destroys stroke
stroke.destroy
strokesmap.delete(id)

[REDO]
-> send stroke to undo stack
-> ws sends redo to the backend
full stroke data dto
-> backend creates stroke
-> backend sends redo with stroke to all clients except sender
-> client finds correct index by id
index = this.drawingContainer.findIndex(child => child.id > stroke.id)
strokesmap.set(id, stroke) stroke here should be the actual object not the data from the ws
-> client inserts stroke at index
if(index === -1) this.drawingContainer.addChild(stroke)
else this.drawingContainer.addChildAt(stroke, index)

[MOUSEUP]
-> mouse up creates temporary stroke
-> ws sends stroke to the backend
-> backend creates stroke
-> backend sends stroke to ALL clients
-> creator replaces temp stroke with one from backend (for the generated id we're sorting by)
this doesnt even need to touch the draw container its just swapping where the ref is in the maps
stroke = tempStrokes.get(tempid)
tempStrokes.delete(tempid)
strokesmap.set(id, stroke)
-> other clients add stroke to map and container
strokesmap.set(id, stroke)
this.drawingContainer.addChild(stroke) //this might need to sort but maybe not we'll see
the recieve stroke can be one function becuase of strokesmap.has(id) 

The maps arent going to eat up that much memory since they're only storing *pointers* to the
stroke objects, but they're going to be faster than searching the children array since
it's a hashmap. Thank God it's simpler than I thought. I will probably start doing this tommorrow 2/21/26.
*/
