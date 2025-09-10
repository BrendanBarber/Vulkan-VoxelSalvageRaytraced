#version 450

// Quad
vec2 positions[3] = vec2[](
	vec2(-1.0, -1.0),
	vec2(3.0, -1.0),
	vec2(-1.0, 3.0)
);

layout(location = 0) out vec2 fragCoord;

void main() {
	vec2 pos = positions[gl_VertexIndex];
	gl_Position = vec4(pos, 0.0, 1.0);

	fragCoord = pos * 0.5 + 0.5;
}