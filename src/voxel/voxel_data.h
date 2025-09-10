#pragma once
#include <glm/glm.hpp>
#include <cstdint>

struct Voxel {
    uint8_t material_id;
    // Additional properties for your salvage game
    uint8_t damage_level;
    bool is_valuable_component;
};

struct VoxelChunk {
    static constexpr int CHUNK_SIZE = 32;
    Voxel voxels[CHUNK_SIZE][CHUNK_SIZE][CHUNK_SIZE];
    glm::ivec3 world_position;
};