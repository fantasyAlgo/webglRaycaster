// src/vertexShader.ts
var vertexShaderSourceCode = (
  /*glsl*/
  `#version 300 es
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
);

// src/fragmentShader.ts
var fragmentShaderSourceCode = (
  /* glsl*/
  `#version 300 es
  precision mediump float;

  in vec3 fragmentColor;
  out vec4 outputColor;

  void main() {
    outputColor = vec4(fragmentColor, 1.0);
  }
`
);

// src/Player.ts
var Player = class {
  size;
  x;
  y;
  geometryListIndex;
  dirX;
  dirY;
  angle;
  constructor(x, y, size, geometryListIndex) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.geometryListIndex = geometryListIndex;
    this.dirX = 0;
    this.dirY = 1;
    this.angle = Math.PI;
  }
  move(dx2, dy2) {
    this.rotate(-dx2);
    if (dy2 == 0) return;
    let front;
    front = dy2 > 0 ? { dx: this.dirY / 100, dy: -this.dirX / 100 } : { dx: -this.dirY / 100, dy: this.dirX / 100 };
    this.x += front.dx;
    this.y += front.dy;
  }
  rotate(angle) {
    this.angle -= angle;
    this.dirX = Math.cos(this.angle);
    this.dirY = Math.sin(this.angle);
  }
};

// src/main.ts
var N_GRID_LINES = 5;
var N_RAYS = 500;
var FOV = Math.PI / 3 + 0.1;
var DISTANCE_CONSTANT = 0.2;
var dx = 0;
var dy = 0;
var yVelocity = 1e-3;
var viewVelocity = 0.03;
var div = 0;
var viewMode = false;
var map = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];
var posToMap = (x, y) => [Math.floor(N_GRID_LINES + x * N_GRID_LINES), N_GRID_LINES + Math.floor(y * N_GRID_LINES)];
var posToMapWA = (x, y) => [N_GRID_LINES + x * N_GRID_LINES, N_GRID_LINES + y * N_GRID_LINES];
var double = (x) => [x, x];
function rayCasting(player, angle) {
  const newAngle = Math.PI + Math.PI / 2 + angle;
  const newDir = { x: Math.cos(newAngle), y: Math.sin(newAngle) };
  let mapPosition = posToMapWA(player.x, player.y);
  const aTan = 1 / Math.tan(newAngle);
  const tan = Math.tan(newAngle);
  const rayStepSize = { x: Math.sqrt(1 + tan * tan), y: Math.sqrt(1 + aTan * aTan) };
  const intStep = [newDir.x >= 0 ? 1 : -1, newDir.y >= 0 ? 1 : -1];
  let vRayLength = {
    x: newDir.x > 0 ? (Math.floor(mapPosition[0]) + 1 - mapPosition[0]) * rayStepSize.x : (mapPosition[0] - Math.floor(mapPosition[0])) * rayStepSize.x,
    y: newDir.y > 0 ? (Math.floor(mapPosition[1]) + 1 - mapPosition[1]) * rayStepSize.y : (mapPosition[1] - Math.floor(mapPosition[1])) * rayStepSize.y
  };
  mapPosition[0] = Math.floor(mapPosition[0]);
  mapPosition[1] = Math.floor(mapPosition[1]);
  let found = false;
  let path = [[mapPosition[0], mapPosition[1]]];
  let fDistance = 0;
  let maxFDistance = 100;
  let side = 0;
  while (!found && fDistance < maxFDistance) {
    if (vRayLength.x < vRayLength.y) {
      vRayLength.x += rayStepSize.x;
      fDistance = vRayLength.x;
      mapPosition[0] += intStep[0];
      side = 0;
    } else {
      vRayLength.y += rayStepSize.y;
      fDistance = vRayLength.y;
      mapPosition[1] += intStep[1];
      side = 1;
    }
    path.push([mapPosition[0], mapPosition[1]]);
    found = map[mapPosition[0]][mapPosition[1]] === 1;
  }
  fDistance = fDistance == vRayLength.x ? vRayLength.x - rayStepSize.x : vRayLength.y - rayStepSize.y;
  if (fDistance > maxFDistance) console.log("Infinite loop");
  const ray = { x: mapPosition[0], y: mapPosition[1], distance: fDistance, angle, side };
  return ray;
}
function multipleRayCasting(player) {
  const rays = [];
  const initialAngle = player.angle;
  const step = FOV / 2 / N_RAYS;
  for (let i = -N_RAYS; i < N_RAYS; i++)
    rays.push(rayCasting(player, initialAngle + i * step));
  return rays;
}
function showError(errorText) {
  console.error(errorText);
  const errorBoxDiv = document.getElementById("error-box");
  if (errorBoxDiv === null) {
    return;
  }
  const errorElement = document.createElement("p");
  errorElement.innerText = errorText;
  errorBoxDiv.appendChild(errorElement);
}
var trianglePositions = new Float32Array([0, 1, -1, -1, 1, -1]);
var squarePositions = new Float32Array([-1, 1, -1, -1, 1, -1, -1, 1, 1, -1, 1, 1]);
var linePositions = new Float32Array([0, 0, 1, 0]);
var rgbTriangleColors = new Uint8Array([
  255,
  0,
  0,
  0,
  255,
  0,
  0,
  0,
  255
]);
var graySquareColors = new Uint8Array([
  45,
  45,
  45,
  45,
  45,
  45,
  45,
  45,
  45,
  45,
  45,
  45,
  45,
  45,
  45,
  45,
  45,
  45
]);
var redSquareColors = new Uint8Array([
  160,
  82,
  45,
  160,
  82,
  45,
  160,
  82,
  45,
  160,
  82,
  45,
  160,
  82,
  45,
  160,
  82,
  45
]);
function createStaticVertexBuffer(gl, data) {
  const buffer = gl.createBuffer();
  if (!buffer) {
    showError("Failed to allocate buffer");
    return null;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
}
function createTwoBufferVao(gl, positionBuffer, colorBuffer, positionAttribLocation, colorAttribLocation) {
  const vao = gl.createVertexArray();
  if (!vao) {
    showError("Failed to allocate VAO for two buffers");
    return null;
  }
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(positionAttribLocation);
  gl.enableVertexAttribArray(colorAttribLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(
    positionAttribLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.vertexAttribPointer(
    colorAttribLocation,
    3,
    gl.UNSIGNED_BYTE,
    true,
    0,
    0
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindVertexArray(null);
  return vao;
}
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertexShader || !fragmentShader || !program) {
    showError(`Failed to allocate GL objects (vs=${!!vertexShader}, fs=${!!fragmentShader}, program=${!!program})`);
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
function getContext(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    const isWebGl1Supported = !!document.createElement("canvas").getContext("webgl");
    if (isWebGl1Supported) {
      throw new Error("WebGL 1 is supported, but not v2 - try using a different device or browser");
    } else {
      throw new Error("WebGL is not supported on this device - try using a different device or browser");
    }
  }
  return gl;
}
function drawShape(gl, position, size, rotation, geometry, shapeSizeUniform, shapeLocationUniform, rotationUniform) {
  gl.uniform2f(shapeSizeUniform, size[0], size[1]);
  gl.uniform2f(shapeLocationUniform, position[0], position[1]);
  gl.uniform2f(rotationUniform, rotation[0], rotation[1]);
  gl.bindVertexArray(geometry.vao);
  gl.drawArrays(geometry.mode, 0, geometry.numVertices);
}
function movementAndColorDemo() {
  const canvas = document.getElementById("demo-canvas");
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) throw new Error("Failed to get demo canvas reference");
  const gl = getContext(canvas);
  const lineBuffer = createStaticVertexBuffer(gl, linePositions);
  const rgblineBuffer = createStaticVertexBuffer(gl, rgbTriangleColors);
  const squareGeoBuffer = createStaticVertexBuffer(gl, squarePositions);
  const graySquareColorsBuffer = createStaticVertexBuffer(gl, graySquareColors);
  const redSquareColorsBuffer = createStaticVertexBuffer(gl, redSquareColors);
  if (!lineBuffer || !rgblineBuffer || !graySquareColorsBuffer || !squareGeoBuffer || !redSquareColorsBuffer) {
    showError(`Failed to create vertex buffers (triangle pos=${!!lineBuffer},, rgb tri color=${!!rgblineBuffer}, gray square color=${!!graySquareColorsBuffer}square buffer =${!!squareGeoBuffer})red square color=${!!redSquareColorsBuffer}`);
    return null;
  }
  const movementAndColorProgram = createProgram(gl, vertexShaderSourceCode, fragmentShaderSourceCode);
  if (!movementAndColorProgram) {
    showError("Failed to create Movement and Color WebGL program");
    return;
  }
  const vertexPositionAttributeLocation = gl.getAttribLocation(movementAndColorProgram, "vertexPosition");
  const vertexColorAttributeLocation = gl.getAttribLocation(movementAndColorProgram, "vertexColor");
  if (vertexPositionAttributeLocation < 0 || vertexColorAttributeLocation < 0) {
    showError(`Failed to get attribute locations: (pos=${vertexPositionAttributeLocation}, color=${vertexColorAttributeLocation})`);
    return;
  }
  const shapeLocationUniform = gl.getUniformLocation(movementAndColorProgram, "shapeLocation");
  const shapeSizeUniform = gl.getUniformLocation(movementAndColorProgram, "shapeSize");
  const canvasSizeUniform = gl.getUniformLocation(movementAndColorProgram, "canvasSize");
  const rotationUniform = gl.getUniformLocation(movementAndColorProgram, "u_rotation");
  if (shapeLocationUniform === null || shapeSizeUniform === null || canvasSizeUniform === null || rotationUniform === null) {
    showError(`Failed to get uniform locations (shapeLocation=${!!shapeLocationUniform}, shapeSize=${!!shapeSizeUniform}, canvasSize=${!!canvasSizeUniform})`);
    return;
  }
  const rgbLineVAO = createTwoBufferVao(
    gl,
    lineBuffer,
    rgblineBuffer,
    vertexPositionAttributeLocation,
    vertexColorAttributeLocation
  );
  const graySquareVao = createTwoBufferVao(
    gl,
    squareGeoBuffer,
    graySquareColorsBuffer,
    vertexPositionAttributeLocation,
    vertexColorAttributeLocation
  );
  const redSquareVAO = createTwoBufferVao(
    gl,
    squareGeoBuffer,
    redSquareColorsBuffer,
    vertexPositionAttributeLocation,
    vertexColorAttributeLocation
  );
  if (!rgbLineVAO || !graySquareVao || !redSquareVAO) {
    showError(
      `Failed to create VAOs: (rgbTriangle=${!!rgbLineVAO}, graySquare=${!!graySquareVao}, redSquare=${!!redSquareVAO})`
    );
    return;
  }
  const geometryList = [
    { vao: rgbLineVAO, numVertices: 2, mode: gl.LINES },
    { vao: graySquareVao, numVertices: 6, mode: gl.TRIANGLES },
    { vao: redSquareVAO, numVertices: 6, mode: gl.TRIANGLES }
  ];
  const player = new Player(-0.1, 0, 0.05, 2);
  const frame = function() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.clearColor(0.08, 0.08, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(movementAndColorProgram);
    gl.uniform2f(canvasSizeUniform, canvas.width, canvas.height);
    const ray = rayCasting(player, player.angle);
    const inverseRay = rayCasting(player, player.angle + Math.PI);
    if (ray.distance / 5 < player.size + 0.01 || inverseRay.distance / 5 < player.size + 0.01) player.move(dx, 0);
    else player.move(dx, dy);
    if (!viewMode) {
      if (div == 0) {
        console.log(ray, map[ray.x][ray.y], ray.distance);
        console.log("player: ", player.x, player.y, "map: ", posToMap(player.x, player.y));
      }
      for (let i = -N_GRID_LINES; i < N_GRID_LINES; i++) {
        drawShape(gl, [-1, i / N_GRID_LINES], double(2), [0, 1], geometryList[0], shapeSizeUniform, shapeLocationUniform, rotationUniform);
        drawShape(gl, [i / N_GRID_LINES, 1], double(2), [1, 0], geometryList[0], shapeSizeUniform, shapeLocationUniform, rotationUniform);
      }
      for (let y = 0; y < N_GRID_LINES * 2; y++)
        for (let x = 0; x < N_GRID_LINES * 2; x++)
          if (map[x][y] === 1)
            drawShape(
              gl,
              [(1 + 2 * (x - N_GRID_LINES)) / (N_GRID_LINES * 2), (1 + 2 * (y - N_GRID_LINES)) / (N_GRID_LINES * 2)],
              double(1 / (N_GRID_LINES * 2) - 1e-3),
              [1, 0],
              geometryList[1],
              shapeSizeUniform,
              shapeLocationUniform,
              rotationUniform
            );
      drawShape(
        gl,
        [player.x, player.y],
        double(player.size),
        [0, 1],
        geometryList[player.geometryListIndex],
        shapeSizeUniform,
        shapeLocationUniform,
        rotationUniform
      );
      drawShape(
        gl,
        [player.x, player.y],
        double(ray.distance / 5),
        [player.dirX, player.dirY],
        geometryList[0],
        shapeSizeUniform,
        shapeLocationUniform,
        rotationUniform
      );
      div += 1;
    } else {
      const rays = multipleRayCasting(player);
      for (let i = 0; i < N_RAYS * 2; i++) {
        const dist = rays[i].distance * Math.cos(rays[i].angle - player.angle);
        const height = DISTANCE_CONSTANT / (dist / 5);
        drawShape(
          gl,
          [-1 + i / N_RAYS, 0],
          [2 / (N_RAYS * 2), height],
          [1, 0],
          geometryList[2],
          shapeSizeUniform,
          shapeLocationUniform,
          rotationUniform
        );
        drawShape(
          gl,
          [-1 + i / N_RAYS, -1],
          [2 / (N_RAYS * 2), Math.max(1 - height, 0)],
          [1, 0],
          geometryList[1],
          shapeSizeUniform,
          shapeLocationUniform,
          rotationUniform
        );
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
document.addEventListener("keydown", (event) => {
  event.preventDefault();
  switch (event.key) {
    case "ArrowUp":
      dy = yVelocity;
      break;
    case "ArrowDown":
      dy = -yVelocity;
      break;
    case "ArrowLeft":
      dx = -viewVelocity;
      break;
    case "ArrowRight":
      dx = viewVelocity;
      break;
  }
});
document.addEventListener("keyup", (event) => {
  event.preventDefault();
  switch (event.key) {
    case " ":
      viewMode = !viewMode;
    case "ArrowUp":
    case "ArrowDown":
      dy = 0;
      break;
    case "ArrowLeft":
    case "ArrowRight":
      dx = 0;
      break;
  }
});
document.addEventListener("mousedown", (event) => {
  if (event.button === 0) {
    div = 0;
  }
});
