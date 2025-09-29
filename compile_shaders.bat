@echo off
echo Compiling shaders...

if not exist shaders mkdir shaders

glslc shaders/quad.vert -o shaders/quad.vert.spv
if %errorlevel% neq 0 (
    echo Failed to compile vertex shader
    exit /b 1
)
echo Vertex shader compiled successfully

glslc shaders/raytracer.frag -o shaders/raytracer.frag.spv
if %errorlevel% neq 0 (
    echo Failed to compile fragment shader
    exit /b 1
)
echo Fragment shader compiled successfully

echo All shaders compiled successfully!