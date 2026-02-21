import { Container } from "pixi.js";

export class Stroke extends Container {
  public id: string;
  public created_at: string;

  constructor(id: string) {
    super();
    this.id = id;
  }
}
