import { Container } from "pixi.js";

export type stringornumber = string | number;

export class Stroke extends Container {
  public id: stringornumber;
  public created_at: string;
  public layerId: number;

  constructor(id: stringornumber, layerId: number) {
    super();
    this.id = id;
    this.layerId = layerId;
  }
}
