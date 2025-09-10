#include <iostream>
#include <stdexcept>
#include <cstdlib>
#include <chrono>
#include "graphics/vulkan_renderer.h"
#include "game/camera.h"
#include "game/input_manager.h"

class VoxelSalvageGame {
public:
    void run() {
        initWindow();
        initInput();
        initVulkan();
        mainLoop();
        cleanup();
    }

private:
    GLFWwindow* window;
    VulkanRenderer renderer;
    Camera camera;
    const uint32_t WIDTH = 1920;
    const uint32_t HEIGHT = 1080;

    std::chrono::high_resolution_clock::time_point lastFrameTime;

    void initWindow() {
        glfwInit();
        glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API);
        glfwWindowHint(GLFW_RESIZABLE, GLFW_FALSE);

        window = glfwCreateWindow(WIDTH, HEIGHT, "Voxel Salvage", nullptr, nullptr);

        const GLFWvidmode* mode = glfwGetVideoMode(glfwGetPrimaryMonitor());
        glfwSetWindowPos(window,
            (mode->width - WIDTH) / 2,
            (mode->height - HEIGHT) / 2);
        
        lastFrameTime = std::chrono::high_resolution_clock::now();
    }

    void initInput() {
        InputManager::initialize(window);

        camera.setPosition(glm::vec3(0.0f, 0.0f, 2.0f));
        camera.setSpeed(3.0f);
        camera.setSensitivity(0.15f);
    }

    void initVulkan() {
        renderer.initialize(window, &camera);
    }

    void mainLoop() {
        std::cout << "\n=== Game Loop Started ===\n";
        std::cout << "Use WASD to move, mouse to look around\n";
        std::cout << "ESC to toggle mouse capture\n\n";

        while (!glfwWindowShouldClose(window)) {
            auto currentTime = std::chrono::high_resolution_clock::now();
            float deltaTime = std::chrono::duration<float>(currentTime - lastFrameTime).count();
            lastFrameTime = currentTime;

            deltaTime = std::min(deltaTime, 0.1f);

            glfwPollEvents();

            InputManager::update();

            camera.update(window, deltaTime, InputManager::isMouseCaptured());

            renderer.render();

            static int frameCount = 0;
            static float fpsTimer = 0.0f;
            frameCount++;
            fpsTimer += deltaTime;

            if (fpsTimer >= 1.0f) {
                std::cout << "FPS: " << frameCount << " | Pos: ("
                    << camera.getPosition().x << ", "
                    << camera.getPosition().y << ", "
                    << camera.getPosition().z << ")\r" << std::flush;
                frameCount = 0;
                fpsTimer = 0.0f;
            }
        }
    }

    void cleanup() {
        InputManager::shutdown();
        renderer.cleanup();
        glfwDestroyWindow(window);
        glfwTerminate();
    }
};

int main() {
    VoxelSalvageGame game;

    try {
        game.run();
    }
    catch (const std::exception& e) {
        std::cerr << e.what() << std::endl;
        return EXIT_FAILURE;
    }

    return EXIT_SUCCESS;
}