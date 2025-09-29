#version 450
layout(location = 0) in vec2 fragCoord;
layout(location = 0) out vec4 outColor;

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

// Hit information
struct HitInfo {
    bool hit;
    float t;
    vec3 position;
    vec3 normal;
    vec3 color;
};

// Sphere intersection
HitInfo intersectSphere(vec3 rayOrigin, vec3 rayDir, vec3 center, float radius, vec3 color) {
    HitInfo info;
    info.hit = false;
    info.color = color;
    
    vec3 oc = rayOrigin - center;
    float a = dot(rayDir, rayDir);
    float b = 2.0 * dot(oc, rayDir);
    float c = dot(oc, oc) - radius * radius;
    float discriminant = b * b - 4.0 * a * c;
    
    if (discriminant > 0.0) {
        float t = (-b - sqrt(discriminant)) / (2.0 * a);
        if (t > 0.001) {
            info.hit = true;
            info.t = t;
            info.position = rayOrigin + t * rayDir;
            info.normal = normalize(info.position - center);
        }
    }
    
    return info;
}

// Calculate lighting
vec3 calculateLighting(HitInfo hit) {
    vec3 lightPos = vec3(5.0, 8.0, 0.0);
    vec3 lightDir = normalize(lightPos - hit.position);
    
    // Ambient
    vec3 ambient = 0.2 * hit.color;
    
    // Diffuse
    float diff = max(dot(hit.normal, lightDir), 0.0);
    vec3 diffuse = diff * hit.color;
    
    // Specular
    vec3 viewDir = normalize(ubo.cameraPos - hit.position);
    vec3 reflectDir = reflect(-lightDir, hit.normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = vec3(0.5) * spec;
    
    return ambient + diffuse + specular;
}

void main() {
    // Pixel coordinates from 0 to 1 (flip Y)
    vec2 uv = vec2(fragCoord.x, 1.0 - fragCoord.y);
    
    float aspectRatio = ubo.resolution.x / ubo.resolution.y;
    float fovScale = tan(radians(45.0) * 0.5);
    
    // Generate ray direction
    vec3 rayOrigin = ubo.cameraPos;
    vec3 rayDir = normalize(
        ubo.cameraForward + 
        (-1.0 + 2.0 * uv.x) * aspectRatio * fovScale * ubo.cameraRight + 
        (-1.0 + 2.0 * uv.y) * fovScale * ubo.cameraUp
    );
    
    HitInfo hit = intersectSphere(rayOrigin, rayDir, vec3(0.0, 0.0, -5.0), 1.0, vec3(1.0, 0.3, 0.3));
    
    vec3 color;
    if (hit.hit) {
        color = calculateLighting(hit);
    } else {
        // Sky gradient
        float t = 0.5 * (rayDir.y + 1.0);
        color = mix(vec3(1.0), vec3(0.5, 0.7, 1.0), t);
    }
    
    // Gamma correction
    color = pow(color, vec3(1.0/2.2));
    
    outColor = vec4(color, 1.0);
}