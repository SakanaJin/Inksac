import * as pixi from "pixi.js";
import softShape from "../../../media/user/brush/softShape.png";

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

  private brushShape: pixi.Texture | null = null;

  constructor(pixiApp: pixi.Application, maxUndoSteps: number = 10) {
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

      const brushSprite = new pixi.Sprite(this.brushShape);
      brushSprite.anchor.set(0.5);

      // color changes atm just to see how brush strokes layer on top of each other better
      // brush shape pngs are white atm because it makes changing the color easy, if the png was black, it doesn't change color
      // there might be a better way to change brush color
      brushSprite.tint = `rgb(${distance + 1}, 0, 100)`;
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
    const combinedStrokeSprite = new pixi.Sprite(combinedTexture);
    combinedStrokeSprite.position.set(bounds.x, bounds.y);

    const combinedStrokeSpriteContainer = new pixi.Container();
    combinedStrokeSpriteContainer.addChild(combinedStrokeSprite);
    this.drawingContainer.addChild(combinedStrokeSpriteContainer);

    this.currentStroke.destroy({ children: true });
    this.currentStroke = null;

    this.redoStack = [];
    this.undoStack.push(combinedStrokeSpriteContainer);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.flattenOldestUndo();
    }
  }
}

export default DrawManager;
