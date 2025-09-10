#pragma once
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <GLFW/glfw3.h>

class Camera {
public:
	Camera();

	void update(GLFWwindow* window, float deltaTime, bool isMouseCaptued);

	glm::mat4 getViewMatrix() const;
	glm::mat4 getProjectionMatrix(float aspectRatio) const;

	glm::vec3 getPosition() const { return position; }
	glm::vec3 getForward() const { return forward; }
	glm::vec3 getRight() const { return right; }
	glm::vec3 getUp() const { return up; }

	void setPosition(const glm::vec3& pos) { position = pos; }
	void setSpeed(float newSpeed) { moveSpeed = newSpeed; }
	void setSensitivity(float newSens) { mouseSensitivity = newSens; }

private:
	glm::vec3 position;
	glm::vec3 forward;
	glm::vec3 right;
	glm::vec3 up;
	glm::vec3 worldUp;

	float yaw;
	float pitch;

	float moveSpeed;
	float mouseSensitivity;
	float fov;
	float nearPlane;
	float farPlane;

	bool firstMouse;
	float lastMouseX;
	float lastMouseY;

	void updateCameraVectors();
	void processKeyboard(GLFWwindow* window, float deltaTime);
	void processMouseMovement(GLFWwindow* window, bool isMouseCaptured);
};