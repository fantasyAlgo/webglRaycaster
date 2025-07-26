export const vertexShaderSourceCode = /*glsl*/ `#version 300 es
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

