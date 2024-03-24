function showError(errorText: string) {
    const errorBoxDiv = document.getElementById('error-box');
    if (errorBoxDiv == null) {
        console.error('Error box not found');
        return;
    }
    const errorSpan = document.createElement('p');
    errorSpan.innerText = errorText;
    errorBoxDiv.appendChild(errorSpan);
    console.error(errorText);
}

function drawTriangle(gl: WebGL2RenderingContext, shapeLocation, shapeScale, pos: [number, number], 
    scale: number, colorBuffer: WebGLBuffer) {

    // Finally drawing the triangle
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(1, 3, gl.UNSIGNED_BYTE, true, 0, 0);

    gl.uniform2f(shapeLocation, pos[0], pos[1]);
    gl.uniform1f(shapeScale, scale);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function makeStaticBuffer(gl: WebGL2RenderingContext, data: ArrayBuffer) {
    const buffer = gl.createBuffer();
    if (buffer == null) {throw new Error('Buffer not created');}
    // Put the buffer into the GPU memory
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // Send data into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
}
function createTwoBufferVao(gl, positionBuffer: WebGLBuffer, colorBuffer: WebGLBuffer, positionBufferIndex: number, colorBufferIndex: number) {
    const vao = gl.createVertexArray();
    if (vao == null) {throw new Error('Vertex array not created');}
    gl.bindVertexArray(vao);

    gl.enableVertexAttribArray(positionBufferIndex);
    gl.enableVertexAttribArray(colorBufferIndex);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionBufferIndex, 2, gl.FLOAT, true, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorBufferIndex, 3, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindVertexArray(null);
    return vao;
}

class MovingShape {
    constructor(public pos: [number, number], public vel: [number, number], public size: number) {}
    update(dt: number) {
        this.pos[0] += this.vel[0]*dt;
        this.pos[1] += this.vel[1]*dt;
    }

}

const vertexShaderSource = `#version 300 es
precision mediump float;

in vec2 vertexPosition;
in vec3 vertexColor;

out vec3 fragmentColor;

uniform vec2 canvasSize;
uniform vec2 shapeLocation;
uniform float shapeScale;

void main() {
    fragmentColor = vertexColor;
    vec2 finalVertexPosition = vertexPosition * shapeScale + shapeLocation;
    vec2 clipPos = (finalVertexPosition / canvasSize)*2.0 - 1.0;
    gl_Position = vec4(clipPos, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;

in vec3 fragmentColor;
out vec4 fragColor;
void main() {
    fragColor = vec4(fragmentColor, 1.0);
}
`;

const triangleVertices =  new Float32Array([0.0, 0.5,   0.5, -0.5,   -0.5, -0.5]);
const rgbTriangle = new Uint8Array([255, 0, 0,   0, 255, 0,   0, 0, 255]);
const fireyTriangle = new Uint8Array([229, 47, 15, 
                                      246, 206, 29,   
                                      233, 154, 26]);

function main(){
    const canvas = document.getElementById("demo-canvas");
    if (canvas == null || !(canvas instanceof HTMLCanvasElement)) {console.error('Canvas not found'); return;}
    const gl = canvas.getContext("webgl2");
    if (gl == null) {console.error('WebGL not supported'); return;}

    const triangleGPUBuffer = makeStaticBuffer(gl, triangleVertices);
    const colorBuffer = makeStaticBuffer(gl, rgbTriangle);
    const fireyColorBuffer = makeStaticBuffer(gl, fireyTriangle);

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (vertexShader == null) {console.error('Vertex shader not created'); return;}

    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        showError('Error compiling vertex shader: ' + gl.getShaderInfoLog(vertexShader));
        return;
    }
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (fragmentShader == null) {console.error('Fragment shader not created'); return;}
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        showError('Error compiling fragment shader: ' + gl.getShaderInfoLog(fragmentShader));
        return;
    }

    const shaderProgram = gl.createProgram();
    if (shaderProgram == null) {console.error('Shader program not created'); return;}
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    //const rgbTriangleVao = createTwoBufferVao(gl, triangleGPUBuffer, colorBuffer, 0, 1);

    const shapeLocation = gl.getUniformLocation(shaderProgram, 'shapeLocation');
    const shapeScale = gl.getUniformLocation(shaderProgram, 'shapeScale');
    const canvasSize = gl.getUniformLocation(shaderProgram, 'canvasSize');

    const triangle1 = new MovingShape([400, 500], [50, 5], 100);
    const triangle2 = new MovingShape([200, 400], [-50, 5], 200);

    let i = 0;
    let lastTime = performance.now();
    const frame = function(){
        i += 0.1;
        const currentTime = performance.now();
        const dt = (currentTime - lastTime)/2000;
        lastTime = currentTime;

        triangle1.update(dt);
        triangle2.update(dt);

        // output merger canvas.width restore stuff
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        
        gl.clearColor(0.08, 0.08, 0.08, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // rasterizer
        gl.viewport(0, 0, canvas.width, canvas.height);
        // set GPU program
        gl.useProgram(shaderProgram);
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);

        // input assembler
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleGPUBuffer);
        // index = 0, size = 2, type of the buffer = float, normalize = false, stride = 0, offset = 0
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        // setting the canvas size, the rest is done by the drawTriangle function
        gl.uniform2f(canvasSize, canvas.width, canvas.height);

        drawTriangle(gl, shapeLocation, shapeScale, triangle1.pos, 100, fireyColorBuffer);
        drawTriangle(gl, shapeLocation, shapeScale, triangle2.pos, 200, colorBuffer);
        gl.disableVertexAttribArray(0);

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

try {
    main();
    console.log('Main function executed successfully');
} catch (e) {
    showError(e);
}