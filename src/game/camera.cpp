#include "camera.h"
#include <algorithm>
#include <iostream>

Camera::Camera()
    : position(0.0f, 0.0f, 2.0f)
    , worldUp(0.0f, 1.0f, 0.0f)
    , yaw(-90.0f)      // Point forward initially
    , pitch(0.0f)
    , moveSpeed(2.5f)
    , mouseSensitivity(0.1f)
    , fov(45.0f)
    , nearPlane(0.1f)
    , farPlane(100.0f)
    , firstMouse(true)
    , lastMouseX(400.0f)
    , lastMouseY(300.0f)
{
    updateCameraVectors();
}

void Camera::update(GLFWwindow* window, float deltaTime, bool isMouseCaptured) {
    processKeyboard(window, deltaTime);
    processMouseMovement(window, isMouseCaptured);
}

void Camera::processKeyboard(GLFWwindow* window, float deltaTime) {
    float velocity = moveSpeed * deltaTime;

    // WASD movement
    if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS) {
        position += forward * velocity;
    }
    if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS) {
        position -= forward * velocity;
    }
    if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS) {
        position -= right * velocity;
    }
    if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS) {
        position += right * velocity;
    }

    // Vertical movement
    if (glfwGetKey(window, GLFW_KEY_SPACE) == GLFW_PRESS) {
        position += worldUp * velocity;
    }
    if (glfwGetKey(window, GLFW_KEY_LEFT_SHIFT) == GLFW_PRESS) {
        position -= worldUp * velocity;
    }

    // Speed adjustment
    if (glfwGetKey(window, GLFW_KEY_LEFT_CONTROL) == GLFW_PRESS) {
        velocity *= 0.3f; // Slow mode
    }
}

void Camera::processMouseMovement(GLFWwindow* window, bool isMouseCaptured) {
    if (!isMouseCaptured) {
        firstMouse = true;
        return;
    }

    double mouseX, mouseY;
    glfwGetCursorPos(window, &mouseX, &mouseY);

    if (firstMouse) {
        lastMouseX = static_cast<float>(mouseX);
        lastMouseY = static_cast<float>(mouseY);
        firstMouse = false;
        return;
    }

    float xOffset = static_cast<float>(mouseX) - lastMouseX;
    float yOffset = lastMouseY - static_cast<float>(mouseY);
    lastMouseX = static_cast<float>(mouseX);
    lastMouseY = static_cast<float>(mouseY);

    xOffset *= mouseSensitivity;
    yOffset *= mouseSensitivity;

    yaw += xOffset;
    pitch += yOffset;

    // Constrain pitch to prevent screen flip
    pitch = std::clamp(pitch, -89.0f, 89.0f);

    updateCameraVectors();
}

void Camera::updateCameraVectors() {
    // Calculate the new forward vector
    glm::vec3 newForward;
    newForward.x = cos(glm::radians(yaw)) * cos(glm::radians(pitch));
    newForward.y = sin(glm::radians(pitch));
    newForward.z = sin(glm::radians(yaw)) * cos(glm::radians(pitch));

    forward = glm::normalize(newForward);

    // Calculate right and up vectors
    right = glm::normalize(glm::cross(forward, worldUp));
    up = glm::normalize(glm::cross(right, forward));
}

glm::mat4 Camera::getViewMatrix() const {
    return glm::lookAt(position, position + forward, up);
}

glm::mat4 Camera::getProjectionMatrix(float aspectRatio) const {
    return glm::perspective(glm::radians(fov), aspectRatio, nearPlane, farPlane);
}