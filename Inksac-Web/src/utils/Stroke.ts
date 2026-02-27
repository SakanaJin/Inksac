import { Container } from "pixi.js";

export type stringornumber = string | number;

export class Stroke extends Container {
  public id: stringornumber;
  public created_at: string;

  constructor(id: stringornumber) {
    super();
    this.id = id;
  }
}
