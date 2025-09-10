#version 450

layout(location = 0) in vec2 fragCoord;
layout(location = 0) out vec4 outColor;

// Uniforms for camera and time
layout(binding = 0) uniform UniformBufferObject {
    mat4 view;
    mat4 proj;
    vec3 cameraPos;
    float time;
    vec2 resolution;
    vec3 cameraForward;
    vec3 cameraRight;
    vec3 cameraUp;
} ubo;

// Simple sphere SDF for testing
float voxelSDF(vec3 p) {
    return length(p) - 1.0; // Sphere with radius 1 at origin
}

// Raymarching function
vec3 raymarch(vec3 rayOrigin, vec3 rayDir) {
    float depth = 0.0;
    vec3 color = vec3(0.0);
    
    for (int i = 0; i < 64; i++) {
        vec3 p = rayOrigin + rayDir * depth;
        float dist = voxelSDF(p);
        
        if (dist < 0.01) {
            // Hit! Calculate simple lighting
            vec3 normal = normalize(vec3(
                voxelSDF(p + vec3(0.01, 0, 0)) - voxelSDF(p - vec3(0.01, 0, 0)),
                voxelSDF(p + vec3(0, 0.01, 0)) - voxelSDF(p - vec3(0, 0.01, 0)),
                voxelSDF(p + vec3(0, 0, 0.01)) - voxelSDF(p - vec3(0, 0, 0.01))
            ));
            
            vec3 lightDir = normalize(vec3(1, 1, 1));
            float lighting = max(dot(normal, lightDir), 0.1);
            
            // Color based on position
            color = mix(vec3(0.8, 0.4, 0.2), vec3(0.2, 0.8, 0.4), sin(p.x + p.y + p.z));
            color *= lighting;
            break;
        }
        
        depth += dist;
        if (depth > 50.0) break; // Max distance
    }
    
    return color;
}

void main() {
    // Convert fragment coord to screen space [-1, 1]
    vec2 uv = (fragCoord * 2.0 - 1.0) * vec2(ubo.resolution.x / ubo.resolution.y, -1.0);
    
    // Manually construct ray direction using camera vectors
    float fov = 45.0; // degrees
    float fovRadians = radians(fov);
    float tanHalfFov = tan(fovRadians * 0.5);
    
    vec3 rayDir = normalize(
        ubo.cameraForward + 
        uv.x * tanHalfFov * ubo.cameraRight + 
        uv.y * tanHalfFov * ubo.cameraUp
    );
    
    vec3 rayOrigin = ubo.cameraPos;
    
    // Perform raymarching
    vec3 color = raymarch(rayOrigin, rayDir);
    
    // Add some fog/atmosphere
    color = mix(color, vec3(0.5, 0.7, 1.0), smoothstep(0.0, 50.0, length(rayOrigin)));
    
    outColor = vec4(color, 1.0);
}