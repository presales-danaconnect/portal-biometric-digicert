# OCR Camera Activation Fix Design

## Overview

This document specifies the design for fixing the camera activation failure in the OCR verification component. The current implementation uses `{ exact: 'environment' }` constraint which causes immediate rejection when the device lacks an environment-facing camera, leaving the component in a perpetual loading state.

**Problem:** The `getUserMedia` call at `App.tsx:54-67` uses strict `facingMode` constraints that reject immediately if the exact camera type is unavailable, preventing document verification for users without dual-camera devices.

**Solution:** Implement a flexible camera activation system with:
- Adaptive constraint preferences (ideal over exact)
- Multi-stage fallback strategy (environment → user → any)
- User-friendly error states with retry mechanism
- Guaranteed performance targets (500ms feed visibility, 200ms error display)

## Glossary

- **Bug_Condition (C)**: The condition where `getUserMedia` rejects due to unsatisfiable `facingMode` constraint (`{ exact: 'environment' }` or `{ exact: 'user' }`)
- **Property (P)**: The desired behavior where camera activates successfully using available cameras with visible feed within performance targets
- **Preservation**: Existing camera preview, auto-capture, and document workflow behaviors that must remain unchanged
- **cameraConfig**: Object containing camera constraints and options for `getUserMedia`
- **facingModePriority**: Ordered list of preferred camera orientations for fallback
- **maxAttempts**: Maximum retry attempts (configured as 3)
- **attemptTimeout**: Maximum time per activation attempt in milliseconds (configured as 3000ms)

## Bug Details

### Bug Condition

The bug manifests when `getUserMedia` is called with an exact facingMode constraint on a device that cannot satisfy that constraint. The MediaDevices API rejects the promise immediately without attempting alternative camera configurations.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type MediaStreamConstraints
  OUTPUT: boolean
  
  CONST constraints = input.video
  CONST hasExactEnvironment = constraints.facingMode = { exact: 'environment' }
  CONST hasExactUser = constraints.facingMode = { exact: 'user' }
  CONST noFallback = constraints.facingMode.exact IS DEFINED
  
  RETURN hasExactEnvironment OR hasExactUser
END FUNCTION
```

**Root Cause in Current Code (App.tsx:54-67):**
```typescript
navigator.mediaDevices.getUserMedia({ 
  video: { 
    facingMode: (service === 'ocr' || (service === 'compare-faces' && compareStep === 'dni')) 
      ? { exact: 'environment' }   // ← BUG: exact fails on single-camera devices
      : { exact: 'user' },         // ← Same issue for user-facing
    width: { ideal: 1280 },
    height: { ideal: 720 }
  } 
})
```

### Examples

1. **Single Front Camera Laptop Attempting OCR**
   - Expected: System falls back to available front camera and proceeds
   - Actual: `NotFoundError` or `NotAllowedError`, component hangs with "Activating camera..."

2. **Mobile Device Without Environment Camera Accessing OCR**
   - Expected: System attempts environment, then user camera, then any available
   - Actual: Immediate rejection, infinite loading spinner

3. **Permission Denied Scenario**
   - Expected: User-friendly error message with retry button within 200ms
   - Actual: Silent console error, persistent loading state

4. **Camera Busy in Another Application**
   - Expected: Error message "Camera is in use by another application" with retry option
   - Actual: Silent failure, component never recovers

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Camera preview with green rectangle guide for document capture remains visible after activation
- Auto-capture triggers after 3 seconds once camera feed is active
- Front/back side capture workflow continues to function identically
- Both captured images display with retake option after capture completes
- Service switching between environment (documents) and user (face) cameras works as designed
- AWS Bedrock submission workflow unchanged

**Scope:**
All inputs that do NOT involve camera activation failures should be completely unaffected by this fix. This includes:
- Image processing after successful camera activation
- Document verification workflow states
- UI component rendering and styling
- Network calls to AWS services

### Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| Error Visibility | 200ms | Error message with retry appears within 200ms of failure |
| Feed Visibility | 500ms | Live camera feed visible within 500ms of permission grant |
| Camera Feed Size | 480x480px | Minimum viewport area for camera preview |
| Touch Target | 44x44px | Minimum size for interactive elements |
| Contrast Ratio | 3:1 minimum | "Live" indicator against camera background |

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Incorrect Constraint Type (PRIMARY)**: Using `exact` instead of `ideal` for facingMode preference
   - The `exact` keyword requires the constraint to be satisfied or the promise rejects
   - `ideal` allows the browser to find the best match and proceed with alternatives
   - Current code: `facingMode: { exact: 'environment' }`
   - Fix: `facingMode: { ideal: ['user', 'environment'] }` for flexible preference

2. **No Fallback Mechanism**: Missing retry logic when initial attempt fails
   - Current implementation has single-shot getUserMedia call
   - No systematic fallback to alternative camera configurations
   - Fix: Implement priority-based fallback strategy (environment → user → any)

3. **Silent Error Handling**: Error caught but only logged, no user notification
   - `console.error('Camera error:', error)` at line 65
   - No UI update to inform user of failure
   - Fix: User-friendly error messages with retry button

4. **No Timeout Enforcement**: getUserMedia can hang indefinitely
   - Browser may not enforce reasonable timeouts
   - Fix: 3000ms timeout per attempt, max 3 attempts total

5. **Loading State Persistence**: Component never exits loading when camera fails
   - `setIsCameraActive(false)` on error but no UI transition
   - Fix: Dedicated error state component with retry mechanism

## Correctness Properties

Property 1: Bug Condition - Flexible Camera Activation

_For any_ MediaStreamConstraints where a facingMode constraint uses `{ exact: 'environment' }` or `{ exact: 'user' }`, the fixed camera activation function SHALL attempt to activate the camera using `{ ideal: ['user', 'environment'] }` constraint with fallback priority, and SHALL either activate a camera successfully or display an error message with retry option within 200ms.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Existing Workflow Behavior

_For any_ camera activation that succeeds using the fixed function, the system SHALL produce exactly the same camera preview, guide overlay, auto-capture behavior, and document workflow as the original implementation, preserving all OCR verification functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

Property 3: Performance - Visibility Targets

_For any_ successful camera activation, the live camera feed SHALL become visible within 500ms of camera access being granted. For any camera activation failure, the error display with retry button SHALL become visible within 200ms of failure detection.

**Validates: Requirements 2.4.2, 2.3.5**

## Fix Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AutoCamera Component                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐     ┌──────────────────────────────┐ │
│  │   CameraErrorState   │     │    CameraPreviewState        │ │
│  │  (Error + Retry)     │←───→│   (Live Feed + Guide)        │ │
│  └──────────────────────┘     └──────────────────────────────┘ │
│           ↑                            ↑                         │
│           └──────────┬─────────────────┘                          │
│                      ↓                                           │
│            ┌─────────────────────┐                               │
│            │ activateCamera()    │                               │
│            │ (Fallback Strategy) │                               │
│            └─────────────────────┘                               │
│                      ↓                                           │
│            ┌─────────────────────┐                               │
│            │  getUserMedia()     │                               │
│            │  with constraints   │                               │
│            └─────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### Components Affected

| File | Component | Change Type |
|------|-----------|-------------|
| `App.tsx:54-67` | `getUserMedia` call | Replace with `activateCamera()` function |
| `App.tsx:164-177` | `AutoCamera` error state | Enhance with friendly errors + retry |
| New file | `useCameraActivation` hook | Extract camera logic for reusability |

### Changes Required

**File**: `src/App.tsx`

**Function**: Camera activation logic (lines 54-67, wrapped in useEffect)

**Specific Changes:**

1. **Create cameraActivation.ts utility**:
   - `activateCamera(config: CameraConfig): Promise<MediaStream>`
   - `fallbackOrder: ['environment', 'user', 'any']`
   - `maxAttempts: 3`, `attemptTimeout: 3000`

2. **Replace getUserMedia call**:
   ```typescript
   // Before (buggy)
   navigator.mediaDevices.getUserMedia({ 
     video: { 
       facingMode: { exact: 'environment' },
       width: { ideal: 1280 },
       height: { ideal: 720 }
     } 
   })

   // After (fixed)
   const stream = await activateCamera({
     preferredFacingMode: 'environment',
     width: { ideal: 1280 },
     height: { ideal: 720 }
   })
   ```

3. **Update AutoCamera error display**:
   - Add friendly error messages per requirements 2.3.3
   - Retry button with 44x44px minimum, aria-label
   - 200ms visibility target

4. **Add Live indicator**:
   - Green/contrasting badge with 3:1 ratio minimum
   - Visible within camera preview container

### Pseudocode: activateCamera Function

```
FUNCTION activateCamera(config)
  INPUT: config of type CameraConfig
         - preferredFacingMode: 'environment' | 'user' | 'any'
         - width: MediaTrackConstraint
         - height: MediaTrackConstraint
         - maxAttempts: number (default: 3)
         - attemptTimeout: number (default: 3000)
  OUTPUT: Promise<MediaStream>

  CONST fallbackOrder = ['environment', 'user', 'any']
  CONST effectiveMaxAttempts = config.maxAttempts ?? 3
  CONST effectiveTimeout = config.attemptTimeout ?? 3000
  CONST preferredIndex = fallbackOrder.indexOf(config.preferredFacingMode)
  
  // Sort fallback order: preferred first, then remaining in order
  CONST orderedModes = [
    config.preferredFacingMode,
    ...fallbackOrder.filter(m => m !== config.preferredFacingMode)
  ]

  FOR attempt FROM 1 TO effectiveMaxAttempts DO
    FOR EACH facingMode IN orderedModes DO
      TRY:
        stream := getUserMediaWithTimeout(
          video: {
            facingMode: { ideal: facingMode },
            width: config.width,
            height: config.height
          },
          timeout: effectiveTimeout
        )
        RETURN stream
      CATCH error:
        IF error.name = 'NotAllowedError' THEN
          RETURN REJECT WITH errorType: 'permission_denied'
        END IF
        IF error.name = 'NotFoundError' THEN
          RETURN REJECT WITH errorType: 'no_camera_found'
        END IF
        IF error.name = 'TrackStartError' THEN
          RETURN REJECT WITH errorType: 'device_in_use'
        END IF
        // Continue to next fallback for other errors
    END FOR
  END FOR

  RETURN REJECT WITH errorType: 'generic_error'
END FUNCTION
```

### Pseudocode: getUserMediaWithTimeout

```
FUNCTION getUserMediaWithTimeout(constraints, timeout)
  INPUT: constraints of type MediaStreamConstraints
         timeout of type number (milliseconds)
  OUTPUT: Promise<MediaStream>

  RETURN NEW Promise((resolve, reject) =>
    timeoutId := setTimeout(() => reject(Error('timeout')), timeout)
    
    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        clearTimeout(timeoutId)
        resolve(stream)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  )
END FUNCTION
```

### Pseudocode: Error Message Helper

```
FUNCTION getErrorMessage(error)
  INPUT: error of type Error | MediaStreamError
  OUTPUT: string

  SWITCH error.name OF
    CASE 'NotAllowedError':
      RETURN 'Camera access was denied. Please allow camera access and try again.'
    CASE 'NotFoundError':
      RETURN 'No camera detected on this device. Please use a device with a camera.'
    CASE 'TrackStartError':
    CASE 'DeviceInUseError':
      RETURN 'Camera is in use by another application. Please close other apps using the camera.'
    DEFAULT:
      RETURN 'Unable to activate camera. Please check your device and try again.'
  END SWITCH
END FUNCTION
```

### Pseudocode: AutoCamera Component (Updated)

```
FUNCTION AutoCamera(props)
  INPUT: props of type { guideType, guideText, seconds, maxSeconds }
  OUTPUT: JSX.Element

  IF cameraError IS NOT null THEN
    RETURN (
      <Card variation="outlined" padding="l">
        <Flex direction="column" gap="m" alignItems="center">
          <Alert variation="error">
            <Text>{getErrorMessage(cameraError)}</Text>
          </Alert>
          <Button
            variation="primary"
            onClick={handleRetry}
            minHeight="44px"
            minWidth="44px"
            aria-label="Retry camera activation"
          >
            Try Again
          </Button>
        </Flex>
      </Card>
    )
  END IF

  IF NOT isCameraActive THEN
    RETURN (
      <Card variation="outlined" padding="l">
        <Flex direction="column" gap="m" alignItems="center">
          <Loader size="large" />
          <Text>Activating camera...</Text>
          <Text fontSize="small">Please allow camera access if prompted</Text>
        </Flex>
      </Card>
    )
  END IF

  RETURN (
    <Flex direction="column" gap="m" alignItems="center" width="100%">
      <View
        width="100%"
        maxWidth="480px"
        minHeight="480px"
        position="relative"
        borderRadius="medium"
        overflow="hidden"
        backgroundColor="neutral.20"
      >
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: guideType = 'rectangle' ? 'environment' : 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        
        {/* Live Indicator with 3:1 contrast */}
        <View
          position="absolute"
          top="12px"
          left="12px"
          backgroundColor="green"
          padding="xs"
          borderRadius="small"
        >
          <Text color="white" fontWeight="bold" fontSize="small">
            ● Live
          </Text>
        </View>

        {/* Guide overlay */}
        <View
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          width={guideType = 'rectangle' ? '200px' : '150px'}
          height={guideType = 'rectangle' ? '125px' : '200px'}
          border="3px solid #10b981"
          borderRadius={guideType = 'rectangle' ? 'small' : '50%'}
          opacity="0.7"
          pointerEvents="none"
        />
      </View>
      
      <Loader variation="linear" percentage={Math.min((seconds / maxSeconds) * 100, 100)} />
    </Flex>
  )
END FUNCTION
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate camera access scenarios with exact constraints. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Single Front Camera Test**: Simulate laptop with only user-facing camera attempting OCR (will fail on unfixed code)
2. **No Camera Test**: Simulate device without any camera (will fail on unfixed code)
3. **Permission Denied Test**: Simulate user denying camera permission (will fail on unfixed code)
4. **Camera Busy Test**: Simulate camera occupied by another app (will fail on unfixed code)

**Expected Counterexamples**:
- `NotFoundError` when environment camera doesn't exist
- `NotAllowedError` when permission denied
- Component stuck in loading state indefinitely
- No error message displayed to user

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := activateCamera_fixed(input)
  IF result.status = 'success' THEN
    ASSERT result.stream IS NOT null
    ASSERT result.stream.active = true
  ELSE
    ASSERT result.error IS NOT null
    ASSERT result.errorMessage IS NOT empty
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function for successful activations.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  // Camera successfully activates
  stream := activateCamera_fixed(input)
  ASSERT stream.active = true
  
  // Verify AutoCamera render behavior unchanged
  ASSERT previewDisplayed = true
  ASSERT guideOverlayVisible = true
  ASSERT autoCaptureTriggers = true
  ASSERT captureWorkflowCompletes = true
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across device configurations
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for working camera configurations

### Unit Tests

**activateCamera function tests:**
- Test fallback order: environment → user → any
- Test timeout enforcement (3000ms)
- Test max attempts (3)
- Test error classification (permission, not found, in use, generic)

**AutoCamera component tests:**
- Test error message display within 200ms
- Test retry button minimum 44x44px
- Test aria-label presence on retry button
- Test live indicator visibility with 3:1 contrast
- Test camera feed visibility within 500ms
- Test minimum 480x480px container size

**Error message tests:**
- Test permission denied message
- Test no camera found message
- Test device in use message
- Test generic error message

### Property-Based Tests

- Generate random facingMode constraints and verify fallback strategy activates camera
- Generate random device configurations and verify preservation of successful captures
- Generate permission denial scenarios and verify error message format
- Generate various timeout values and verify graceful handling
- Generate multiple retry scenarios and verify attempt counter

### Integration Tests

**Full Workflow Tests:**
1. OCR flow with front camera only device
2. OCR flow with environment camera available
3. OCR flow with no camera (error path)
4. Liveness check with user camera
5. Compare faces with both camera types

**Performance Tests:**
1. Measure time from component load to camera feed visible (<500ms target)
2. Measure time from failure to error display (<200ms target)
3. Measure time from retry click to camera activation

**UI Accessibility Tests:**
1. Verify retry button keyboard focusable
2. Verify aria-label present and descriptive
3. Verify color contrast meets 3:1 ratio
4. Verify touch target minimum 44x44px