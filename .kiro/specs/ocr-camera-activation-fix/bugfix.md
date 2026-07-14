# Bugfix Requirements Document

## Introduction

This document specifies the requirements for fixing the camera activation failure in the OCR verification component. The bug causes the component to remain in a loading state indefinitely because the camera cannot be activated, preventing users from proceeding with document verification.

**Impact:** Users cannot complete OCR verification as the camera never activates, leaving them stuck on a loading screen with no feedback about the failure cause.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the device does not have an environment-facing camera OR the browser cannot guarantee the exact facingMode THEN the camera activation fails with a MediaDevicesError and the component stays in loading state indefinitely

1.2 WHEN getUserMedia is called with { exact: 'environment' } constraint AND the constraint cannot be satisfied THEN the promise rejects immediately without fallback behavior

1.3 WHEN camera access fails due to permission issues THEN the error message is only logged to console and the component continues showing "Activating camera..." without user notification

### Expected Behavior (Correct)

2.1 **Flexible Camera Activation on Component Load**

**User Story:** As a user, I want the camera to activate automatically when the OCR component loads, so that I can start capturing my document immediately without manual intervention.

**Acceptance Criteria:**

2.1.1 WHEN the OCR component loads THEN the system SHALL attempt to activate the camera with a facingMode constraint set to `{ ideal: ['user', 'environment'] }` and wait up to 3 seconds for camera access

2.1.2 IF camera activation fails THEN the system SHALL display an error message indicating camera access is required and provide a retry mechanism

2.1.3 IF the facingMode constraint uses "exact" value THEN the system SHALL NOT use that constraint value

2.1.4 WHEN the camera feed becomes available THEN the system SHALL render the video element with visible content within 5 seconds of component load

2.1.5 WHEN camera permissions are denied THEN the system SHALL display a prompt instructing the user to enable camera permissions in browser settings

---

2.2 **Graceful Fallback for FacingMode Constraint**

**User Story:** As a user with a device that doesn't have an environment-facing camera, I want the system to use any available camera, so that I can still complete document verification.

**Acceptance Criteria:**

2.2.1 WHEN the exact facingMode constraint cannot be satisfied THEN the system SHALL fall back to any available camera without throwing an error

2.2.2 The fallback mechanism SHALL attempt cameras in this order: environment → user → any available

2.2.3 IF the exact facingMode constraint cannot be satisfied THEN the system SHALL NOT reject the promise

2.2.4 IF no cameras are available THEN the system SHALL display an error message and retry option

2.2.5 WHEN attempting camera activation with fallback THEN each attempt SHALL have a timeout of 3000ms

2.2.6 WHEN attempting camera activation THEN the system SHALL NOT exceed 3 total attempts per session

---

2.3 **User-Friendly Error Display with Retry**

**User Story:** As a user, I want to see a clear error message when the camera fails to activate, with an option to retry, so that I understand what went wrong and can try again.

**Acceptance Criteria:**

2.3.1 WHEN camera activation fails THEN the system SHALL display an error message that describes the failure in plain language with a corresponding retry button within the same UI region

2.3.2 The error message SHALL NOT contain technical error codes, stack traces, or developer-focused terminology

2.3.3 The error message SHALL map to one of the following categories with exact message text:
  - Permission denied: "Camera access was denied. Please allow camera access and try again."
  - No camera found: "No camera detected on this device. Please use a device with a camera."
  - Device in use: "Camera is in use by another application. Please close other apps using the camera."
  - Generic error: "Unable to activate camera. Please check your device and try again."

2.3.4 The retry button SHALL be a clickable element with minimum dimensions of 44x44 pixels, using primary button styling, positioned within 8 pixels of the error message text

2.3.5 The error display SHALL become visible within 200 milliseconds of camera activation failure detection

2.3.6 The retry button SHALL be programmatically focusable via keyboard navigation and accompanied by an aria-label attribute indicating its purpose

---

2.4 **Immediate Camera Feed Display**

**User Story:** As a user, I want to see the live camera feed immediately after camera access is granted, so that I can position my document correctly for capture.

**Acceptance Criteria:**

2.4.1 WHEN camera access is granted THEN the system SHALL display the live camera feed

2.4.2 The live camera feed SHALL become visible within 500ms of camera access being granted

2.4.3 IF the live camera feed is not visible within 500ms THEN the system SHALL display a loading indicator

2.4.4 IF the camera type detection fails THEN the system SHALL NOT mirror the camera feed

2.4.5 The live camera feed SHALL occupy a minimum viewport area of 480x480 pixels

2.4.6 The camera feed SHALL be mirrored for front-facing cameras (user-facing) but NOT mirrored for environment-facing cameras (document capture)

2.4.7 A visual indicator SHALL be displayed showing that the camera is active, using a color with minimum 3:1 contrast ratio against the camera feed background

### Unchanged Behavior (Regression Prevention)

3.1 WHEN camera activation succeeds THEN the system SHALL CONTINUE TO show the camera preview with the green rectangle guide for document capture

3.2 WHEN camera activation succeeds THEN the system SHALL CONTINUE TO auto-capture after 3 seconds as designed

3.3 WHEN front side is captured THEN the system SHALL CONTINUE TO allow back side capture workflow

3.4 WHEN back side is captured THEN the system SHALL CONTINUE TO show both images and enable submission to AWS Bedrock

3.5 WHEN any verification step completes THEN the system SHALL CONTINUE TO display the captured images with option to retake

3.6 WHEN user navigates between verification services THEN the system SHALL CONTINUE TO switch camera mode between environment (documents) and user (face) appropriately