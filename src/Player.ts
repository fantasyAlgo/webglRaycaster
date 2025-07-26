export class Player {
  size: number;
  x: number;
  y: number;
  geometryListIndex: number;

  dirX: number;
  dirY: number;
  angle: number;
  constructor(x: number, y: number, size: number, geometryListIndex: number) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.geometryListIndex = geometryListIndex;
    this.dirX = 0;
    this.dirY = 1;
    this.angle = Math.PI;
  }
  move(dx: number, dy: number) {
    this.rotate(-dx);
    if (dy == 0) return;
    let front : {dx: number, dy: number};
    front = dy > 0 ? {dx: this.dirY/100, dy: -this.dirX/100} : {dx: -this.dirY/100, dy: this.dirX/100};
    this.x += front.dx;
    this.y += front.dy;

  }
  rotate(angle: number) {
    this.angle -= angle;
    this.dirX = Math.cos(this.angle);
    this.dirY = Math.sin(this.angle);
  }
}

export type Ray = {
  x: number;
  y: number;
  distance: number;
  angle: number;
  side: number;
};
