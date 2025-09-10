#include "input_manager.h"
#include <cstring>
#include <iostream>

GLFWwindow* InputManager::window = nullptr;
bool InputManager::mouseCaptured = false;
bool InputManager::previousKeyStates[GLFW_KEY_LAST + 1] = {};
bool InputManager::currentKeyStates[GLFW_KEY_LAST + 1] = {};

void InputManager::initialize(GLFWwindow* win) {
	window = win;

	glfwSetKeyCallback(window, keyCallback);
	glfwSetMouseButtonCallback(window, mouseButtonCallback);

	memset(previousKeyStates, false, sizeof(previousKeyStates));
	memset(currentKeyStates, false, sizeof(currentKeyStates));

	captureMouse(true);

	std::cout << "Input Manager initialized\n";
	std::cout << "Controls:\n";
	std::cout << "  WASD - Move\n";
	std::cout << "  Space - Up\n";
	std::cout << "  Shift - Down\n";
	std::cout << "  Ctrl - Slow movement\n";
	std::cout << "  ESC - Release/capture mouse\n";
}

void InputManager::shutdown() {
	if (window) {
		glfwSetKeyCallback(window, nullptr);
		glfwSetMouseButtonCallback(window, nullptr);
	}
}

void InputManager::update() {
	memcpy(previousKeyStates, currentKeyStates, sizeof(currentKeyStates));

	for (int key = 0; key <= GLFW_KEY_LAST; ++key) {
		currentKeyStates[key] = (glfwGetKey(window, key) == GLFW_PRESS);
	}
}

bool InputManager::isKeyPressed(int key) {
	if (key < 0 || key > GLFW_KEY_LAST) return false;
	return currentKeyStates[key];
}

bool InputManager::wasKeyJustPressed(int key) {
	if (key < 0 || key > GLFW_KEY_LAST) return false;
	return currentKeyStates[key] && !previousKeyStates[key];
}

void InputManager::getMousePosition(double& x, double& y) {
	glfwGetCursorPos(window, &x, &y);
}

void InputManager::captureMouse(bool capture) {
	mouseCaptured = capture;
	if (capture) {
		glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_DISABLED);
		std::cout << "Mouse captured (ESC to release)\n";
	}
	else {
		glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_NORMAL);
		std::cout << "Mouse released (click to capture)\n";
	}
}

bool InputManager::isMouseCaptured() {
	return mouseCaptured;
}

void InputManager::keyCallback(GLFWwindow* window, int key, int scancode, int action, int mods) {
	if (action == GLFW_PRESS) {
		switch (key) {
		case GLFW_KEY_ESCAPE:
			captureMouse(!mouseCaptured);
			break;
		}
	}
}

void InputManager::mouseButtonCallback(GLFWwindow* window, int button, int action, int mods) {
	if (button == GLFW_MOUSE_BUTTON_LEFT && action == GLFW_PRESS && !mouseCaptured) {
		captureMouse(true);
	}
}