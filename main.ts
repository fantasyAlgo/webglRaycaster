
//import { vertexShaderSourceCode} from "./vertexShader";
//import { fragmentShaderSourceCode} from "./fragmentShader";

const N_GRID_LINES = 5;
const N_RAYS = 500;
const FOV = Math.PI/3 + 0.1;
const DISTANCE_CONSTANT = 0.2;

// Useful variables
let dx : number = 0;
let dy : number = 0;
const yVelocity = 0.001;
const viewVelocity = 0.03;
let div = 0;
let viewMode = false;
// Create a 10x10 map
const map: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

let posToMap = (x: number, y: number) => [Math.floor(N_GRID_LINES + x*N_GRID_LINES) , N_GRID_LINES+Math.floor(y*N_GRID_LINES)];
let posToMapWA = (x: number, y: number) => [N_GRID_LINES + x*N_GRID_LINES , N_GRID_LINES+y*N_GRID_LINES];

let mapToPos = (x: number, y: number) => [(x-N_GRID_LINES)/N_GRID_LINES, (y-N_GRID_LINES)/N_GRID_LINES];

let double = (x: number) : [number, number] => [x, x];

class Player {
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

type Ray = {
  x: number;
  y: number;
  distance: number;
  angle: number;
  side: number;
};

function rayCasting(player: Player, angle: number) {
  //console.log(player.angle, Math.PI/2 + player.angle, Math.tan(player.angle), Math.tan(Math.PI/2 + player.angle));
  const newAngle = Math.PI + Math.PI/2 + angle;
  const newDir = {x: Math.cos(newAngle), y: Math.sin(newAngle)};

  let mapPosition = posToMapWA(player.x, player.y);
  const aTan = 1/Math.tan(newAngle);
  const tan = Math.tan(newAngle);
  const rayStepSize = {x: Math.sqrt(1 + tan*tan), y: Math.sqrt(1 + aTan*aTan)};

  const intStep = [(newDir.x >= 0 ? 1 : -1), (newDir.y >= 0 ? 1 : -1)];

  let vRayLength = {x: newDir.x > 0 ? ( Math.floor(mapPosition[0]) + 1 - mapPosition[0] )*rayStepSize.x : (mapPosition[0] - Math.floor(mapPosition[0]))*rayStepSize.x, 
                    y: newDir.y > 0 ? ( Math.floor(mapPosition[1]) + 1 - mapPosition[1] )*rayStepSize.y : (mapPosition[1] - Math.floor(mapPosition[1]))*rayStepSize.y};
  // When the start position in aligned with the grid
  mapPosition[0] = Math.floor(mapPosition[0]);
  mapPosition[1] = Math.floor(mapPosition[1]);
  let found = false;
  let path = [[mapPosition[0], mapPosition[1]]];
  let fDistance = 0.0;
  let maxFDistance = 100.0;
  let side = 0;
  while (!found && fDistance < maxFDistance){
    if (vRayLength.x < vRayLength.y) {
      vRayLength.x += rayStepSize.x;
      fDistance = vRayLength.x;
      mapPosition[0] += intStep[0];
      side = 0;
    }else {
      vRayLength.y += rayStepSize.y;
      fDistance = vRayLength.y;
      mapPosition[1] += intStep[1];
      side = 1;
    }
    path.push([mapPosition[0], mapPosition[1]]);
    found = map[mapPosition[0]][mapPosition[1]] === 1;
  }
  fDistance = (fDistance == vRayLength.x) ? vRayLength.x-rayStepSize.x : vRayLength.y-rayStepSize.y;
  
  if (fDistance > maxFDistance) console.log('Infinite loop');
  const ray : Ray = {x: mapPosition[0], y: mapPosition[1], distance: fDistance, angle: angle, side: side};
  return ray;
}



function multipleRayCasting(player: Player) : Ray[] {
  const rays : Ray[] = [];
  const initialAngle = player.angle;
  const step = (FOV/2)/N_RAYS;
  for (let i = -N_RAYS; i < N_RAYS; i++) 
    rays.push(rayCasting(player, initialAngle+i*step));
  return rays;
}






// Shaders


const vertexShaderSourceCode = /*glsl*/ `#version 300 es
  precision mediump float;

  in vec2 vertexPosition;
  in vec3 vertexColor;

  out vec3 fragmentColor;

  uniform vec2 canvasSize;
  uniform vec2 shapeLocation;
  uniform vec2 shapeSize;

  uniform vec2 u_rotation;

  void main() {
    fragmentColor = vertexColor;
    vec2 rotatedVertexPosition = vec2( vertexPosition.x * u_rotation.y + vertexPosition.y * u_rotation.x, 
                                      vertexPosition.y * u_rotation.y - vertexPosition.x * u_rotation.x);

    vec2 finalVertexPosition = rotatedVertexPosition * shapeSize + shapeLocation;
    vec2 clipPosition = (finalVertexPosition / canvasSize) * 2.0 - 1.0;

    gl_Position = vec4( finalVertexPosition + clipPosition/1000., 0.0, 1.0);
  }
`
const fragmentShaderSourceCode =  /* glsl*/`#version 300 es
  precision mediump float;

  in vec3 fragmentColor;
  out vec4 outputColor;

  void main() {
    outputColor = vec4(fragmentColor, 1.0);
  }
`





/** Display an error message to the DOM, beneath the demo element */
function showError(errorText: string) {
  console.error(errorText);
  const errorBoxDiv = document.getElementById('error-box');
  if (errorBoxDiv === null) {
    return;
  }
  const errorElement = document.createElement('p');
  errorElement.innerText = errorText;
  errorBoxDiv.appendChild(errorElement);
}


const trianglePositions = new Float32Array([ 0, 1, -1, -1, 1, -1 ]);
const squarePositions = new Float32Array([ -1, 1, -1, -1, 1, -1,  -1, 1, 1, -1, 1, 1 ]);

const linePositions = new Float32Array([ 0, 0, 1, 0 ]);

const rgbTriangleColors = new Uint8Array([
  255, 0, 0,
  0, 255, 0,
  0, 0, 255,
]);
const graySquareColors = new Uint8Array([
  45, 45, 45,
  45, 45, 45,
  45, 45, 45,
  45, 45, 45,
  45, 45, 45,
  45, 45, 45
]);
const redSquareColors = new Uint8Array([
  255, 0, 0,
  255, 0, 0,
  255, 0, 0,
  255, 0, 0,
  255, 0, 0,
  255, 0, 0
]);



function createStaticVertexBuffer(gl: WebGL2RenderingContext, data: ArrayBuffer) {
  const buffer = gl.createBuffer();
  if (!buffer) {
    showError('Failed to allocate buffer');
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return buffer;
}

function createTwoBufferVao(
    gl: WebGL2RenderingContext,
    positionBuffer: WebGLBuffer, colorBuffer: WebGLBuffer,
    positionAttribLocation: number, colorAttribLocation: number) {
  const vao = gl.createVertexArray();
  if (!vao) {
    showError('Failed to allocate VAO for two buffers');
    return null;
  }

  gl.bindVertexArray(vao);

  gl.enableVertexAttribArray(positionAttribLocation);
  gl.enableVertexAttribArray(colorAttribLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(
    positionAttribLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.vertexAttribPointer(
    colorAttribLocation, 3, gl.UNSIGNED_BYTE, true, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.bindVertexArray(null);

  return vao;
}

function createInterleavedBufferVao(
    gl: WebGL2RenderingContext, interleavedBuffer: WebGLBuffer,
    positionAttribLocation: number, colorAttribLocation: number) {
  const vao = gl.createVertexArray();
  if (!vao) {
    showError('Failed to allocate VAO for two buffers');
    return null;
  }

  gl.bindVertexArray(vao);

  gl.enableVertexAttribArray(positionAttribLocation);
  gl.enableVertexAttribArray(colorAttribLocation);

  // Interleaved format (all float32):
  // (x, y, r, g, b) (x, y, r, g, b) (x, y, r, g, b)
  gl.bindBuffer(gl.ARRAY_BUFFER, interleavedBuffer);
  gl.vertexAttribPointer(
    positionAttribLocation, 2, gl.FLOAT, false,
    5 * Float32Array.BYTES_PER_ELEMENT,
    0);
  gl.vertexAttribPointer(
    colorAttribLocation, 3, gl.FLOAT, false,
    5 * Float32Array.BYTES_PER_ELEMENT,
    2 * Float32Array.BYTES_PER_ELEMENT);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.bindVertexArray(null);

  return vao;
}

function createProgram(
    gl: WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string) {
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();

  if (!vertexShader || !fragmentShader || !program) {
    showError(`Failed to allocate GL objects (`
      + `vs=${!!vertexShader}, `
      + `fs=${!!fragmentShader}, `
      + `program=${!!program})`);
    return null;
  }

  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    const errorMessage = gl.getShaderInfoLog(vertexShader);
    showError(`Failed to compile vertex shader: ${errorMessage}`);
    return null;
  }

  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    const errorMessage = gl.getShaderInfoLog(fragmentShader);
    showError(`Failed to compile fragment shader: ${errorMessage}`);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const errorMessage = gl.getProgramInfoLog(program);
    showError(`Failed to link GPU program: ${errorMessage}`);
    return null;
  }

  return program;
}

function getContext(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    const isWebGl1Supported = !!(document.createElement('canvas')).getContext('webgl');
    if (isWebGl1Supported) {
      throw new Error('WebGL 1 is supported, but not v2 - try using a different device or browser');
    } else {
      throw new Error('WebGL is not supported on this device - try using a different device or browser');
    }
  }

  return gl;
}
function drawShape(gl: WebGL2RenderingContext, position : [number, number], size : [number, number], rotation : [number, number], geometry, 
                  shapeSizeUniform: WebGLUniformLocation, shapeLocationUniform: WebGLUniformLocation, rotationUniform: WebGLUniformLocation){
  gl.uniform2f(shapeSizeUniform, size[0], size[1]);
  gl.uniform2f(shapeLocationUniform, position[0], position[1]);
  gl.uniform2f(rotationUniform, rotation[0], rotation[1]);
  gl.bindVertexArray(geometry.vao);

  gl.drawArrays(geometry.mode, 0, geometry.numVertices);
}
//
// DEMO
//
function movementAndColorDemo() {
  const canvas = document.getElementById('demo-canvas');
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) throw new Error('Failed to get demo canvas reference');

  const gl = getContext(canvas);

  const lineBuffer = createStaticVertexBuffer(gl, linePositions);
  const rgblineBuffer = createStaticVertexBuffer(gl, rgbTriangleColors);

  const squareGeoBuffer = createStaticVertexBuffer(gl, squarePositions);
  const graySquareColorsBuffer = createStaticVertexBuffer(gl, graySquareColors);
  const redSquareColorsBuffer = createStaticVertexBuffer(gl, redSquareColors);

  if (!lineBuffer || !rgblineBuffer || !graySquareColorsBuffer || !squareGeoBuffer || !redSquareColorsBuffer) {
    showError(`Failed to create vertex buffers (triangle pos=${!!lineBuffer},`
      + `, rgb tri color=${!!rgblineBuffer}`
      + `, gray square color=${!!graySquareColorsBuffer}`
      + `square buffer =${!!squareGeoBuffer})`
      + `red square color=${!!redSquareColorsBuffer}`);

    return null;
  }

  // Get attribute locations
  const movementAndColorProgram = createProgram(gl, vertexShaderSourceCode, fragmentShaderSourceCode);
  if (!movementAndColorProgram) {
    showError('Failed to create Movement and Color WebGL program');
    return;
  }

  const vertexPositionAttributeLocation = gl.getAttribLocation(movementAndColorProgram, 'vertexPosition');
  const vertexColorAttributeLocation = gl.getAttribLocation(movementAndColorProgram, 'vertexColor');
  if (vertexPositionAttributeLocation < 0 || vertexColorAttributeLocation < 0) {
    showError(`Failed to get attribute locations: (pos=${vertexPositionAttributeLocation},`
      + ` color=${vertexColorAttributeLocation})`);
    return;
  }

  // Get uniform locations
  const shapeLocationUniform = gl.getUniformLocation(movementAndColorProgram, 'shapeLocation');
  const shapeSizeUniform = gl.getUniformLocation(movementAndColorProgram, 'shapeSize');
  const canvasSizeUniform = gl.getUniformLocation(movementAndColorProgram, 'canvasSize');
  const rotationUniform = gl.getUniformLocation(movementAndColorProgram, 'u_rotation');
  if (shapeLocationUniform === null || shapeSizeUniform === null || canvasSizeUniform === null || rotationUniform === null) {
    showError(`Failed to get uniform locations (shapeLocation=${!!shapeLocationUniform}`
     + `, shapeSize=${!!shapeSizeUniform}`
     + `, canvasSize=${!!canvasSizeUniform})`);
    return;
  }

  // Create VAOs
  const rgbLineVAO = createTwoBufferVao(
    gl, lineBuffer, rgblineBuffer,
    vertexPositionAttributeLocation, vertexColorAttributeLocation);
  const graySquareVao = createTwoBufferVao(
    gl, squareGeoBuffer, graySquareColorsBuffer,
    vertexPositionAttributeLocation, vertexColorAttributeLocation);
  const redSquareVAO = createTwoBufferVao(gl, squareGeoBuffer, redSquareColorsBuffer, 
    vertexPositionAttributeLocation, vertexColorAttributeLocation);

  if (!rgbLineVAO || !graySquareVao || !redSquareVAO) {
    showError(`Failed to create VAOs: (`
      + `rgbTriangle=${!!rgbLineVAO}, `
      + `graySquare=${!!graySquareVao}, `
      + `redSquare=${!!redSquareVAO})`
      );
    return;
  }

  const geometryList = [
    { vao: rgbLineVAO, numVertices: 2,  mode : gl.LINES},
    { vao: graySquareVao, numVertices: 6, mode : gl.TRIANGLES},
    { vao: redSquareVAO, numVertices: 6, mode : gl.TRIANGLES}
  ];

  const player = new Player(-0.1, 0, 0.05, 2);
  //gl.lineWidth(50);
  const frame = function () {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.clearColor(0.08, 0.08, 0.08, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(movementAndColorProgram);

    // Set uniforms shared across frame...
    gl.uniform2f(canvasSizeUniform, canvas.width, canvas.height);

    const ray = rayCasting(player, player.angle);
    const inverseRay = rayCasting(player, player.angle + Math.PI);
    // Updating player position
    if (ray.distance/5 < player.size+0.01 || inverseRay.distance/5 < player.size+0.01)
      player.move(dx, 0);
    else player.move(dx, dy);
    if (!viewMode){
      if (div == 0){
        console.log(ray, map[ray.x][ray.y], ray.distance);
        console.log("player: ", player.x, player.y, "map: ", posToMap(player.x, player.y));
      }
      // Draw the grid
      for (let i = -N_GRID_LINES; i < N_GRID_LINES; i++) {
        // Horizontal line
        drawShape(gl, [-1, i/N_GRID_LINES], double(2), [0, 1], geometryList[0], shapeSizeUniform, shapeLocationUniform, rotationUniform);
        // Vertical line 
        drawShape(gl, [i/N_GRID_LINES, 1], double(2), [1, 0], geometryList[0], shapeSizeUniform, shapeLocationUniform, rotationUniform);
      }
      //console.log(player.angle)
      // Draw the map
      for (let y = 0; y < N_GRID_LINES*2; y++) 
        for (let x = 0; x < N_GRID_LINES*2; x++) 
          if (map[x][y] === 1) 
            drawShape(gl, [(1+2*(x-N_GRID_LINES))/(N_GRID_LINES*2), (1+2*(y-N_GRID_LINES))/(N_GRID_LINES*2)], 
              double(1/(N_GRID_LINES*2)-0.001), [1, 0], geometryList[1], shapeSizeUniform, shapeLocationUniform, rotationUniform);
      
      drawShape(gl, [player.x, player.y], double(player.size), 
        [0, 1.0], geometryList[player.geometryListIndex], shapeSizeUniform, shapeLocationUniform, rotationUniform);

      // draw the direction
      drawShape(gl, [player.x, player.y], double(ray.distance/5), 
        [player.dirX, player.dirY], geometryList[0], shapeSizeUniform, shapeLocationUniform, rotationUniform);

      div += 1;
    }else{
      const rays = multipleRayCasting(player);
      for (let i = 0; i < N_RAYS*2; i++) {
        const dist = rays[i].distance*Math.cos(rays[i].angle - player.angle);
        const height = DISTANCE_CONSTANT/(dist/5);
        drawShape(gl, [(-1+i/N_RAYS), 0], [2/(N_RAYS*2), height],
          [1, 0], geometryList[2], shapeSizeUniform, shapeLocationUniform, rotationUniform);
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

try {
  movementAndColorDemo();
} catch (e) {
  showError(`Uncaught JavaScript exception: ${e}`);
}

// Take keyboard input
document.addEventListener('keydown', (event) => {
  event.preventDefault();
  switch (event.key) {
    case 'ArrowUp':
      dy = yVelocity
      break;
    case 'ArrowDown':
      dy = -yVelocity
      break;
    case 'ArrowLeft':
      dx = -viewVelocity
      break;
    case 'ArrowRight':
      dx = viewVelocity
      break;
  }
});
// Stop moving when key is released
document.addEventListener('keyup', (event) => {
  event.preventDefault();
  switch (event.key) {
    case ' ':
      viewMode = !viewMode;
    case 'ArrowUp':
    case 'ArrowDown':
      dy = 0;
      break;
    case 'ArrowLeft':
    case 'ArrowRight':
      dx = 0;
      break;
  }
});

document.addEventListener('mousedown', (event) => {
  if (event.button === 0) {
    div = 0;
  }
});
