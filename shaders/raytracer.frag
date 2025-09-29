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

HitInfo intersectBox(vec3 rayOrigin, vec3 rayDir, vec3 minCorner, vec3 maxCorner, vec3 color) {
    HitInfo info;
    info.hit = false;
    info.color = color;

    vec3 invDir = 1.0 / rayDir;
    vec3 t0 = (minCorner - rayOrigin) * invDir;
    vec3 t1 = (maxCorner - rayOrigin) * invDir;

    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);

    float tNear = max(max(tmin.x, tmin.y), tmin.z);

    float tFar = min(min(tmax.x, tmax.y), tmax.z);

    if (tNear > tFar || tFar < 0.001) {
        // No hit
        return info;
    }

    // Get entry point
    float t = tNear  > 0.001 ? tNear : tFar;

    info.hit = true;
    info.t = t;
    info.position = rayOrigin + t * rayDir;

    // Calculate normal
    vec3 centered = info.position - (minCorner + maxCorner) * 0.5;
    vec3 halfSize = (maxCorner - minCorner) * 0.5;
    vec3 normal = vec3(0.0);
    
    vec3 d = abs(centered / halfSize);
    if (d.x > d.y && d.x > d.z) {
        normal = vec3(sign(centered.x), 0.0, 0.0);
    } else if (d.y > d.z) {
        normal = vec3(0.0, sign(centered.y), 0.0);
    } else {
        normal = vec3(0.0, 0.0, sign(centered.z));
    }
    
    info.normal = normal;

    return info;
}

HitInfo intersectPlane(vec3 rayOrigin, vec3 rayDir, float planeY) {
    HitInfo info;
    info.hit = false;

    if (abs(rayDir.y) < 0.001) {
        // pointing away from plane, no hit
        return info;
    }

    float t = (planeY - rayOrigin.y) / rayDir.y;

    if (t < 0.001) {
        // too close, no hit
        return info;
    }

    info.hit = true;
    info.t = t;
    info.position = rayOrigin + t * rayDir;

    info.normal = vec3(0.0, 1.0, 0.0);

    float checkerSize = 1.0;
    float checkX = floor(info.position.x / checkerSize);
    float checkZ = floor(info.position.z / checkerSize);

    bool isWhite = mod(checkX + checkZ, 2.0) < 1.0;

    info.color = isWhite ? vec3(0.9, 0.9, 0.9) : vec3(0.1, 0.1, 0.1);

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
    
    HitInfo closest;
    closest.hit = false;
    closest.t = 1e10;

    HitInfo planeHit = intersectPlane(rayOrigin, rayDir, -3.0);
    if (planeHit.hit && planeHit.t < closest.t) {
        closest = planeHit;
    }

    HitInfo cubeHit = intersectBox(rayOrigin, rayDir, vec3(-1.0, -1.0, -4.0), vec3(1.0, 1.0, -6.0), vec3(0.3, 0.3, 1.0));
    if (cubeHit.hit && cubeHit.t < closest.t) {
        closest = cubeHit;
    }

    vec3 color;
    if (closest.hit) {
        color = calculateLighting(closest);
    } else {
        // Sky gradient
        float t = 0.5 * (rayDir.y + 1.0);
        color = mix(vec3(1.0), vec3(0.5, 0.7, 1.0), t);
    }
    
    // Gamma correction
    color = pow(color, vec3(1.0/2.2));
    
    outColor = vec4(color, 1.0);
}