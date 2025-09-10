#pragma once
#include <GLFW/glfw3.h>

class InputManager {
public:
	static void initialize(GLFWwindow* window);
	static void shutdown();

	static bool isKeyPressed(int key);
	static bool wasKeyJustPressed(int key);
	static void getMousePosition(double& x, double& y);
	static void getMouseDelta(double& deltaX, double& deltaY);

	static void captureMouse(bool capture);
	static bool isMouseCaptured();

	static void update();

private:
	static GLFWwindow* window;
	static bool mouseCaptured;
	static bool previousKeyStates[GLFW_KEY_LAST + 1];
	static bool currentKeyStates[GLFW_KEY_LAST + 1];

	static void keyCallback(GLFWwindow* window, int key, int scancode, int action, int mods);
	static void mouseButtonCallback(GLFWwindow* window, int button, int action, int mods);
};