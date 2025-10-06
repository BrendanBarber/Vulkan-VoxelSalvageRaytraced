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

const float VOXEL_SIZE = 0.05;

struct HitInfo {
    bool hit;
    float t;
    vec3 position;
    vec3 normal;
    vec3 color;
};

HitInfo intersectSphere(vec3 ro, vec3 rd, vec3 center, float radius, vec3 color, bool voxelized) {
    HitInfo info;
    info.hit = false;
    info.color = color;
    
    if (!voxelized) {
        vec3 oc = ro - center;
        float a = dot(rd, rd);
        float b = 2.0 * dot(oc, rd);
        float c = dot(oc, oc) - radius * radius;
        float disc = b * b - 4.0 * a * c;
        
        if (disc > 0.0) {
            float t = (-b - sqrt(disc)) / (2.0 * a);
            if (t > 0.001) {
                info.hit = true;
                info.t = t;
                info.position = ro + t * rd;
                info.normal = normalize(info.position - center);
            }
        }
        return info;
    }
    
    vec3 oc = ro - center;
    float a = dot(rd, rd);
    float b = 2.0 * dot(oc, rd);
    float c = dot(oc, oc) - (radius + VOXEL_SIZE) * (radius + VOXEL_SIZE);
    float disc = b * b - 4.0 * a * c;
    
    if (disc < 0.0) return info;
    
    float tStart = max(0.001, (-b - sqrt(disc)) / (2.0 * a));
    vec3 startPos = ro + tStart * rd;
    
    vec3 voxelPos = floor(startPos / VOXEL_SIZE);
    vec3 step = sign(rd);
    vec3 tDelta = abs(VOXEL_SIZE / rd);
    vec3 tMax = ((voxelPos + max(step, 0.0)) * VOXEL_SIZE - startPos) / rd;
    vec3 normal = vec3(0.0);
    
    for (int i = 0; i < int(radius / VOXEL_SIZE) * 6; i++) {
        vec3 voxelCenter = (voxelPos + 0.5) * VOXEL_SIZE;
        
        if (length(voxelCenter - center) <= radius) {
            vec3 voxelMin = voxelPos * VOXEL_SIZE;
            vec3 t1 = (voxelMin - ro) / rd;
            vec3 t2 = (voxelMin + VOXEL_SIZE - ro) / rd;
            vec3 tmin = min(t1, t2);
            float tNear = max(max(tmin.x, tmin.y), tmin.z);
            
            info.hit = true;
            info.t = max(tNear, tStart);
            info.position = ro + info.t * rd;
            info.normal = normal;
            return info;
        }
        
        if (length(voxelCenter - center) > radius + VOXEL_SIZE * 2.0) break;
        
        if (tMax.x < tMax.y) {
            if (tMax.x < tMax.z) {
                voxelPos.x += step.x;
                tMax.x += tDelta.x;
                normal = vec3(-step.x, 0.0, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        } else {
            if (tMax.y < tMax.z) {
                voxelPos.y += step.y;
                tMax.y += tDelta.y;
                normal = vec3(0.0, -step.y, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        }
    }
    
    return info;
}

HitInfo intersectBox(vec3 ro, vec3 rd, vec3 minC, vec3 maxC, vec3 color, bool voxelized) {
    HitInfo info;
    info.hit = false;
    info.color = color;

    if (voxelized) {
        minC = floor((minC - VOXEL_SIZE * 0.5) / VOXEL_SIZE) * VOXEL_SIZE;
        maxC = ceil((maxC + VOXEL_SIZE * 0.5) / VOXEL_SIZE) * VOXEL_SIZE;
    }

    vec3 t0 = (minC - ro) / rd;
    vec3 t1 = (maxC - ro) / rd;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float tNear = max(max(tmin.x, tmin.y), tmin.z);
    float tFar = min(min(tmax.x, tmax.y), tmax.z);

    if (tNear > tFar || tFar < 0.001) return info;

    float t = tNear > 0.001 ? tNear : tFar;
    info.hit = true;
    info.t = t;
    info.position = ro + t * rd;

    vec3 centered = info.position - (minC + maxC) * 0.5;
    vec3 d = abs(centered / ((maxC - minC) * 0.5));
    info.normal = d.x > d.y && d.x > d.z ? vec3(sign(centered.x), 0.0, 0.0) :
                  d.y > d.z ? vec3(0.0, sign(centered.y), 0.0) :
                  vec3(0.0, 0.0, sign(centered.z));

    return info;
}

HitInfo intersectTorus(vec3 ro, vec3 rd, vec3 center, float majorRadius, float minorRadius, vec3 color, bool voxelized) {
    HitInfo info;
    info.hit = false;
    info.color = color;
    
    ro = ro - center;
    
    if (!voxelized) {
        float t = 0.0;
        for (int i = 0; i < 100; i++) {
            vec3 p = ro + rd * t;
            
            vec2 q = vec2(length(p.xz) - majorRadius, p.y);
            float d = length(q) - minorRadius;
            
            if (d < 0.001) {
                info.hit = true;
                info.t = t;
                info.position = p + center;
                
                vec2 qn = vec2(length(p.xz) - majorRadius, p.y);
                info.normal = normalize(vec3(p.x * qn.x / length(p.xz), qn.y, p.z * qn.x / length(p.xz)));
                
                return info;
            }
            
            t += d;
            if (t > 100.0) break;
        }
        
        return info;
    }
    
    float maxDist = majorRadius + minorRadius;
    float m = dot(ro, ro);
    float n = dot(ro, rd);
    
    float boundingSphere = (maxDist + VOXEL_SIZE) * (maxDist + VOXEL_SIZE);
    float h = n * n - m + boundingSphere;
    
    if (h < 0.0) return info;
    
    float tStart = max(0.001, -n - sqrt(h));
    vec3 startPos = ro + tStart * rd;
    
    vec3 voxelPos = floor(startPos / VOXEL_SIZE);
    vec3 step = sign(rd);
    vec3 tDelta = abs(VOXEL_SIZE / rd);
    vec3 tMax = ((voxelPos + max(step, 0.0)) * VOXEL_SIZE - startPos) / rd;
    vec3 normal = vec3(0.0);
    
    int maxIter = int(maxDist / VOXEL_SIZE) * 8;
    
    for (int i = 0; i < maxIter; i++) {
        vec3 voxelCenter = (voxelPos + 0.5) * VOXEL_SIZE;
        
        float distToAxis = length(voxelCenter.xz);
        float distToTorus = length(vec2(distToAxis - majorRadius, voxelCenter.y));
        
        if (distToTorus <= minorRadius) {
            vec3 voxelMin = voxelPos * VOXEL_SIZE;
            vec3 t1 = (voxelMin - ro) / rd;
            vec3 t2 = (voxelMin + VOXEL_SIZE - ro) / rd;
            vec3 tmin = min(t1, t2);
            float tNear = max(max(tmin.x, tmin.y), tmin.z);
            
            info.hit = true;
            info.t = max(tNear, tStart);
            info.position = ro + info.t * rd + center;
            info.normal = normal;
            return info;
        }
        
        if (length(voxelCenter) > maxDist + VOXEL_SIZE * 2.0) break;
        
        if (tMax.x < tMax.y) {
            if (tMax.x < tMax.z) {
                voxelPos.x += step.x;
                tMax.x += tDelta.x;
                normal = vec3(-step.x, 0.0, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        } else {
            if (tMax.y < tMax.z) {
                voxelPos.y += step.y;
                tMax.y += tDelta.y;
                normal = vec3(0.0, -step.y, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        }
    }
    
    return info;
}

HitInfo intersectPlane(vec3 ro, vec3 rd, float planeY) {
    HitInfo info;
    info.hit = false;

    if (abs(rd.y) < 0.001) return info;

    float t = (planeY - ro.y) / rd.y;
    if (t < 0.001) return info;

    info.hit = true;
    info.t = t;
    info.position = ro + t * rd;
    info.normal = vec3(0.0, 1.0, 0.0);

    vec2 check = floor(info.position.xz);
    info.color = mod(check.x + check.y, 2.0) < 1.0 ? vec3(0.9) : vec3(0.1);

    return info;
}

HitInfo intersectRoundedBox(vec3 ro, vec3 rd, vec3 center, vec3 halfSize, float radius, vec3 color, bool voxelized) {
    HitInfo info;
    info.hit = false;
    info.color = color;
    
    if (!voxelized) {
        ro = ro - center;  // Only translate for non-voxelized
        
        float t = 0.0;
        for (int i = 0; i < 100; i++) {
            vec3 p = ro + rd * t;
            vec3 q = abs(p) - halfSize;
            float d = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - radius;
            
            if (d < 0.001) {
                info.hit = true;
                info.t = t;
                info.position = p + center;
                
                vec3 e = vec3(0.001, 0.0, 0.0);
                vec3 qx = abs(p + e.xyy) - halfSize;
                vec3 qy = abs(p + e.yxy) - halfSize;
                vec3 qz = abs(p + e.yyx) - halfSize;
                float dx = length(max(qx, 0.0)) + min(max(qx.x, max(qx.y, qx.z)), 0.0) - radius;
                float dy = length(max(qy, 0.0)) + min(max(qy.x, max(qy.y, qy.z)), 0.0) - radius;
                float dz = length(max(qz, 0.0)) + min(max(qz.x, max(qz.y, qz.z)), 0.0) - radius;
                
                info.normal = normalize(vec3(dx - d, dy - d, dz - d));
                return info;
            }
            
            t += d;
            if (t > 100.0) break;
        }
        return info;
    }
    
    // Voxelized rounded box
    vec3 oc = ro - center;
    
    // Bounding sphere check
    vec3 maxBound = halfSize + vec3(radius);
    float maxDist = length(maxBound);
    float m = dot(oc, oc);
    float n = dot(oc, rd);
    
    float boundingSphere = (maxDist + VOXEL_SIZE) * (maxDist + VOXEL_SIZE);
    float h = n * n - m + boundingSphere;
    
    if (h < 0.0) return info;
    
    float tStart = max(0.001, -n - sqrt(h));
    vec3 startPos = ro + tStart * rd;
    
    vec3 voxelPos = floor(startPos / VOXEL_SIZE);
    vec3 step = sign(rd);
    vec3 tDelta = abs(VOXEL_SIZE / rd);
    vec3 tMax = ((voxelPos + max(step, 0.0)) * VOXEL_SIZE - startPos) / rd;
    vec3 normal = vec3(0.0);
    
    int maxIter = int(maxDist / VOXEL_SIZE) * 8;
    
    for (int i = 0; i < maxIter; i++) {
        vec3 voxelCenter = (voxelPos + 0.5) * VOXEL_SIZE;
        vec3 voxelCenterLocal = voxelCenter - center;
        
        // Check if voxel center is inside rounded box
        vec3 q = abs(voxelCenterLocal) - halfSize;
        float dist = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - radius;
        
        if (dist <= 0.0) {
            vec3 voxelMin = voxelPos * VOXEL_SIZE;
            vec3 t1 = (voxelMin - ro) / rd;
            vec3 t2 = (voxelMin + VOXEL_SIZE - ro) / rd;
            vec3 tmin = min(t1, t2);
            float tNear = max(max(tmin.x, tmin.y), tmin.z);
            
            info.hit = true;
            info.t = max(tNear, tStart);
            info.position = ro + info.t * rd;
            info.normal = normal;
            return info;
        }
        
        // Early exit if we're too far from the rounded box
        if (length(voxelCenterLocal) > maxDist + VOXEL_SIZE * 2.0) break;
        
        // DDA traversal
        if (tMax.x < tMax.y) {
            if (tMax.x < tMax.z) {
                voxelPos.x += step.x;
                tMax.x += tDelta.x;
                normal = vec3(-step.x, 0.0, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        } else {
            if (tMax.y < tMax.z) {
                voxelPos.y += step.y;
                tMax.y += tDelta.y;
                normal = vec3(0.0, -step.y, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        }
    }
    
    return info;
}

HitInfo intersectCapsule(vec3 ro, vec3 rd, vec3 center, vec3 a, vec3 b, float radius, vec3 color, bool voxelized) {
    HitInfo info;
    info.hit = false;
    info.color = color;
    
    ro = ro - center;
    
    if (!voxelized) {
        vec3 ba = b - a;
        vec3 oa = ro - a;
        
        float baba = dot(ba, ba);
        float bard = dot(ba, rd);
        float baoa = dot(ba, oa);
        float rdoa = dot(rd, oa);
        float oaoa = dot(oa, oa);
        
        float a_coef = baba - bard * bard;
        float b_coef = baba * rdoa - baoa * bard;
        float c_coef = baba * oaoa - baoa * baoa - radius * radius * baba;
        float h = b_coef * b_coef - a_coef * c_coef;
        
        if (h >= 0.0) {
            float t = (-b_coef - sqrt(h)) / a_coef;
            float y = baoa + t * bard;
            
            if (y > 0.0 && y < baba && t > 0.001) {
                info.hit = true;
                info.t = t;
                info.position = ro + t * rd + center;
                info.normal = normalize((oa + t * rd - ba * y / baba));
                return info;
            }
            
            vec3 oc = (y <= 0.0) ? oa : ro - b;
            b_coef = dot(rd, oc);
            c_coef = dot(oc, oc) - radius * radius;
            h = b_coef * b_coef - c_coef;
            
            if (h > 0.0) {
                t = -b_coef - sqrt(h);
                if (t > 0.001) {
                    info.hit = true;
                    info.t = t;
                    info.position = ro + t * rd + center;
                    info.normal = normalize(oc + t * rd);
                }
            }
        }
        
        return info;
    }
    
    // Voxelized capsule
    // Create bounding sphere around capsule to find entry point
    vec3 capsuleCenter = (a + b) * 0.5;
    float capsuleHalfLength = length(b - a) * 0.5;
    float boundingRadius = capsuleHalfLength + radius + VOXEL_SIZE;
    
    vec3 oc = ro - capsuleCenter;
    float a_sphere = dot(rd, rd);
    float b_sphere = 2.0 * dot(oc, rd);
    float c_sphere = dot(oc, oc) - boundingRadius * boundingRadius;
    float disc = b_sphere * b_sphere - 4.0 * a_sphere * c_sphere;
    
    if (disc < 0.0) return info;
    
    float tStart = max(0.001, (-b_sphere - sqrt(disc)) / (2.0 * a_sphere));
    vec3 startPos = ro + tStart * rd;
    
    vec3 voxelPos = floor(startPos / VOXEL_SIZE);
    vec3 step = sign(rd);
    vec3 tDelta = abs(VOXEL_SIZE / rd);
    vec3 tMax = ((voxelPos + max(step, 0.0)) * VOXEL_SIZE - startPos) / rd;
    vec3 normal = vec3(0.0);
    
    float maxDist = length(b - a) + radius;
    for (int i = 0; i < int(maxDist / VOXEL_SIZE) * 6; i++) {
        vec3 voxelCenter = (voxelPos + 0.5) * VOXEL_SIZE;
        
        vec3 pa = voxelCenter - a;
        vec3 ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        float dist = length(pa - ba * h);
        
        if (dist <= radius) {
            vec3 voxelMin = voxelPos * VOXEL_SIZE;
            vec3 t1 = (voxelMin - ro) / rd;
            vec3 t2 = (voxelMin + VOXEL_SIZE - ro) / rd;
            vec3 tmin = min(t1, t2);
            float tNear = max(max(tmin.x, tmin.y), tmin.z);
            
            info.hit = true;
            info.t = max(tNear, tStart);
            info.position = ro + info.t * rd + center;
            info.normal = normal;
            return info;
        }
        
        if (tMax.x < tMax.y) {
            if (tMax.x < tMax.z) {
                voxelPos.x += step.x;
                tMax.x += tDelta.x;
                normal = vec3(-step.x, 0.0, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        } else {
            if (tMax.y < tMax.z) {
                voxelPos.y += step.y;
                tMax.y += tDelta.y;
                normal = vec3(0.0, -step.y, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        }
    }
    
    return info;
}

HitInfo intersectCylinder(vec3 ro, vec3 rd, vec3 center, float height, float radius, vec3 color, bool voxelized) {
    HitInfo info;
    info.hit = false;
    info.color = color;
    
    if (!voxelized) {
        ro = ro - center;  // Only translate for non-voxelized
        
        float t = 0.0;
        for (int i = 0; i < 100; i++) {
            vec3 p = ro + rd * t;
            
            vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(radius, height);
            float dist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
            
            if (dist < 0.001) {
                info.hit = true;
                info.t = t;
                info.position = p + center;
                
                vec3 e = vec3(0.001, 0.0, 0.0);
                vec2 dx = abs(vec2(length((p + e.xyy).xz), (p + e.xyy).y)) - vec2(radius, height);
                vec2 dy = abs(vec2(length((p + e.yxy).xz), (p + e.yxy).y)) - vec2(radius, height);
                vec2 dz = abs(vec2(length((p + e.yyx).xz), (p + e.yyx).y)) - vec2(radius, height);
                
                float distx = min(max(dx.x, dx.y), 0.0) + length(max(dx, 0.0));
                float disty = min(max(dy.x, dy.y), 0.0) + length(max(dy, 0.0));
                float distz = min(max(dz.x, dz.y), 0.0) + length(max(dz, 0.0));
                
                info.normal = normalize(vec3(distx - dist, disty - dist, distz - dist));
                return info;
            }
            
            t += dist;
            if (t > 100.0) break;
        }
        return info;
    }
    
    // Voxelized cylinder
    vec3 oc = ro - center;
    
    // Bounding sphere check
    float maxDist = sqrt(radius * radius + height * height);
    float m = dot(oc, oc);
    float n = dot(oc, rd);
    
    float boundingSphere = (maxDist + VOXEL_SIZE) * (maxDist + VOXEL_SIZE);
    float h = n * n - m + boundingSphere;
    
    if (h < 0.0) return info;
    
    float tStart = max(0.001, -n - sqrt(h));
    vec3 startPos = ro + tStart * rd;
    
    vec3 voxelPos = floor(startPos / VOXEL_SIZE);
    vec3 step = sign(rd);
    vec3 tDelta = abs(VOXEL_SIZE / rd);
    vec3 tMax = ((voxelPos + max(step, 0.0)) * VOXEL_SIZE - startPos) / rd;
    vec3 normal = vec3(0.0);
    
    int maxIter = int(maxDist / VOXEL_SIZE) * 8;
    
    for (int i = 0; i < maxIter; i++) {
        vec3 voxelCenter = (voxelPos + 0.5) * VOXEL_SIZE;
        vec3 voxelCenterLocal = voxelCenter - center;
        
        // Check if voxel center is inside cylinder
        vec2 d = abs(vec2(length(voxelCenterLocal.xz), voxelCenterLocal.y)) - vec2(radius, height);
        float dist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
        
        if (dist <= 0.0) {
            vec3 voxelMin = voxelPos * VOXEL_SIZE;
            vec3 t1 = (voxelMin - ro) / rd;
            vec3 t2 = (voxelMin + VOXEL_SIZE - ro) / rd;
            vec3 tmin = min(t1, t2);
            float tNear = max(max(tmin.x, tmin.y), tmin.z);
            
            info.hit = true;
            info.t = max(tNear, tStart);
            info.position = ro + info.t * rd;
            info.normal = normal;
            return info;
        }
        
        // Early exit if we're too far from the cylinder
        if (length(voxelCenterLocal) > maxDist + VOXEL_SIZE * 2.0) break;
        
        // DDA traversal
        if (tMax.x < tMax.y) {
            if (tMax.x < tMax.z) {
                voxelPos.x += step.x;
                tMax.x += tDelta.x;
                normal = vec3(-step.x, 0.0, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        } else {
            if (tMax.y < tMax.z) {
                voxelPos.y += step.y;
                tMax.y += tDelta.y;
                normal = vec3(0.0, -step.y, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        }
    }
    
    return info;
}

HitInfo intersectEllipsoid(vec3 ro, vec3 rd, vec3 center, vec3 radii, vec3 color, bool voxelized) {
    HitInfo info;
    info.hit = false;
    info.color = color;
    
    if (!voxelized) {
        ro = ro - center;  // Only translate for non-voxelized
        
        vec3 ocn = ro / radii;
        vec3 rdn = rd / radii;
        
        float a = dot(rdn, rdn);
        float b = 2.0 * dot(ocn, rdn);
        float c = dot(ocn, ocn) - 1.0;
        float disc = b * b - 4.0 * a * c;
        
        if (disc > 0.0) {
            float t = (-b - sqrt(disc)) / (2.0 * a);
            if (t > 0.001) {
                info.hit = true;
                info.t = t;
                info.position = ro + t * rd + center;
                vec3 normalEllipsoid = (info.position - center) / (radii * radii);
                info.normal = normalize(normalEllipsoid);
            }
        }
        return info;
    }
    
    // Voxelized ellipsoid
    vec3 oc = ro - center;
    
    // Transform to normalized space with padding for bounding calculation
    vec3 ocn = oc / (radii + VOXEL_SIZE);
    vec3 rdn = rd / (radii + VOXEL_SIZE);
    
    float a = dot(rdn, rdn);
    float b = 2.0 * dot(ocn, rdn);
    float c = dot(ocn, ocn) - 1.0;
    float disc = b * b - 4.0 * a * c;
    
    if (disc < 0.0) return info;
    
    float tStart = max(0.001, (-b - sqrt(disc)) / (2.0 * a));
    vec3 startPos = ro + tStart * rd;
    
    vec3 voxelPos = floor(startPos / VOXEL_SIZE);
    vec3 step = sign(rd);
    vec3 tDelta = abs(VOXEL_SIZE / rd);
    vec3 tMax = ((voxelPos + max(step, 0.0)) * VOXEL_SIZE - startPos) / rd;
    vec3 normal = vec3(0.0);
    
    // Maximum iterations based on largest radius
    float maxRadius = max(max(radii.x, radii.y), radii.z);
    for (int i = 0; i < int(maxRadius / VOXEL_SIZE) * 6; i++) {
        vec3 voxelCenter = (voxelPos + 0.5) * VOXEL_SIZE;
        
        // Check if voxel center is inside ellipsoid (normalized distance check)
        vec3 diff = voxelCenter - center;
        float normalizedDist = length(diff / radii);
        
        if (normalizedDist <= 1.0) {
            vec3 voxelMin = voxelPos * VOXEL_SIZE;
            vec3 t1 = (voxelMin - ro) / rd;
            vec3 t2 = (voxelMin + VOXEL_SIZE - ro) / rd;
            vec3 tmin = min(t1, t2);
            float tNear = max(max(tmin.x, tmin.y), tmin.z);
            
            info.hit = true;
            info.t = max(tNear, tStart);
            info.position = ro + info.t * rd;
            info.normal = normal;
            return info;
        }
        
        // Early exit if we're too far from the ellipsoid
        if (normalizedDist > 1.0 + VOXEL_SIZE * 2.0 / min(min(radii.x, radii.y), radii.z)) break;
        
        // DDA traversal
        if (tMax.x < tMax.y) {
            if (tMax.x < tMax.z) {
                voxelPos.x += step.x;
                tMax.x += tDelta.x;
                normal = vec3(-step.x, 0.0, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        } else {
            if (tMax.y < tMax.z) {
                voxelPos.y += step.y;
                tMax.y += tDelta.y;
                normal = vec3(0.0, -step.y, 0.0);
            } else {
                voxelPos.z += step.z;
                tMax.z += tDelta.z;
                normal = vec3(0.0, 0.0, -step.z);
            }
        }
    }
    
    return info;
}

HitInfo intersectScene(vec3 ro, vec3 rd, bool voxelized) {
    HitInfo closest;
    closest.hit = false;
    closest.t = 1e10;
    
    HitInfo hits[9];
    hits[0] = intersectPlane(ro, rd, -3.0);
    hits[1] = intersectBox(ro, rd, vec3(-0.87, -0.63, -4.12), vec3(0.91, 1.24, -5.88), vec3(1.0, 0.3, 0.3), voxelized);
    hits[2] = intersectSphere(ro, rd, vec3(3.0, 0.0, -5.0), 1.0, vec3(0.3, 0.3, 1.0), voxelized);
    hits[3] = intersectTorus(ro, rd, vec3(-3.0, 0.0, -5.0), 1.0, 0.5, vec3(0.3, 1.0, 0.3), voxelized);
    hits[4] = intersectRoundedBox(ro, rd, vec3(0.0, 2.5, -5.0), vec3(0.6, 0.6, 0.6), 0.2, vec3(1.0, 0.8, 0.2), voxelized);
    hits[6] = intersectCapsule(ro, rd, vec3(5.0, 1.0, -6.0), vec3(0.0, -0.8, 0.0), vec3(0.0, 0.8, 0.0), 0.4, vec3(0.7, 0.2, 0.9), voxelized);
    hits[7] = intersectCylinder(ro, rd, vec3(-6.0, 0.5, -4.0), 0.8, 0.5, vec3(0.2, 0.9, 0.9), voxelized);
    hits[8] = intersectEllipsoid(ro, rd, vec3(6.0, -0.5, -4.5), vec3(0.7, 1.2, 0.5), vec3(0.9, 0.3, 0.6), voxelized);
    
    for (int i = 0; i < 9; i++) {
        if (hits[i].hit && hits[i].t < closest.t) {
            closest = hits[i];
        }
    }
    
    return closest;
}

vec3 randomDirection(vec3 normal, vec2 seed) {
    float a = fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
    float b = fract(sin(dot(seed, vec2(93.9898, 67.345))) * 43758.5453);
    return normalize(normal + normalize(vec3(a * 2.0 - 1.0, abs(b), a * b * 2.0 - 1.0)));
}

vec3 calculateLighting(HitInfo hit, bool voxelized) {
    vec3 lightPos = vec3(5.0, 8.0, 0.0);
    vec3 lightDir = normalize(lightPos - hit.position);
    vec3 viewDir = normalize(ubo.cameraPos - hit.position);
    
    vec3 ambient = 0.2 * hit.color;
    float diff = max(dot(hit.normal, lightDir), 0.0);
    float spec = pow(max(dot(viewDir, reflect(-lightDir, hit.normal)), 0.0), 32.0);
    
    vec3 shadowOrigin = hit.position + hit.normal * 0.001;
    HitInfo shadowHit = intersectScene(shadowOrigin, lightDir, voxelized);
    bool inShadow = shadowHit.hit && shadowHit.t < length(lightPos - hit.position);
    
    return inShadow ? ambient : ambient + diff * hit.color + vec3(0.5) * spec;
}

vec3 traceRay(vec3 ro, vec3 rd, int sampleIndex, bool voxelized) {
    vec3 color = vec3(0.0);
    vec3 throughput = vec3(1.0);
    
    for (int bounce = 0; bounce < 3; bounce++) {
        HitInfo hit = intersectScene(ro, rd, voxelized);
        
        if (!hit.hit) {
            float t = 0.5 * (rd.y + 1.0);
            color += throughput * mix(vec3(1.0), vec3(0.5, 0.7, 1.0), t);
            break;
        }
        
        color += throughput * calculateLighting(hit, voxelized);
        
        throughput *= 0.1 * hit.color;
        if (length(throughput) < 0.01) break;
        
        ro = hit.position + hit.normal * 0.001;
        rd = randomDirection(hit.normal, fragCoord + vec2(bounce, sampleIndex));
    }
    
    return color;
}

void main() {
    vec2 uv = vec2(fragCoord.x, 1.0 - fragCoord.y);
    bool voxelized = uv.x > 0.5;
    
    float aspectRatio = ubo.resolution.x / ubo.resolution.y;
    float fovScale = tan(radians(45.0) * 0.5);
    
    vec3 ro = ubo.cameraPos;
    vec3 rd = normalize(ubo.cameraForward + 
        (-1.0 + 2.0 * uv.x) * aspectRatio * fovScale * ubo.cameraRight + 
        (-1.0 + 2.0 * uv.y) * fovScale * ubo.cameraUp);
    
    vec3 color = vec3(0.0);
    for (int i = 0; i < 4; i++) {
        color += traceRay(ro, rd, i, voxelized);
    }
    
    color = pow(color / 4.0, vec3(1.0/2.2));
    outColor = vec4(color, 1.0);
}