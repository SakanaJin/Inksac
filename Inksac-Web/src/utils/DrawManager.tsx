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
  private isDrawing = false;
  private strokePoints: StrokePoint[] = [];

  private brushTexture: pixi.Texture | null = null;
  private activeBrush: BrushGetDto | null = null;
  private activeColor: string = "#ffffffff";
  private activeOpacity: number = 1;
  private activeErase: boolean = false;
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

  private activePointerId: number | null = null;

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
    );
  };

  private handleWindowPointerUp = (event: PointerEvent) => {
    if (
      this.activePointerId !== null &&
      event.pointerId !== this.activePointerId
    ) {
      return;
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

    const brushSprite = this.createBrushSprite(
      this.brushTexture,
      point,
      this.activeColor,
      this.activeOpacity,
      size,
      rotation,
    );

    this.currentStroke.addChild(brushSprite);

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

  private continueStrokeAt(
    x: number,
    y: number,
    pressure: number,
    pointerType: string,
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
    if (this.activeErase) this.currentStroke.blendMode = "erase";
    layerContainer.addChild(this.currentStroke);

    this.attachWindowStrokeListeners();

    const startPoint = { x: localPosition.x, y: localPosition.y };

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
    }

    if (this.currentStroke.children.length === 0) {
      this.isDrawing = false;
      this.currentStroke.destroy({ children: true });
      this.currentStroke = null;
      this.currentStrokeLayerId = null;
      this.spacingCarry = 0;
      this.currentStrokeDistance = 0;
      this.pendingStartPoint = null;
      this.rawPointerPosition = null;
      this.smoothedPosition = null;
      return;
    }

    if (this.taperInEnabled || this.taperOutEnabled) {
      this.rebuildCurrentStrokeWithUnifiedTaper();
    }

    this.isDrawing = false;
    const tempid = crypto.randomUUID();

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
      this.spacingCarry = 0;
      this.pendingStartPoint = null;
      this.rawPointerPosition = null;
      this.smoothedPosition = null;
      return;
    }

    layerContainer.addChild(combinedSpriteContainer);

    this.currentStroke.destroy({ children: true });
    this.currentStroke = null;

    this.undoStack.push(combinedSpriteContainer);
    this.redoStack = [];
    this.tempStrokes.set(tempid, combinedSpriteContainer);

    const strokeData: StrokeData = {
      tempid,
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
    this.ws?.send(message);

    this.currentStrokeLayerId = null;
    this.spacingCarry = 0;
    this.currentStrokeDistance = 0;
    this.pendingStartPoint = null;
    this.rawPointerPosition = null;
    this.smoothedPosition = null;
    this.currentPointerPressure = 1;
    this.currentPointerType = "mouse";
    this.smoothedPressure = 1;
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
    if (strokeData.iseraser) receivedStroke.blendMode = "erase";

    for (let i = 0; i < strokeData.points.length; i++) {
      const point = strokeData.points[i];
      const rotation = this.getRotationForReceivedDab(
        point,
        i,
        strokeData.points,
        strokeData.brush.rotation_mode,
        strokeData.brush.rotation_jitter,
      );

      const brushSprite = this.createBrushSprite(
        receivedBrushTexture,
        point,
        strokeData.color,
        strokeData.opacity,
        point.size ?? strokeData.scale,
        rotation,
      );

      receivedStroke.addChild(brushSprite);
    }

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
