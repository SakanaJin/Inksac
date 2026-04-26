import * as pixi from "pixi.js";
import {
  WSType,
  RotationMode,
  type BrushCoord,
  type WSMessage,
  type StrokeData,
  type StrokeGetDto,
  type BrushGetDto,
  type ClientLayerDto,
  type StrokePoint,
} from "../constants/types";
import type { WSManager } from "../config/websocket-manager";
import { Stroke, type stringornumber } from "./Stroke";
import api from "../config/axios";
import { EnvVars } from "../config/env-vars";

const baseurl = EnvVars.mediaBaseUrl;

type StrokeHistoryEntry = Stroke[];

class DrawManager {
  private app: pixi.Application;
  private undoStack: StrokeHistoryEntry[];
  private redoStack: StrokeHistoryEntry[];
  private lastPosition: pixi.Point;

  private canvasWidth: number;
  private canvasHeight: number;
  private canvasColor: string;

  private baseLayer: pixi.RenderTexture;
  private baseSprite: pixi.Sprite;
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
  private currentMirrorStrokes: pixi.Container[] = [];
  private isDrawing = false;
  private strokePoints: StrokePoint[] = [];

  private brushTexture: pixi.Texture | null = null;
  private activeBrush: BrushGetDto | null = null;
  private activeColor: string = "#ffffffff";
  private activeOpacity: number = 1;
  private activeErase: boolean = false;
  private activeTool: "brush" | "eraser" | "eyedropper" | "shapes" | "move" =
    "brush";
  private shapeType: "line" | "rectangle" | "ellipse" = "line";
  private strokeScale: number = 16;

  private smoothingEnabled = false;
  private smoothingStrength = 35;
  private smoothedPosition: pixi.Point | null = null;
  private rawPointerPosition: pixi.Point | null = null;

  private pressureEnabled = true;
  private pressureMinSizePercent = 10;
  private pressureSensitivity = 65;
  private pressureStabilizationEnabled = true;
  private pressureStabilizationStrength = 30;
  private taperInEnabled = false;
  private taperInDistance = 32;
  private taperInStartSizePercent = 5;
  private taperOutEnabled = false;
  private taperOutDistance = 32;
  private taperOutEndSizePercent = 5;
  private currentPointerPressure = 1;
  private currentPointerType = "mouse";
  private smoothedPressure = 1;
  private currentStrokeDistance = 0;

  private ws: WSManager | null = null;

  private strokesMap: Map<stringornumber, Stroke>;
  private tempStrokes: Map<string, Stroke>;
  private onStroke: ((brushId: number) => void) | null = null;

  private spacingCarry = 0;
  private pendingStartPoint: BrushCoord | null = null;
  private shapeStartPoint: BrushCoord | null = null;

  private activePointerId: number | null = null;

  private mirrorEnabled = false;
  private mirrorCenterX = 0;
  private mirrorCenterY = 0;
  private mirrorAngleRadians = Math.PI / 2;
  private mirrorAxes: 1 | 2 = 1;

  constructor(
    pixiApp: pixi.Application,
    wsManager: WSManager,
    canvasWidth: number,
    canvasHeight: number,
    canvasColor: string,
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

    this.boardContentContainer = new pixi.Container();
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

  public setSmoothing(enabled: boolean, strength: number) {
    this.smoothingEnabled = enabled;
    this.smoothingStrength = Math.max(0, Math.min(100, strength));
  }

  public setPressureSettings(
    enabled: boolean,
    minSizePercent: number,
    sensitivity: number,
  ) {
    this.pressureEnabled = enabled;
    this.pressureMinSizePercent = Math.max(0, Math.min(100, minSizePercent));
    this.pressureSensitivity = Math.max(0, Math.min(100, sensitivity));
  }

  public setPressureStabilization(enabled: boolean, strength: number) {
    this.pressureStabilizationEnabled = enabled;
    this.pressureStabilizationStrength = Math.max(0, Math.min(100, strength));
  }

  public setTaperIn(
    enabled: boolean,
    distance: number,
    startSizePercent: number,
  ) {
    this.taperInEnabled = enabled;
    this.taperInDistance = Math.max(0, distance);
    this.taperInStartSizePercent = Math.max(1, Math.min(100, startSizePercent));
  }

  public setTaperOut(
    enabled: boolean,
    distance: number,
    endSizePercent: number,
  ) {
    this.taperOutEnabled = enabled;
    this.taperOutDistance = Math.max(0, distance);
    this.taperOutEndSizePercent = Math.max(1, Math.min(100, endSizePercent));
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

      container.position.set(layer.x ?? 0, layer.y ?? 0);

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

  public getLayerOutlineScreenRect(layerId: number) {
    const layer = this.layers.find((item) => item.id === layerId);
    const layerContainer = this.layerContainers.get(layerId);

    if (!layer || !layerContainer) {
      return null;
    }

    const scale = this.worldContainer.scale.x;
    const boardRect = {
      left: this.worldContainer.position.x + (layer.x ?? 0) * scale,
      top: this.worldContainer.position.y + (layer.y ?? 0) * scale,
      right:
        this.worldContainer.position.x +
        ((layer.x ?? 0) + this.canvasWidth) * scale,
      bottom:
        this.worldContainer.position.y +
        ((layer.y ?? 0) + this.canvasHeight) * scale,
    };

    if (layerContainer.children.length === 0) {
      return {
        left: boardRect.left,
        top: boardRect.top,
        width: boardRect.right - boardRect.left,
        height: boardRect.bottom - boardRect.top,
      };
    }

    const contentBounds = layerContainer.getBounds();
    const left = Math.min(boardRect.left, contentBounds.x);
    const top = Math.min(boardRect.top, contentBounds.y);
    const right = Math.max(
      boardRect.right,
      contentBounds.x + contentBounds.width,
    );
    const bottom = Math.max(
      boardRect.bottom,
      contentBounds.y + contentBounds.height,
    );

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
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

  public setActiveTool(
    tool: "brush" | "eraser" | "eyedropper" | "shapes" | "move",
  ) {
    this.activeTool = tool;
  }

  public setShapeType(shapeType: "line" | "rectangle" | "ellipse") {
    this.shapeType = shapeType;
  }

  public setMirror(config: {
    enabled: boolean;
    centerX: number;
    centerY: number;
    angleDegrees: number;
    axes: 1 | 2;
  }) {
    this.mirrorEnabled = config.enabled;
    this.mirrorCenterX = Math.max(
      0,
      Math.min(this.canvasWidth, config.centerX),
    );
    this.mirrorCenterY = Math.max(
      0,
      Math.min(this.canvasHeight, config.centerY),
    );
    this.mirrorAngleRadians = (config.angleDegrees * Math.PI) / 180;
    this.mirrorAxes = config.axes === 2 ? 2 : 1;
  }

  public async sampleColorAtClientPoint(clientX: number, clientY: number) {
    const localPosition = this.getLocalPositionFromClient(clientX, clientY);
    const x = Math.floor(localPosition.x);
    const y = Math.floor(localPosition.y);

    if (!this.isInsideBoard(x, y)) return null;

    const exportTexture = this.app.renderer.generateTexture({
      target: this.worldContainer,
      frame: new pixi.Rectangle(0, 0, this.canvasWidth, this.canvasHeight),
    });

    try {
      const extractedCanvas = this.app.renderer.extract.canvas(
        exportTexture,
      ) as unknown as HTMLCanvasElement;

      const context = extractedCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!context) return null;

      const pixel = context.getImageData(x, y, 1, 1).data;
      const toHex = (value: number) => value.toString(16).padStart(2, "0");

      return `#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}${toHex(
        pixel[3],
      )}`;
    } finally {
      exportTexture.destroy(true);
    }
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
  private getBrushSpacingPx(brushSpacingPercent: number, brushScale: number) {
    const clampedPercent = Math.max(1, Math.min(100, brushSpacingPercent));
    const rawSpacing = (brushScale * clampedPercent) / 100;
    return Math.max(brushScale * 0.01, rawSpacing, 1);
  }

  //   const tempContainer = new pixi.Container();
  //   tempContainer.addChild(this.baseSprite);
  //   tempContainer.addChild(oldest);
  private getDeterministicRandomUnit(
    point: BrushCoord,
    index: number,
    salt = 0,
  ) {
    const raw =
      Math.sin(
        point.x * 12.9898 + point.y * 78.233 + index * 37.719 + salt * 19.913,
      ) * 43758.5453;

    //   const newBaseLayer = pixi.RenderTexture.create({
    //     width: this.app.screen.width,
    //     height: this.app.screen.height,
    //   });
    return raw - Math.floor(raw);
  }

  //   this.app.renderer.render({
  //     container: tempContainer,
  //     target: newBaseLayer,
  //   });
  private getRandomRotationAngle(
    point: BrushCoord,
    index: number,
    jitterPercent: number,
  ) {
    const clampedJitter = Math.max(0, Math.min(100, jitterPercent));
    const maxAngle = (Math.PI * 2 * clampedJitter) / 100;
    const unit = this.getDeterministicRandomUnit(point, index);
    return (unit - 0.5) * maxAngle;
  }

  //   tempContainer.removeChildren();
  private getSmoothingFollowFactor() {
    const t = Math.max(0, Math.min(100, this.smoothingStrength)) / 100;

    const effectiveT = Math.pow(t, 0.6);

    return 1 - effectiveT * 0.98;
  }

  private getPressureStabilizationFollowFactor() {
    const t =
      Math.max(0, Math.min(100, this.pressureStabilizationStrength)) / 100;
    const curved = t * t;
    return 1 - curved * 0.965;
  }

  private normalizePressure(pressure: number, pointerType: string) {
    if (!this.pressureEnabled) return 1;
    if (pointerType !== "pen") return 1;

    const safePressure = Math.max(0, Math.min(1, pressure || 0));
    return safePressure > 0 ? safePressure : 0.001;
  }

  private getStabilizedPressure(rawPressure: number, pointerType: string) {
    const normalizedPressure = this.normalizePressure(rawPressure, pointerType);

    if (!this.pressureEnabled || pointerType !== "pen") {
      this.smoothedPressure = 1;
      return 1;
    }

    if (!this.pressureStabilizationEnabled) {
      this.smoothedPressure = normalizedPressure;
      return normalizedPressure;
    }

    const follow = this.getPressureStabilizationFollowFactor();

    this.smoothedPressure =
      this.smoothedPressure +
      (normalizedPressure - this.smoothedPressure) * follow;

    return this.smoothedPressure;
  }

  private getPressureAdjustedSizeFromNormalizedPressure(
    normalizedPressure: number,
    pointerType: string,
  ) {
    if (!this.pressureEnabled || pointerType !== "pen") {
      return this.strokeScale;
    }

    const minRatio = Math.max(
      0,
      Math.min(1, this.pressureMinSizePercent / 100),
    );

    const sensitivityT =
      Math.max(0, Math.min(100, this.pressureSensitivity)) / 100;

    const exponent = 2.2 - sensitivityT * 1.9;
    const curvedPressure = Math.pow(normalizedPressure, exponent);

    const sizeRatio = minRatio + (1 - minRatio) * curvedPressure;
    return Math.max(1, this.strokeScale * sizeRatio);
  }

  private getTaperInMultiplier(distance: number) {
    if (!this.taperInEnabled) return 1;

    const taperDistance = Math.max(0, this.taperInDistance);
    if (taperDistance <= 0) return 1;

    const minMultiplier = Math.max(
      0.01,
      Math.min(1, this.taperInStartSizePercent / 100),
    );
    const progress = Math.max(0, Math.min(1, distance / taperDistance));

    return minMultiplier + (1 - minMultiplier) * progress;
  }

  private getTaperOutMultiplier(distanceFromEnd: number) {
    if (!this.taperOutEnabled) return 1;

    const taperDistance = Math.max(0, this.taperOutDistance);
    if (taperDistance <= 0) return 1;

    const minMultiplier = Math.max(
      0.01,
      Math.min(1, this.taperOutEndSizePercent / 100),
    );
    const progress = Math.max(0, Math.min(1, distanceFromEnd / taperDistance));

    return minMultiplier + (1 - minMultiplier) * progress;
  }

  private getTaperMultiplier(distance: number, totalDistance?: number | null) {
    const taperInMultiplier = this.getTaperInMultiplier(distance);

    if (totalDistance == null || totalDistance <= 0) {
      return taperInMultiplier;
    }

    const distanceFromEnd = Math.max(0, totalDistance - distance);
    const taperOutMultiplier = this.getTaperOutMultiplier(distanceFromEnd);

    return taperInMultiplier * taperOutMultiplier;
  }

  private getTaperedSize(
    baseSize: number,
    distance: number,
    totalDistance?: number | null,
  ) {
    return Math.max(
      1,
      baseSize * this.getTaperMultiplier(distance, totalDistance),
    );
  }

  private getSpacingCapForSize(size: number) {
    return Math.max(size * 0.15, 2);
  }

  private getEffectiveSpacingPx(
    baseSize: number,
    distance: number,
    totalDistance?: number | null,
  ) {
    if (this.activeBrush == null) {
      return this.getBrushSpacingPx(1, baseSize);
    }

    const normalSpacing = this.getBrushSpacingPx(
      this.activeBrush.spacing,
      baseSize,
    );

    const taperMultiplier = this.getTaperMultiplier(distance, totalDistance);

    // If this point is effectively at full size, do not interfere with spacing.
    if (taperMultiplier >= 0.999) {
      return normalSpacing;
    }

    const taperedSize = Math.max(1, baseSize * taperMultiplier);
    const taperSpacingCap = this.getSpacingCapForSize(taperedSize);

    return Math.min(normalSpacing, taperSpacingCap);
  }

  private getStrokeCumulativeDistances(points: StrokePoint[]) {
    const cumulativeDistances: number[] = [0];

    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const current = points[i];
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      cumulativeDistances.push(
        cumulativeDistances[i - 1] + Math.sqrt(dx * dx + dy * dy),
      );
    }

    return cumulativeDistances;
  }

  private rebuildCurrentStrokeWithUnifiedTaper() {
    if (
      this.currentStroke == null ||
      this.brushTexture == null ||
      this.activeBrush == null ||
      this.strokePoints.length === 0
    ) {
      return;
    }

    const sourcePoints = [...this.strokePoints];
    const cumulativeDistances = this.getStrokeCumulativeDistances(sourcePoints);
    const totalDistance =
      cumulativeDistances[cumulativeDistances.length - 1] ?? 0;
    const rebuiltPoints: StrokePoint[] = [];
    const rebuiltStroke = new pixi.Container();

    if (this.activeErase) {
      rebuiltStroke.blendMode = "erase";
    }

    const baseSizes = sourcePoints.map((point, index) => {
      const existingMultiplier = this.getTaperMultiplier(
        cumulativeDistances[index] ?? 0,
        null,
      );

      return Math.max(1, point.size / Math.max(0.01, existingMultiplier));
    });

    const stampAt = (
      point: BrushCoord,
      size: number,
      pressure: number,
      rotation: number,
    ) => {
      const brushSprite = this.createBrushSprite(
        this.brushTexture!,
        point,
        this.activeColor,
        this.activeOpacity,
        size,
        rotation,
      );

      rebuiltStroke.addChild(brushSprite);
      rebuiltPoints.push({
        x: point.x,
        y: point.y,
        pressure,
        size,
      });
    };

    if (sourcePoints.length === 1 || totalDistance <= 0) {
      const onlyPoint = sourcePoints[0];
      const size = this.getTaperedSize(baseSizes[0], 0, 0);
      const rotation =
        this.activeBrush.rotation_mode === RotationMode.RANDOM
          ? this.getRotationForLocalDab(
              { x: onlyPoint.x, y: onlyPoint.y },
              null,
              this.activeBrush.rotation_mode,
              this.activeBrush.rotation_jitter,
              0,
            )
          : 0;

      stampAt(
        { x: onlyPoint.x, y: onlyPoint.y },
        size,
        onlyPoint.pressure,
        rotation,
      );

      this.currentStroke.destroy({ children: true });
      this.currentStroke = rebuiltStroke;
      this.strokePoints = rebuiltPoints;
      return;
    }

    const getInterpolatedValue = (
      startValue: number,
      endValue: number,
      t: number,
    ) => startValue + (endValue - startValue) * t;

    const getRotationForRebuiltDab = (
      currentPoint: BrushCoord,
      previousPoint: BrushCoord | null,
      nextPoint: BrushCoord | null,
      index: number,
    ) => {
      switch (this.activeBrush!.rotation_mode) {
        case RotationMode.NONE:
          return 0;

        case RotationMode.RANDOM:
          return this.getRandomRotationAngle(
            currentPoint,
            index,
            this.activeBrush!.rotation_jitter,
          );

        case RotationMode.FOLLOWSTROKE: {
          const fromPoint = previousPoint ?? currentPoint;
          const toPoint = nextPoint ?? currentPoint;
          const dx = toPoint.x - fromPoint.x;
          const dy = toPoint.y - fromPoint.y;

          if (dx === 0 && dy === 0) return 0;
          return Math.atan2(dy, dx);
        }

        default:
          return 0;
      }
    };

    const firstPoint = sourcePoints[0];
    const firstSize = this.getTaperedSize(baseSizes[0], 0, totalDistance);
    const firstNextPoint =
      sourcePoints.length > 1
        ? { x: sourcePoints[1].x, y: sourcePoints[1].y }
        : null;

    stampAt(
      { x: firstPoint.x, y: firstPoint.y },
      firstSize,
      firstPoint.pressure,
      getRotationForRebuiltDab(
        { x: firstPoint.x, y: firstPoint.y },
        null,
        firstNextPoint,
        0,
      ),
    );

    let spacingCarry = 0;
    let rebuiltIndex = 1;

    for (let i = 1; i < sourcePoints.length; i += 1) {
      const startPoint = sourcePoints[i - 1];
      const endPoint = sourcePoints[i];
      const startDistance = cumulativeDistances[i - 1];
      const endDistance = cumulativeDistances[i];

      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      let remainingSegment = Math.sqrt(dx * dx + dy * dy);

      if (remainingSegment <= 0) {
        continue;
      }

      const dirX = dx / remainingSegment;
      const dirY = dy / remainingSegment;
      let cursorX = startPoint.x;
      let cursorY = startPoint.y;
      let traveledOnSegment = 0;

      while (remainingSegment > 0) {
        const segmentDistance = startDistance + traveledOnSegment;
        const tForBaseSize =
          endDistance > startDistance
            ? (segmentDistance - startDistance) / (endDistance - startDistance)
            : 0;
        const interpolatedBaseSize = getInterpolatedValue(
          baseSizes[i - 1],
          baseSizes[i],
          tForBaseSize,
        );
        const spacingPx = this.getEffectiveSpacingPx(
          interpolatedBaseSize,
          segmentDistance,
          totalDistance,
        );

        if (spacingCarry + remainingSegment < spacingPx) {
          spacingCarry += remainingSegment;
          break;
        }

        const distanceToNextDab = spacingPx - spacingCarry;
        cursorX += dirX * distanceToNextDab;
        cursorY += dirY * distanceToNextDab;
        remainingSegment -= distanceToNextDab;
        traveledOnSegment += distanceToNextDab;

        const currentDistance = startDistance + traveledOnSegment;
        const segmentT =
          endDistance > startDistance
            ? (currentDistance - startDistance) / (endDistance - startDistance)
            : 0;
        const clampedT = Math.max(0, Math.min(1, segmentT));
        const baseSize = getInterpolatedValue(
          baseSizes[i - 1],
          baseSizes[i],
          clampedT,
        );
        const pressure = getInterpolatedValue(
          startPoint.pressure,
          endPoint.pressure,
          clampedT,
        );
        const point = { x: cursorX, y: cursorY };
        const nextPreviewPoint =
          remainingSegment > 0
            ? { x: endPoint.x, y: endPoint.y }
            : i + 1 < sourcePoints.length
              ? { x: sourcePoints[i + 1].x, y: sourcePoints[i + 1].y }
              : { x: endPoint.x, y: endPoint.y };

        stampAt(
          point,
          this.getTaperedSize(baseSize, currentDistance, totalDistance),
          pressure,
          getRotationForRebuiltDab(
            point,
            rebuiltPoints.length > 0
              ? {
                  x: rebuiltPoints[rebuiltPoints.length - 1].x,
                  y: rebuiltPoints[rebuiltPoints.length - 1].y,
                }
              : null,
            nextPreviewPoint,
            rebuiltIndex,
          ),
        );

        rebuiltIndex += 1;
        spacingCarry = 0;
      }
    }

    if (rebuiltPoints.length === 0) {
      rebuiltPoints.push(...sourcePoints);
    }

    this.currentStroke.destroy({ children: true });
    this.currentStroke = rebuiltStroke;
    this.strokePoints = rebuiltPoints;
  }

  //   this.baseLayer.destroy();
  //   this.baseLayer = newBaseLayer;
  //   this.baseSprite.texture = newBaseLayer;
  private createBrushSprite(
    texture: pixi.Texture,
    point: BrushCoord,
    tint: string,
    opacity: number,
    scale: number,
    rotation: number,
  ) {
    const brushSprite = new pixi.Sprite(texture);
    brushSprite.anchor.set(0.5);
    brushSprite.tint = tint;
    brushSprite.alpha = opacity;
    brushSprite.setSize(scale);
    brushSprite.position.set(point.x, point.y);
    brushSprite.rotation = rotation;
    return brushSprite;
  }

  private createStrokeContainerFromSprite(
    id: stringornumber,
    layerId: number,
    sprite: pixi.Sprite,
  ) {
    const stroke = new Stroke(id, layerId);
    stroke.addChild(sprite);
    return stroke;
  }

  private getMirrorAxisAngles() {
    const primaryAngle = this.mirrorAngleRadians;

    return this.mirrorAxes === 2
      ? [primaryAngle, primaryAngle + Math.PI / 2]
      : [primaryAngle];
  }

  private getMirrorTransformSequences() {
    const axisAngles = this.getMirrorAxisAngles();

    if (!this.mirrorEnabled || axisAngles.length === 0) {
      return [] as number[][];
    }

    if (axisAngles.length === 1) {
      return [[axisAngles[0]]];
    }

    return [[axisAngles[0]], [axisAngles[1]], [axisAngles[0], axisAngles[1]]];
  }

  private reflectPointAcrossAxis(
    point: BrushCoord,
    axisAngle: number,
  ): BrushCoord {
    const dx = point.x - this.mirrorCenterX;
    const dy = point.y - this.mirrorCenterY;
    const dirX = Math.cos(axisAngle);
    const dirY = Math.sin(axisAngle);
    const projection = dx * dirX + dy * dirY;

    return {
      x: this.mirrorCenterX + 2 * projection * dirX - dx,
      y: this.mirrorCenterY + 2 * projection * dirY - dy,
    };
  }

  private reflectRotationAcrossAxis(rotation: number, axisAngle: number) {
    return 2 * axisAngle - rotation;
  }

  private applyMirrorSequenceToPoint(point: BrushCoord, sequence: number[]) {
    return sequence.reduce(
      (currentPoint, axisAngle) =>
        this.reflectPointAcrossAxis(currentPoint, axisAngle),
      point,
    );
  }

  private applyMirrorSequenceToRotation(rotation: number, sequence: number[]) {
    return sequence.reduce(
      (currentRotation, axisAngle) =>
        this.reflectRotationAcrossAxis(currentRotation, axisAngle),
      rotation,
    );
  }

  private mirrorStrokePoints(points: StrokePoint[], sequence: number[]) {
    return points.map((point) => {
      const mirroredPoint = this.applyMirrorSequenceToPoint(point, sequence);
      return {
        ...point,
        x: mirroredPoint.x,
        y: mirroredPoint.y,
      };
    });
  }

  private hasDistinctMirror(points: StrokePoint[], sequence: number[]) {
    return points.some((point) => {
      const mirroredPoint = this.applyMirrorSequenceToPoint(point, sequence);
      return (
        Math.abs(mirroredPoint.x - point.x) > 0.001 ||
        Math.abs(mirroredPoint.y - point.y) > 0.001
      );
    });
  }

  private getRenderableMirrorTransformSequences(points: StrokePoint[]) {
    return this.getMirrorTransformSequences().filter((sequence) =>
      this.hasDistinctMirror(points, sequence),
    );
  }

  private shouldRenderMirrorPreview() {
    return (
      this.mirrorEnabled &&
      this.getRenderableMirrorTransformSequences(this.strokePoints).length > 0
    );
  }

  private createCombinedStrokeContainerFromPoints({
    id,
    layerId,
    points,
    texture,
    color,
    opacity,
    isEraser,
    scale,
    rotationMode,
    rotationJitter,
  }: {
    id: stringornumber;
    layerId: number;
    points: StrokePoint[];
    texture: pixi.Texture;
    color: string;
    opacity: number;
    isEraser: boolean;
    scale: number;
    rotationMode: RotationMode;
    rotationJitter: number;
  }) {
    const renderedStroke = new pixi.Container();

    if (isEraser) {
      renderedStroke.blendMode = "erase";
    }

    for (let i = 0; i < points.length; i += 1) {
      const point = points[i];
      const rotation = this.getRotationForReceivedDab(
        point,
        i,
        points,
        rotationMode,
        rotationJitter,
      );

      const brushSprite = this.createBrushSprite(
        texture,
        point,
        color,
        opacity,
        point.size ?? scale,
        rotation,
      );

      renderedStroke.addChild(brushSprite);
    }

    const bounds = renderedStroke.getLocalBounds();
    const frame = new pixi.Rectangle(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );

    const combinedTexture = this.app.renderer.generateTexture({
      target: renderedStroke,
      frame,
    });
    const combinedSprite = new pixi.Sprite(combinedTexture);
    combinedSprite.position.set(frame.x, frame.y);

    if (isEraser) {
      combinedSprite.blendMode = "erase";
    }

    renderedStroke.destroy({ children: true });

    return this.createStrokeContainerFromSprite(id, layerId, combinedSprite);
  }

  private addStrokeToLayer(stroke: Stroke) {
    const layerContainer = this.layerContainers.get(stroke.layerId);
    if (!layerContainer) {
      return false;
    }

    layerContainer.addChild(stroke);

    return true;
  }

  private getLayerOffset(layerId: number) {
    const layer = this.layers.find((item) => item.id === layerId);

    return {
      x: layer?.x ?? 0,
      y: layer?.y ?? 0,
    };
  }

  private toLayerLocalStrokePoints(points: StrokePoint[], layerId: number) {
    const offset = this.getLayerOffset(layerId);

    return points.map((point) => ({
      ...point,
      x: point.x - offset.x,
      y: point.y - offset.y,
    }));
  }

  private toPreviewLocalPoint(point: BrushCoord, layerId: number | null) {
    if (layerId === null) {
      return point;
    }

    const offset = this.getLayerOffset(layerId);

    return {
      x: point.x - offset.x,
      y: point.y - offset.y,
    };
  }

  private removeStrokeFromLayer(stroke: Stroke) {
    const layerContainer = this.layerContainers.get(stroke.layerId);
    if (layerContainer) {
      layerContainer.removeChild(stroke);
    }
  }

  private sortLayerChildren(layerId: number) {
    const layerContainer = this.layerContainers.get(layerId);
    if (!layerContainer) return;

    (layerContainer.children as Stroke[]).sort(
      (a, b) => Number(a.id) - Number(b.id),
    );
  }

  private getLocalPositionFromClient(clientX: number, clientY: number) {
    const rect = this.app.canvas.getBoundingClientRect();
    const globalPoint = new pixi.Point(clientX - rect.left, clientY - rect.top);
    return this.worldContainer.toLocal(globalPoint);
  }

  private attachWindowStrokeListeners() {
    window.addEventListener("pointermove", this.handleWindowPointerMove);
    window.addEventListener("pointerup", this.handleWindowPointerUp);
    window.addEventListener("pointercancel", this.handleWindowPointerCancel);
    window.addEventListener("blur", this.handleWindowBlur);
  }

  private detachWindowStrokeListeners() {
    window.removeEventListener("pointermove", this.handleWindowPointerMove);
    window.removeEventListener("pointerup", this.handleWindowPointerUp);
    window.removeEventListener("pointercancel", this.handleWindowPointerCancel);
    window.removeEventListener("blur", this.handleWindowBlur);
  }

  private handleWindowPointerMove = (event: PointerEvent) => {
    if (!this.isDrawing) return;
    if (
      this.activePointerId !== null &&
      event.pointerId !== this.activePointerId
    ) {
      return;
    }

    const localPosition = this.getLocalPositionFromClient(
      event.clientX,
      event.clientY,
    );

    this.continueStrokeAt(
      localPosition.x,
      localPosition.y,
      event.pressure,
      event.pointerType,
      event.shiftKey,
      event.altKey,
    );
  };

  private handleWindowPointerUp = (event: PointerEvent) => {
    if (
      this.activePointerId !== null &&
      event.pointerId !== this.activePointerId
    ) {
      return;
    }

    if (this.activeTool === "shapes") {
      const localPosition = this.getLocalPositionFromClient(
        event.clientX,
        event.clientY,
      );

      this.continueStrokeAt(
        localPosition.x,
        localPosition.y,
        event.pressure,
        event.pointerType,
        event.shiftKey,
        event.altKey,
      );
    }

    this.onMouseUp();
  };

  private handleWindowPointerCancel = (event: PointerEvent) => {
    if (
      this.activePointerId !== null &&
      event.pointerId !== this.activePointerId
    ) {
      return;
    }

    this.onMouseUp();
  };

  private handleWindowBlur = () => {
    this.onMouseUp();
  };

  //   this.drawingContainer.addChildAt(this.baseSprite, 0);
  private stampMirrorPreviewAtPoint(
    point: BrushCoord,
    rotation: number,
    size: number,
  ) {
    if (
      this.currentMirrorStrokes.length === 0 ||
      this.brushTexture == null ||
      this.activeBrush == null ||
      !this.shouldRenderMirrorPreview()
    ) {
      return;
    }

    const sequences = this.getRenderableMirrorTransformSequences(
      this.strokePoints,
    );

    sequences.forEach((sequence, index) => {
      const mirroredPoint = this.applyMirrorSequenceToPoint(point, sequence);

      if (!this.isInsideBoard(mirroredPoint.x, mirroredPoint.y)) return;

      const mirrorRotation = this.applyMirrorSequenceToRotation(
        rotation,
        sequence,
      );
      const container = this.currentMirrorStrokes[index];
      if (!container) return;

      const previewPoint = this.toPreviewLocalPoint(
        mirroredPoint,
        this.currentStrokeLayerId,
      );

      const brushSprite = this.createBrushSprite(
        this.brushTexture!,
        previewPoint,
        this.activeColor,
        this.activeOpacity,
        size,
        mirrorRotation,
      );

      container.addChild(brushSprite);
    });
  }

  private stampCurrentBrushAtPoint(
    point: BrushCoord,
    rotation: number,
    pushPoint: boolean,
    size: number,
    pressure: number,
  ) {
    if (
      this.currentStroke == null ||
      this.brushTexture == null ||
      this.activeBrush == null
    ) {
      return;
    }

    //   this.drawingContainer.removeChild(oldest);
    //   oldest.destroy();
    // }
    if (!this.isInsideBoard(point.x, point.y)) return;

    const previewPoint = this.toPreviewLocalPoint(
      point,
      this.currentStrokeLayerId,
    );

    const brushSprite = this.createBrushSprite(
      this.brushTexture,
      previewPoint,
      this.activeColor,
      this.activeOpacity,
      size,
      rotation,
    );

    this.currentStroke.addChild(brushSprite);
    this.stampMirrorPreviewAtPoint(point, rotation, size);

    if (pushPoint) {
      this.strokePoints.push({
        x: point.x,
        y: point.y,
        pressure,
        size,
      });
    }
  }

  private getRotationForLocalDab(
    currentPoint: BrushCoord,
    previousPoint: BrushCoord | null,
    rotationMode: RotationMode,
    rotationJitter: number,
    index: number,
  ) {
    switch (rotationMode) {
      case RotationMode.NONE:
        return 0;

      case RotationMode.RANDOM:
        return this.getRandomRotationAngle(currentPoint, index, rotationJitter);

      case RotationMode.FOLLOWSTROKE: {
        if (!previousPoint) return 0;

        const dx = currentPoint.x - previousPoint.x;
        const dy = currentPoint.y - previousPoint.y;

        if (dx === 0 && dy === 0) return 0;
        return Math.atan2(dy, dx);
      }

      default:
        return 0;
    }
  }

  private getRotationForReceivedDab(
    point: BrushCoord,
    index: number,
    points: StrokePoint[],
    rotationMode: RotationMode,
    rotationJitter: number,
  ) {
    switch (rotationMode) {
      case RotationMode.NONE:
        return 0;

      case RotationMode.RANDOM:
        return this.getRandomRotationAngle(point, index, rotationJitter);

      case RotationMode.FOLLOWSTROKE: {
        if (points.length <= 1) return 0;

        const prev = points[index - 1] ?? point;
        const next = points[index + 1] ?? point;

        const dx = next.x - prev.x;
        const dy = next.y - prev.y;

        if (dx === 0 && dy === 0) return 0;
        return Math.atan2(dy, dx);
      }

      default:
        return 0;
    }
  }

  private processSegment(endX: number, endY: number) {
    if (
      this.currentStroke == null ||
      this.brushTexture == null ||
      this.activeBrush == null
    ) {
      return;
    }

    const startX = this.lastPosition.x;
    const startY = this.lastPosition.y;

    const dx = endX - startX;
    const dy = endY - startY;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    this.lastPosition.set(endX, endY);

    if (segmentLength <= 0) return;

    const stabilizedPressure = this.getStabilizedPressure(
      this.currentPointerPressure,
      this.currentPointerType,
    );
    const baseSize = this.getPressureAdjustedSizeFromNormalizedPressure(
      stabilizedPressure,
      this.currentPointerType,
    );

    const dirX = dx / segmentLength;
    const dirY = dy / segmentLength;
    const segmentAngle = Math.atan2(dirY, dirX);

    let remainingSegment = segmentLength;
    let cursorX = startX;
    let cursorY = startY;
    let traveledOnSegment = 0;

    const segmentStartDistance = this.currentStrokeDistance;

    while (remainingSegment > 0) {
      const spacingPx = this.getEffectiveSpacingPx(
        baseSize,
        segmentStartDistance + traveledOnSegment,
      );

      if (this.spacingCarry + remainingSegment < spacingPx) {
        this.spacingCarry += remainingSegment;
        break;
      }

      const distanceToNextDab = spacingPx - this.spacingCarry;

      cursorX += dirX * distanceToNextDab;
      cursorY += dirY * distanceToNextDab;
      remainingSegment -= distanceToNextDab;
      traveledOnSegment += distanceToNextDab;

      const previousPoint =
        this.strokePoints.length > 0
          ? {
              x: this.strokePoints[this.strokePoints.length - 1].x,
              y: this.strokePoints[this.strokePoints.length - 1].y,
            }
          : null;

      const nextPoint = { x: cursorX, y: cursorY };

      const rotation =
        this.activeBrush.rotation_mode === RotationMode.FOLLOWSTROKE
          ? segmentAngle
          : this.getRotationForLocalDab(
              nextPoint,
              previousPoint,
              this.activeBrush.rotation_mode,
              this.activeBrush.rotation_jitter,
              this.strokePoints.length,
            );

      const dabDistanceFromStart = segmentStartDistance + traveledOnSegment;
      const currentSize = this.getTaperedSize(
        baseSize,
        dabDistanceFromStart,
        null,
      );

      this.stampCurrentBrushAtPoint(
        nextPoint,
        rotation,
        true,
        currentSize,
        stabilizedPressure,
      );
      this.spacingCarry = 0;
    }
    this.currentStrokeDistance = segmentStartDistance + segmentLength;
  }

  private clearCurrentStrokeChildren() {
    if (!this.currentStroke) return;

    for (const child of [...this.currentStroke.children]) {
      this.currentStroke.removeChild(child);
      child.destroy();
    }
  }

  private clearCurrentMirrorStrokeChildren() {
    for (const mirrorStroke of this.currentMirrorStrokes) {
      for (const child of [...mirrorStroke.children]) {
        mirrorStroke.removeChild(child);
        child.destroy();
      }
    }
  }

  private getShapeSpacingPx() {
    if (!this.activeBrush) {
      return Math.max(1, this.strokeScale * 0.2);
    }

    return Math.max(
      1,
      this.getBrushSpacingPx(this.activeBrush.spacing, this.strokeScale),
    );
  }

  private getConstrainedLineEnd(
    start: BrushCoord,
    end: BrushCoord,
  ): BrushCoord {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= 0) {
      return end;
    }

    const snappedAngle =
      Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);

    return {
      x: start.x + Math.cos(snappedAngle) * distance,
      y: start.y + Math.sin(snappedAngle) * distance,
    };
  }

  private getRectangleBounds(
    start: BrushCoord,
    end: BrushCoord,
    constrain: boolean,
    fromCenter: boolean,
  ) {
    if (fromCenter) {
      let halfWidth = Math.abs(end.x - start.x);
      let halfHeight = Math.abs(end.y - start.y);

      if (constrain) {
        const size = Math.max(halfWidth, halfHeight);
        halfWidth = size;
        halfHeight = size;
      }

      return {
        left: start.x - halfWidth,
        right: start.x + halfWidth,
        top: start.y - halfHeight,
        bottom: start.y + halfHeight,
      };
    }

    let dx = end.x - start.x;
    let dy = end.y - start.y;

    if (constrain) {
      const size = Math.max(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx || 1) * size;
      dy = Math.sign(dy || 1) * size;
    }

    return {
      left: Math.min(start.x, start.x + dx),
      right: Math.max(start.x, start.x + dx),
      top: Math.min(start.y, start.y + dy),
      bottom: Math.max(start.y, start.y + dy),
    };
  }

  private buildLinePoints(start: BrushCoord, end: BrushCoord) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const spacing = this.getShapeSpacingPx();

    if (distance <= 0) {
      return [start];
    }

    const steps = Math.max(1, Math.ceil(distance / spacing));
    const points: BrushCoord[] = [];

    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      points.push({
        x: start.x + dx * t,
        y: start.y + dy * t,
      });
    }

    return points;
  }

  private buildRectangleOutlinePoints(
    start: BrushCoord,
    end: BrushCoord,
    constrain: boolean,
    fromCenter: boolean,
  ) {
    const bounds = this.getRectangleBounds(start, end, constrain, fromCenter);
    const topLeft = { x: bounds.left, y: bounds.top };
    const topRight = { x: bounds.right, y: bounds.top };
    const bottomRight = { x: bounds.right, y: bounds.bottom };
    const bottomLeft = { x: bounds.left, y: bounds.bottom };

    const points = [
      ...this.buildLinePoints(topLeft, topRight),
      ...this.buildLinePoints(topRight, bottomRight).slice(1),
      ...this.buildLinePoints(bottomRight, bottomLeft).slice(1),
      ...this.buildLinePoints(bottomLeft, topLeft).slice(1),
    ];

    return points;
  }

  private buildEllipseOutlinePoints(
    start: BrushCoord,
    end: BrushCoord,
    constrain: boolean,
    fromCenter: boolean,
  ) {
    const bounds = this.getRectangleBounds(start, end, constrain, fromCenter);
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const radiusX = Math.max(0.5, (bounds.right - bounds.left) / 2);
    const radiusY = Math.max(0.5, (bounds.bottom - bounds.top) / 2);
    const perimeter =
      Math.PI *
      (3 * (radiusX + radiusY) -
        Math.sqrt((3 * radiusX + radiusY) * (radiusX + 3 * radiusY)));
    const spacing = this.getShapeSpacingPx();
    const segments = Math.max(24, Math.ceil(perimeter / spacing));

    const points: BrushCoord[] = [];

    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      points.push({
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
      });
    }

    return points;
  }

  private getShapePoints(
    start: BrushCoord,
    end: BrushCoord,
    constrain: boolean,
    fromCenter: boolean,
  ) {
    if (this.shapeType === "line") {
      let adjustedEnd = end;

      if (constrain) {
        adjustedEnd = this.getConstrainedLineEnd(start, adjustedEnd);
      }

      if (fromCenter) {
        adjustedEnd = {
          x: start.x + (adjustedEnd.x - start.x),
          y: start.y + (adjustedEnd.y - start.y),
        };

        const mirroredStart = {
          x: start.x - (adjustedEnd.x - start.x),
          y: start.y - (adjustedEnd.y - start.y),
        };

        return this.buildLinePoints(mirroredStart, adjustedEnd);
      }

      return this.buildLinePoints(start, adjustedEnd);
    }

    if (this.shapeType === "rectangle") {
      return this.buildRectangleOutlinePoints(
        start,
        end,
        constrain,
        fromCenter,
      );
    }

    return this.buildEllipseOutlinePoints(start, end, constrain, fromCenter);
  }

  private rebuildShapePreview(points: BrushCoord[]) {
    if (!this.currentStroke || !this.brushTexture || !this.activeBrush) {
      return;
    }

    this.clearCurrentStrokeChildren();
    this.clearCurrentMirrorStrokeChildren();
    this.strokePoints = [];
    this.currentStrokeDistance = 0;

    let previousPoint: BrushCoord | null = null;

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];

      if (previousPoint) {
        const dx = point.x - previousPoint.x;
        const dy = point.y - previousPoint.y;
        this.currentStrokeDistance += Math.sqrt(dx * dx + dy * dy);
      }

      const rotation = this.getRotationForLocalDab(
        point,
        previousPoint,
        this.activeBrush.rotation_mode,
        this.activeBrush.rotation_jitter,
        index,
      );

      this.stampCurrentBrushAtPoint(point, rotation, true, this.strokeScale, 1);

      previousPoint = point;
    }
  }

  private updateShapePreview(
    x: number,
    y: number,
    constrain: boolean,
    fromCenter: boolean,
  ) {
    if (!this.shapeStartPoint) return;

    const points = this.getShapePoints(
      this.shapeStartPoint,
      { x, y },
      constrain,
      fromCenter,
    );

    if (points.length === 0) {
      return;
    }

    this.rebuildShapePreview(points);
    this.pendingStartPoint = points[0] ?? this.shapeStartPoint;
  }

  private syncMirrorPreviewFromStrokePoints() {
    if (this.currentMirrorStrokes.length === 0) return;

    this.clearCurrentMirrorStrokeChildren();

    if (
      !this.shouldRenderMirrorPreview() ||
      this.brushTexture == null ||
      this.activeBrush == null
    ) {
      return;
    }

    for (let i = 0; i < this.strokePoints.length; i += 1) {
      const point = this.strokePoints[i];
      const rotation = this.getRotationForReceivedDab(
        point,
        i,
        this.strokePoints,
        this.activeBrush.rotation_mode,
        this.activeBrush.rotation_jitter,
      );

      this.stampMirrorPreviewAtPoint(
        { x: point.x, y: point.y },
        rotation,
        point.size ?? this.strokeScale,
      );
    }
  }

  private continueStrokeAt(
    x: number,
    y: number,
    pressure: number,
    pointerType: string,
    shiftKey = false,
    altKey = false,
  ) {
    if (
      this.isDrawing === false ||
      this.currentStroke == null ||
      this.brushTexture == null ||
      this.activeBrush == null
    ) {
      return;
    }

    this.currentPointerPressure = pressure;
    this.currentPointerType = pointerType;
    this.rawPointerPosition = new pixi.Point(x, y);

    if (this.activeTool === "shapes") {
      this.updateShapePreview(x, y, shiftKey, altKey);
      return;
    }

    if (
      this.smoothingEnabled &&
      this.smoothedPosition &&
      this.rawPointerPosition
    ) {
      const follow = this.getSmoothingFollowFactor();

      const nextX =
        this.smoothedPosition.x +
        (this.rawPointerPosition.x - this.smoothedPosition.x) * follow;
      const nextY =
        this.smoothedPosition.y +
        (this.rawPointerPosition.y - this.smoothedPosition.y) * follow;

      this.smoothedPosition.set(nextX, nextY);
      this.processSegment(nextX, nextY);
      return;
    }

    this.processSegment(x, y);
  }

  public undo() {
    if (this.undoStack.length === 0) return;

    const historyEntry = this.undoStack.pop()!;
    this.redoStack.push(historyEntry);

    for (const stroke of historyEntry) {
      this.removeStrokeFromLayer(stroke);
      this.strokesMap.delete(stroke.id);

      const message: WSMessage = { Mtype: WSType.UNDO, data: stroke.id };
      this.ws.send(message);
    }
  }

  public redo() {
    if (this.redoStack.length === 0) return;

    const historyEntry = this.redoStack.pop()!;
    this.undoStack.push(historyEntry);

    for (const stroke of historyEntry) {
      if (this.addStrokeToLayer(stroke)) {
        this.sortLayerChildren(stroke.layerId);
      }

      this.strokesMap.set(stroke.id, stroke);

      const message: WSMessage = { Mtype: WSType.REDO, data: stroke.id };
      this.ws.send(message);
    }
  }

  // POINTER EVENTS ----------------------------------------------------------------------------------------
  private initMouseEvents() {
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on("pointerdown", (event) => this.onMouseDown(event));
    this.app.stage.on("pointermove", (event) => this.onMouseMove(event));
    this.app.stage.on("pointerup", () => this.onMouseUp());
    this.app.stage.on("pointerupoutside", () => this.onMouseUp());
    this.app.stage.on("rightdown", () => this.onMouseUp());
  }

  private onMouseDown(event: pixi.FederatedPointerEvent) {
    if (event.button !== 0) return;
    if (this.activeTool === "eyedropper") return;
    if (this.activeTool === "move") return;
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
    this.activePointerId = event.pointerId;
    this.lastPosition.set(localPosition.x, localPosition.y);
    this.strokePoints = [];
    this.currentStrokeLayerId = this.activeLayerId;
    this.spacingCarry = 0;
    this.currentStrokeDistance = 0;
    this.pendingStartPoint = { x: localPosition.x, y: localPosition.y };
    this.rawPointerPosition = new pixi.Point(localPosition.x, localPosition.y);
    this.smoothedPosition = new pixi.Point(localPosition.x, localPosition.y);

    this.currentPointerPressure = event.pressure;
    this.currentPointerType = event.pointerType;
    const initialPressure = this.normalizePressure(
      event.pressure,
      event.pointerType,
    );
    this.smoothedPressure = initialPressure;

    this.currentStroke = new pixi.Container();
    if (this.activeErase && this.activeTool !== "shapes") {
      this.currentStroke.blendMode = "erase";
    }
    layerContainer.addChild(this.currentStroke);

    const mirrorPreviewCount = this.getRenderableMirrorTransformSequences([
      {
        x: localPosition.x,
        y: localPosition.y,
        pressure: initialPressure,
        size: this.strokeScale,
      },
    ]).length;
    this.currentMirrorStrokes = Array.from(
      { length: mirrorPreviewCount },
      () => {
        const container = new pixi.Container();
        if (this.activeErase && this.activeTool !== "shapes") {
          container.blendMode = "erase";
        }
        layerContainer.addChild(container);
        return container;
      },
    );

    this.attachWindowStrokeListeners();

    const startPoint = { x: localPosition.x, y: localPosition.y };
    this.shapeStartPoint = startPoint;

    if (this.activeTool === "shapes") {
      this.updateShapePreview(
        localPosition.x,
        localPosition.y,
        event.shiftKey,
        event.altKey,
      );
      return;
    }

    if (this.activeBrush.rotation_mode !== RotationMode.FOLLOWSTROKE) {
      const startRotation = this.getRotationForLocalDab(
        startPoint,
        null,
        this.activeBrush.rotation_mode,
        this.activeBrush.rotation_jitter,
        0,
      );

      const initialBaseSize =
        this.getPressureAdjustedSizeFromNormalizedPressure(
          initialPressure,
          event.pointerType,
        );
      const initialSize = this.getTaperedSize(
        initialBaseSize,
        this.currentStrokeDistance,
        null,
      );

      this.stampCurrentBrushAtPoint(
        startPoint,
        startRotation,
        true,
        initialSize,
        initialPressure,
      );
      this.pendingStartPoint = null;
    }
  }

  // this is what actually "draws" the brush stroke
  private onMouseMove(event: pixi.FederatedPointerEvent) {
    const localPosition = this.worldContainer.toLocal(event.global);
    this.continueStrokeAt(
      localPosition.x,
      localPosition.y,
      event.pressure,
      event.pointerType,
      event.shiftKey,
      event.altKey,
    );
  }

  private onMouseUp() {
    this.detachWindowStrokeListeners();
    this.activePointerId = null;

    if (
      this.isDrawing === false ||
      this.currentStroke == null ||
      this.currentStrokeLayerId === null
    ) {
      return;
    }

    const isTapOnlyStroke = this.currentStrokeDistance <= 0;

    if (this.currentStroke.children.length === 0 && this.pendingStartPoint) {
      const fallbackPressure = this.getStabilizedPressure(
        this.currentPointerPressure,
        this.currentPointerType,
      );
      const fallbackBaseSize =
        this.getPressureAdjustedSizeFromNormalizedPressure(
          fallbackPressure,
          this.currentPointerType,
        );
      const fallbackSize = isTapOnlyStroke
        ? fallbackBaseSize
        : this.getTaperedSize(
            fallbackBaseSize,
            this.currentStrokeDistance,
            null,
          );

      const fallbackRotation =
        this.activeBrush?.rotation_mode === RotationMode.RANDOM &&
        this.activeBrush
          ? this.getRotationForLocalDab(
              this.pendingStartPoint,
              null,
              this.activeBrush.rotation_mode,
              this.activeBrush.rotation_jitter,
              0,
            )
          : 0;

      this.stampCurrentBrushAtPoint(
        this.pendingStartPoint,
        fallbackRotation,
        true,
        fallbackSize,
        fallbackPressure,
      );
      this.pendingStartPoint = null;
    } else if (isTapOnlyStroke && this.strokePoints.length > 0) {
      const tapPressure = this.getStabilizedPressure(
        this.currentPointerPressure,
        this.currentPointerType,
      );
      const tapSize = this.getPressureAdjustedSizeFromNormalizedPressure(
        tapPressure,
        this.currentPointerType,
      );

      const firstPoint = this.strokePoints[0];
      firstPoint.size = tapSize;
      firstPoint.pressure = tapPressure;

      const firstSprite = this.currentStroke.children[0] as
        | pixi.Sprite
        | undefined;
      if (firstSprite) {
        firstSprite.setSize(tapSize);
      }

      this.syncMirrorPreviewFromStrokePoints();
    }

    if (this.currentStroke.children.length === 0) {
      this.isDrawing = false;
      this.currentStroke.destroy({ children: true });
      this.currentStroke = null;
      this.currentMirrorStrokes.forEach((stroke) =>
        stroke.destroy({ children: true }),
      );
      this.currentMirrorStrokes = [];
      this.currentStrokeLayerId = null;
      this.spacingCarry = 0;
      this.currentStrokeDistance = 0;
      this.pendingStartPoint = null;
      this.shapeStartPoint = null;
      this.rawPointerPosition = null;
      this.smoothedPosition = null;
      return;
    }

    if (
      this.activeTool !== "shapes" &&
      (this.taperInEnabled || this.taperOutEnabled)
    ) {
      this.rebuildCurrentStrokeWithUnifiedTaper();
      this.syncMirrorPreviewFromStrokePoints();
    }

    this.isDrawing = false;

    if (
      this.activeBrush == null ||
      this.brushTexture == null ||
      this.currentStrokeLayerId === null
    ) {
      this.currentStroke.destroy({ children: true });
      this.currentStroke = null;
      this.currentMirrorStrokes.forEach((stroke) =>
        stroke.destroy({ children: true }),
      );
      this.currentMirrorStrokes = [];
      this.currentStrokeLayerId = null;
      this.spacingCarry = 0;
      this.currentStrokeDistance = 0;
      this.pendingStartPoint = null;
      this.shapeStartPoint = null;
      this.rawPointerPosition = null;
      this.smoothedPosition = null;
      this.currentPointerPressure = 1;
      this.currentPointerType = "mouse";
      this.smoothedPressure = 1;
      return;
    }

    const primaryTempId = crypto.randomUUID();
    const historyEntry: StrokeHistoryEntry = [];
    const mirrorSequences = this.getRenderableMirrorTransformSequences(
      this.strokePoints,
    );
    const shouldCreateMirroredStroke = mirrorSequences.length > 0;
    const primaryLocalPoints = this.toLayerLocalStrokePoints(
      this.strokePoints,
      this.currentStrokeLayerId,
    );

    const primaryStroke = this.createCombinedStrokeContainerFromPoints({
      id: primaryTempId,
      layerId: this.currentStrokeLayerId,
      points: primaryLocalPoints,
      texture: this.brushTexture,
      color: this.activeColor,
      opacity: this.activeOpacity,
      isEraser: this.activeErase,
      scale: this.strokeScale,
      rotationMode: this.activeBrush.rotation_mode,
      rotationJitter: this.activeBrush.rotation_jitter,
    });

    if (!this.addStrokeToLayer(primaryStroke)) {
      this.currentStroke.destroy({ children: true });
      this.currentStroke = null;
      this.currentMirrorStrokes.forEach((stroke) =>
        stroke.destroy({ children: true }),
      );
      this.currentMirrorStrokes = [];
      this.currentStrokeLayerId = null;
      this.spacingCarry = 0;
      this.currentStrokeDistance = 0;
      this.pendingStartPoint = null;
      this.shapeStartPoint = null;
      this.rawPointerPosition = null;
      this.smoothedPosition = null;
      this.currentPointerPressure = 1;
      this.currentPointerType = "mouse";
      this.smoothedPressure = 1;
      return;
    }

    historyEntry.push(primaryStroke);
    this.tempStrokes.set(primaryTempId, primaryStroke);

    const outgoingStrokes: StrokeData[] = [
      {
        tempid: primaryTempId,
        points: primaryLocalPoints,
        color: this.activeColor,
        opacity: this.activeOpacity,
        iseraser: this.activeErase,
        scale: this.strokeScale,
        brushid: this.activeBrush.id,
        layerid: this.currentStrokeLayerId,
      },
    ];

    if (shouldCreateMirroredStroke) {
      for (const sequence of mirrorSequences) {
        const mirroredPoints = this.mirrorStrokePoints(
          this.strokePoints,
          sequence,
        );
        const mirroredLocalPoints = this.toLayerLocalStrokePoints(
          mirroredPoints,
          this.currentStrokeLayerId,
        );

        const mirroredTempId = crypto.randomUUID();
        const mirroredStroke = this.createCombinedStrokeContainerFromPoints({
          id: mirroredTempId,
          layerId: this.currentStrokeLayerId,
          points: mirroredLocalPoints,
          texture: this.brushTexture,
          color: this.activeColor,
          opacity: this.activeOpacity,
          isEraser: this.activeErase,
          scale: this.strokeScale,
          rotationMode: this.activeBrush.rotation_mode,
          rotationJitter: this.activeBrush.rotation_jitter,
        });

        if (this.addStrokeToLayer(mirroredStroke)) {
          historyEntry.push(mirroredStroke);
          this.tempStrokes.set(mirroredTempId, mirroredStroke);
          outgoingStrokes.push({
            tempid: mirroredTempId,
            points: mirroredLocalPoints,
            color: this.activeColor,
            opacity: this.activeOpacity,
            iseraser: this.activeErase,
            scale: this.strokeScale,
            brushid: this.activeBrush.id,
            layerid: this.currentStrokeLayerId,
          });
        } else {
          mirroredStroke.destroy({ children: true });
        }
      }
    }

    this.currentStroke.destroy({ children: true });
    this.currentStroke = null;
    this.currentMirrorStrokes.forEach((stroke) =>
      stroke.destroy({ children: true }),
    );
    this.currentMirrorStrokes = [];

    this.undoStack.push(historyEntry);
    this.redoStack = [];

    for (const strokeData of outgoingStrokes) {
      const message: WSMessage = { Mtype: WSType.STROKE, data: strokeData };
      this.ws?.send(message);
    }

    this.onStroke?.(this.activeBrush.id);

    this.currentStrokeLayerId = null;
    this.spacingCarry = 0;
    this.currentStrokeDistance = 0;
    this.pendingStartPoint = null;
    this.shapeStartPoint = null;
    this.rawPointerPosition = null;
    this.smoothedPosition = null;
    this.currentPointerPressure = 1;
    this.currentPointerType = "mouse";
    this.smoothedPressure = 1;
  }

  // RECEIVING STROKE FUNCTIONS ----------------------------------------------------------------------------
  // this is basically just onMouseMove and onMouseUp combined, draws based on the stroke data sent from the original drawer
  private async renderReceivedBrushStroke(strokeData: StrokeGetDto) {
    const layerContainer = this.layerContainers.get(strokeData.layer_id);
    if (!layerContainer) return;

    const receivedBrushTexture = await pixi.Assets.load<pixi.Texture>(
      baseurl + strokeData.brush.imgurl,
    );
    if (!receivedBrushTexture) return;

    const combinedSpriteContainer =
      this.createCombinedStrokeContainerFromPoints({
        id: strokeData.id,
        layerId: strokeData.layer_id,
        points: strokeData.points,
        texture: receivedBrushTexture,
        color: strokeData.color,
        opacity: strokeData.opacity,
        isEraser: strokeData.iseraser,
        scale: strokeData.scale,
        rotationMode: strokeData.brush.rotation_mode,
        rotationJitter: strokeData.brush.rotation_jitter,
      });

    this.strokesMap.set(strokeData.id, combinedSpriteContainer);
    layerContainer.addChild(combinedSpriteContainer);
  }

  private async renderReceivedStroke(strokeData: StrokeGetDto) {
    await this.renderReceivedBrushStroke(strokeData);
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
