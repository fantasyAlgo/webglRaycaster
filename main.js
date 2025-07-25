//import { vertexShaderSourceCode} from "./vertexShader";
//import { fragmentShaderSourceCode} from "./fragmentShader";
var N_GRID_LINES = 5;
var N_RAYS = 500;
var FOV = Math.PI / 3 + 0.1;
var DISTANCE_CONSTANT = 0.2;
// Useful variables
var dx = 0;
var dy = 0;
var yVelocity = 0.001;
var viewVelocity = 0.03;
var div = 0;
var viewMode = false;
// Create a 10x10 map
var map = [
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
var posToMap = function (x, y) { return [Math.floor(N_GRID_LINES + x * N_GRID_LINES), N_GRID_LINES + Math.floor(y * N_GRID_LINES)]; };
var posToMapWA = function (x, y) { return [N_GRID_LINES + x * N_GRID_LINES, N_GRID_LINES + y * N_GRID_LINES]; };
var mapToPos = function (x, y) { return [(x - N_GRID_LINES) / N_GRID_LINES, (y - N_GRID_LINES) / N_GRID_LINES]; };
var double = function (x) { return [x, x]; };
var Player = /** @class */ (function () {
    function Player(x, y, size, geometryListIndex) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.geometryListIndex = geometryListIndex;
        this.dirX = 0;
        this.dirY = 1;
        this.angle = Math.PI;
    }
    Player.prototype.move = function (dx, dy) {
        this.rotate(-dx);
        if (dy == 0)
            return;
        var front;
        front = dy > 0 ? { dx: this.dirY / 100, dy: -this.dirX / 100 } : { dx: -this.dirY / 100, dy: this.dirX / 100 };
        this.x += front.dx;
        this.y += front.dy;
    };
    Player.prototype.rotate = function (angle) {
        this.angle -= angle;
        this.dirX = Math.cos(this.angle);
        this.dirY = Math.sin(this.angle);
    };
    return Player;
}());
function rayCasting(player, angle) {
    //console.log(player.angle, Math.PI/2 + player.angle, Math.tan(player.angle), Math.tan(Math.PI/2 + player.angle));
    var newAngle = Math.PI + Math.PI / 2 + angle;
    var newDir = { x: Math.cos(newAngle), y: Math.sin(newAngle) };
    var mapPosition = posToMapWA(player.x, player.y);
    var aTan = 1 / Math.tan(newAngle);
    var tan = Math.tan(newAngle);
    var rayStepSize = { x: Math.sqrt(1 + tan * tan), y: Math.sqrt(1 + aTan * aTan) };
    var intStep = [(newDir.x >= 0 ? 1 : -1), (newDir.y >= 0 ? 1 : -1)];
    var vRayLength = { x: newDir.x > 0 ? (Math.floor(mapPosition[0]) + 1 - mapPosition[0]) * rayStepSize.x : (mapPosition[0] - Math.floor(mapPosition[0])) * rayStepSize.x,
        y: newDir.y > 0 ? (Math.floor(mapPosition[1]) + 1 - mapPosition[1]) * rayStepSize.y : (mapPosition[1] - Math.floor(mapPosition[1])) * rayStepSize.y };
    // When the start position in aligned with the grid
    mapPosition[0] = Math.floor(mapPosition[0]);
    mapPosition[1] = Math.floor(mapPosition[1]);
    var found = false;
    var path = [[mapPosition[0], mapPosition[1]]];
    var fDistance = 0.0;
    var maxFDistance = 100.0;
    var side = 0;
    while (!found && fDistance < maxFDistance) {
        if (vRayLength.x < vRayLength.y) {
            vRayLength.x += rayStepSize.x;
            fDistance = vRayLength.x;
            mapPosition[0] += intStep[0];
            side = 0;
        }
        else {
            vRayLength.y += rayStepSize.y;
            fDistance = vRayLength.y;
            mapPosition[1] += intStep[1];
            side = 1;
        }
        path.push([mapPosition[0], mapPosition[1]]);
        found = map[mapPosition[0]][mapPosition[1]] === 1;
    }
    fDistance = (fDistance == vRayLength.x) ? vRayLength.x - rayStepSize.x : vRayLength.y - rayStepSize.y;
    if (fDistance > maxFDistance)
        console.log('Infinite loop');
    var ray = { x: mapPosition[0], y: mapPosition[1], distance: fDistance, angle: angle, side: side };
    return ray;
}
function multipleRayCasting(player) {
    var rays = [];
    var initialAngle = player.angle;
    var step = (FOV / 2) / N_RAYS;
    for (var i = -N_RAYS; i < N_RAYS; i++)
        rays.push(rayCasting(player, initialAngle + i * step));
    return rays;
}
// Shaders
var vertexShaderSourceCode = /*glsl*/ "#version 300 es\n  precision mediump float;\n\n  in vec2 vertexPosition;\n  in vec3 vertexColor;\n\n  out vec3 fragmentColor;\n\n  uniform vec2 canvasSize;\n  uniform vec2 shapeLocation;\n  uniform vec2 shapeSize;\n\n  uniform vec2 u_rotation;\n\n  void main() {\n    fragmentColor = vertexColor;\n    vec2 rotatedVertexPosition = vec2( vertexPosition.x * u_rotation.y + vertexPosition.y * u_rotation.x, \n                                      vertexPosition.y * u_rotation.y - vertexPosition.x * u_rotation.x);\n\n    vec2 finalVertexPosition = rotatedVertexPosition * shapeSize + shapeLocation;\n    vec2 clipPosition = (finalVertexPosition / canvasSize) * 2.0 - 1.0;\n\n    gl_Position = vec4( finalVertexPosition + clipPosition/1000., 0.0, 1.0);\n  }\n";
var fragmentShaderSourceCode = /* glsl*/ "#version 300 es\n  precision mediump float;\n\n  in vec3 fragmentColor;\n  out vec4 outputColor;\n\n  void main() {\n    outputColor = vec4(fragmentColor, 1.0);\n  }\n";
/** Display an error message to the DOM, beneath the demo element */
function showError(errorText) {
    console.error(errorText);
    var errorBoxDiv = document.getElementById('error-box');
    if (errorBoxDiv === null) {
        return;
    }
    var errorElement = document.createElement('p');
    errorElement.innerText = errorText;
    errorBoxDiv.appendChild(errorElement);
}
var trianglePositions = new Float32Array([0, 1, -1, -1, 1, -1]);
var squarePositions = new Float32Array([-1, 1, -1, -1, 1, -1, -1, 1, 1, -1, 1, 1]);
var linePositions = new Float32Array([0, 0, 1, 0]);
var rgbTriangleColors = new Uint8Array([
    255, 0, 0,
    0, 255, 0,
    0, 0, 255,
]);
var graySquareColors = new Uint8Array([
    45, 45, 45,
    45, 45, 45,
    45, 45, 45,
    45, 45, 45,
    45, 45, 45,
    45, 45, 45
]);
var redSquareColors = new Uint8Array([
    255, 0, 0,
    255, 0, 0,
    255, 0, 0,
    255, 0, 0,
    255, 0, 0,
    255, 0, 0
]);
function createStaticVertexBuffer(gl, data) {
    var buffer = gl.createBuffer();
    if (!buffer) {
        showError('Failed to allocate buffer');
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
}
function createTwoBufferVao(gl, positionBuffer, colorBuffer, positionAttribLocation, colorAttribLocation) {
    var vao = gl.createVertexArray();
    if (!vao) {
        showError('Failed to allocate VAO for two buffers');
        return null;
    }
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(positionAttribLocation);
    gl.enableVertexAttribArray(colorAttribLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorAttribLocation, 3, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    return vao;
}
function createInterleavedBufferVao(gl, interleavedBuffer, positionAttribLocation, colorAttribLocation) {
    var vao = gl.createVertexArray();
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
    gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.vertexAttribPointer(colorAttribLocation, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    return vao;
}
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    var program = gl.createProgram();
    if (!vertexShader || !fragmentShader || !program) {
        showError("Failed to allocate GL objects ("
            + "vs=".concat(!!vertexShader, ", ")
            + "fs=".concat(!!fragmentShader, ", ")
            + "program=".concat(!!program, ")"));
        return null;
    }
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        var errorMessage = gl.getShaderInfoLog(vertexShader);
        showError("Failed to compile vertex shader: ".concat(errorMessage));
        return null;
    }
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        var errorMessage = gl.getShaderInfoLog(fragmentShader);
        showError("Failed to compile fragment shader: ".concat(errorMessage));
        return null;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        var errorMessage = gl.getProgramInfoLog(program);
        showError("Failed to link GPU program: ".concat(errorMessage));
        return null;
    }
    return program;
}
function getContext(canvas) {
    var gl = canvas.getContext('webgl2');
    if (!gl) {
        var isWebGl1Supported = !!(document.createElement('canvas')).getContext('webgl');
        if (isWebGl1Supported) {
            throw new Error('WebGL 1 is supported, but not v2 - try using a different device or browser');
        }
        else {
            throw new Error('WebGL is not supported on this device - try using a different device or browser');
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
//
// DEMO
//
function movementAndColorDemo() {
    var canvas = document.getElementById('demo-canvas');
    if (!canvas || !(canvas instanceof HTMLCanvasElement))
        throw new Error('Failed to get demo canvas reference');
    var gl = getContext(canvas);
    var lineBuffer = createStaticVertexBuffer(gl, linePositions);
    var rgblineBuffer = createStaticVertexBuffer(gl, rgbTriangleColors);
    var squareGeoBuffer = createStaticVertexBuffer(gl, squarePositions);
    var graySquareColorsBuffer = createStaticVertexBuffer(gl, graySquareColors);
    var redSquareColorsBuffer = createStaticVertexBuffer(gl, redSquareColors);
    if (!lineBuffer || !rgblineBuffer || !graySquareColorsBuffer || !squareGeoBuffer || !redSquareColorsBuffer) {
        showError("Failed to create vertex buffers (triangle pos=".concat(!!lineBuffer, ",")
            + ", rgb tri color=".concat(!!rgblineBuffer)
            + ", gray square color=".concat(!!graySquareColorsBuffer)
            + "square buffer =".concat(!!squareGeoBuffer, ")")
            + "red square color=".concat(!!redSquareColorsBuffer));
        return null;
    }
    // Get attribute locations
    var movementAndColorProgram = createProgram(gl, vertexShaderSourceCode, fragmentShaderSourceCode);
    if (!movementAndColorProgram) {
        showError('Failed to create Movement and Color WebGL program');
        return;
    }
    var vertexPositionAttributeLocation = gl.getAttribLocation(movementAndColorProgram, 'vertexPosition');
    var vertexColorAttributeLocation = gl.getAttribLocation(movementAndColorProgram, 'vertexColor');
    if (vertexPositionAttributeLocation < 0 || vertexColorAttributeLocation < 0) {
        showError("Failed to get attribute locations: (pos=".concat(vertexPositionAttributeLocation, ",")
            + " color=".concat(vertexColorAttributeLocation, ")"));
        return;
    }
    // Get uniform locations
    var shapeLocationUniform = gl.getUniformLocation(movementAndColorProgram, 'shapeLocation');
    var shapeSizeUniform = gl.getUniformLocation(movementAndColorProgram, 'shapeSize');
    var canvasSizeUniform = gl.getUniformLocation(movementAndColorProgram, 'canvasSize');
    var rotationUniform = gl.getUniformLocation(movementAndColorProgram, 'u_rotation');
    if (shapeLocationUniform === null || shapeSizeUniform === null || canvasSizeUniform === null || rotationUniform === null) {
        showError("Failed to get uniform locations (shapeLocation=".concat(!!shapeLocationUniform)
            + ", shapeSize=".concat(!!shapeSizeUniform)
            + ", canvasSize=".concat(!!canvasSizeUniform, ")"));
        return;
    }
    // Create VAOs
    var rgbLineVAO = createTwoBufferVao(gl, lineBuffer, rgblineBuffer, vertexPositionAttributeLocation, vertexColorAttributeLocation);
    var graySquareVao = createTwoBufferVao(gl, squareGeoBuffer, graySquareColorsBuffer, vertexPositionAttributeLocation, vertexColorAttributeLocation);
    var redSquareVAO = createTwoBufferVao(gl, squareGeoBuffer, redSquareColorsBuffer, vertexPositionAttributeLocation, vertexColorAttributeLocation);
    if (!rgbLineVAO || !graySquareVao || !redSquareVAO) {
        showError("Failed to create VAOs: ("
            + "rgbTriangle=".concat(!!rgbLineVAO, ", ")
            + "graySquare=".concat(!!graySquareVao, ", ")
            + "redSquare=".concat(!!redSquareVAO, ")"));
        return;
    }
    var geometryList = [
        { vao: rgbLineVAO, numVertices: 2, mode: gl.LINES },
        { vao: graySquareVao, numVertices: 6, mode: gl.TRIANGLES },
        { vao: redSquareVAO, numVertices: 6, mode: gl.TRIANGLES }
    ];
    var player = new Player(-0.1, 0, 0.05, 2);
    //gl.lineWidth(50);
    var frame = function () {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.clearColor(0.08, 0.08, 0.08, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(movementAndColorProgram);
        // Set uniforms shared across frame...
        gl.uniform2f(canvasSizeUniform, canvas.width, canvas.height);
        var ray = rayCasting(player, player.angle);
        var inverseRay = rayCasting(player, player.angle + Math.PI);
        // Updating player position
        if (ray.distance / 5 < player.size + 0.01 || inverseRay.distance / 5 < player.size + 0.01)
            player.move(dx, 0);
        else
            player.move(dx, dy);
        if (!viewMode) {
            if (div == 0) {
                console.log(ray, map[ray.x][ray.y], ray.distance);
                console.log("player: ", player.x, player.y, "map: ", posToMap(player.x, player.y));
            }
            // Draw the grid
            for (var i = -N_GRID_LINES; i < N_GRID_LINES; i++) {
                // Horizontal line
                drawShape(gl, [-1, i / N_GRID_LINES], double(2), [0, 1], geometryList[0], shapeSizeUniform, shapeLocationUniform, rotationUniform);
                // Vertical line 
                drawShape(gl, [i / N_GRID_LINES, 1], double(2), [1, 0], geometryList[0], shapeSizeUniform, shapeLocationUniform, rotationUniform);
            }
            //console.log(player.angle)
            // Draw the map
            for (var y = 0; y < N_GRID_LINES * 2; y++)
                for (var x = 0; x < N_GRID_LINES * 2; x++)
                    if (map[x][y] === 1)
                        drawShape(gl, [(1 + 2 * (x - N_GRID_LINES)) / (N_GRID_LINES * 2), (1 + 2 * (y - N_GRID_LINES)) / (N_GRID_LINES * 2)], double(1 / (N_GRID_LINES * 2) - 0.001), [1, 0], geometryList[1], shapeSizeUniform, shapeLocationUniform, rotationUniform);
            drawShape(gl, [player.x, player.y], double(player.size), [0, 1.0], geometryList[player.geometryListIndex], shapeSizeUniform, shapeLocationUniform, rotationUniform);
            // draw the direction
            drawShape(gl, [player.x, player.y], double(ray.distance / 5), [player.dirX, player.dirY], geometryList[0], shapeSizeUniform, shapeLocationUniform, rotationUniform);
            div += 1;
        }
        else {
            var rays = multipleRayCasting(player);
            for (var i = 0; i < N_RAYS * 2; i++) {
                var dist = rays[i].distance * Math.cos(rays[i].angle - player.angle);
                var height = DISTANCE_CONSTANT / (dist / 5);
                drawShape(gl, [(-1 + i / N_RAYS), 0], [2 / (N_RAYS * 2), height], [1, 0], geometryList[2], shapeSizeUniform, shapeLocationUniform, rotationUniform);
            }
        }
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}
try {
    movementAndColorDemo();
}
catch (e) {
    showError("Uncaught JavaScript exception: ".concat(e));
}
// Take keyboard input
document.addEventListener('keydown', function (event) {
    event.preventDefault();
    switch (event.key) {
        case 'ArrowUp':
            dy = yVelocity;
            break;
        case 'ArrowDown':
            dy = -yVelocity;
            break;
        case 'ArrowLeft':
            dx = -viewVelocity;
            break;
        case 'ArrowRight':
            dx = viewVelocity;
            break;
    }
});
// Stop moving when key is released
document.addEventListener('keyup', function (event) {
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
document.addEventListener('mousedown', function (event) {
    if (event.button === 0) {
        div = 0;
    }
});
