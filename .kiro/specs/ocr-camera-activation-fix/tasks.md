# Implementation Plan

## Overview
This plan implements the camera activation fix for the OCR verification component. The bug is caused by using `{ exact: 'environment' }` or `{ exact: 'user' }` constraints that immediately reject when the specified camera type is unavailable.

**Bug Fix Reference**: [bugfix.md](bugfix.md)
**Design Reference**: [design.md](design.md)

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TASK DEPENDENCY GRAPH                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ 1. Set up Vitest │ ( Foundation - required before any tests )
└────────┬────────┘
         │ 
         ▼
┌─────────────────────────────────────────────────┐
│ 2. Write Bug Condition Exploration Test (PBT)   │ (Before fix - confirms bug exists)
│    Property 1: Bug Condition                    │
└────────────────┬────────────────────────────────┘
                 │ Test written and runs on unfixed code
                 │ Documents counterexamples
                 ▼
┌─────────────────────────────────────────────────┐
│ 3. Write Preservation Property Test (PBT)       │ (Before fix - establishes baseline)
│    Property 2: Preservation                     │
└────────────────┬────────────────────────────────┘
                 │ Tests pass on unfixed code
                 │ Confirms baseline behavior
                 ▼
┌─────────────────────────────────────────────────┐
│ 4. Create cameraActivation.ts Utility           │ (Foundation for fix)
│    Dependencies: [1]                            │ (No camera tests yet, just setup)
└────────────────┬────────┬───────────────────────┘
                 │        │
                 │        ▼
┌────────────────┘   ┌────────────────────────────────────┐
│                    │ 5. Create useCameraActivation Hook │
│                    │    Dependencies: [4]               │
│                    └────────────────┬───────────────────┘
│                                     │
│                                     ▼
┌─────────────────────────────────────────────────┐
│ 6. Update App.tsx Camera Activation             │
│    Dependencies: [4, 5]                         │
│    - Replace getUserMedia call                  │
│    - Update AutoCamera error display            │
│    - Add Live indicator with 3:1 contrast       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Run Exploration Test (Verification)                           │
│    Dependencies: [2, 6]                                          │
│    Property 1: Expected Behavior - should now PASS               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Run Preservation Test (Verification)                          │
│    Dependencies: [3, 6]                                          │
│    Property 2: Preservation - should still PASS                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Write Unit Tests for cameraActivation.ts                     │
│    Dependencies: [4, 6]                                          │
│    - Fallback order tests                                       │
│    - Timeout enforcement tests                                  │
│    - Error classification tests                                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. Write Integration Tests                                     │
│     Dependencies: [1, 6, 9]                                     │
│     - Full OCR workflow                                          │
│     - Compare-faces workflow                                     │
│     - Performance tests                                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. Checkpoint - All Tests Pass                                 │
│     Dependencies: [7, 8, 9, 10]                                 │
└─────────────────────────────────────────────────────────────────┘

Legend:
[1], [2], etc. = Task numbers
→ = Depends on
```

---

## Effort Estimation Summary

| Phase | Tasks | Total Effort |
|-------|-------|--------------|
| **Foundation** | 1 | 15 min |
| **Test Setup (Before Fix)** | 2, 3 | 45 min |
| **Implementation** | 4, 5, 6 | 2.5 hours |
| **Verification** | 7, 8 | 15 min |
| **Additional Testing** | 9, 10 | 1.5 hours |
| **Checkpoint** | 11 | 15 min |
| **TOTAL** | 11 tasks | **~5 hours** |

---

# Implementation Tasks

## Foundation Setup

- [ ] 1. Set up Vitest test framework
  - Install vitest and related dependencies
  - Configure vitest.config.ts
  - Add test script to package.json
  - Create test utilities directory structure
  - **Effort**: 15 minutes
  - **Dependencies**: None
  - _Requirements: Test infrastructure for Requirements 2.1-2.4.3, 3.1-3.6_

## Bug Condition Exploration Test (Before Fix)

- [ ] 2. Write bug condition exploration test
  - **Property 1: Bug Condition** - Exact FacingMode Constraint Failure
  - **IMPORTANT**: Write this property-based test BEFORE implementing the fix
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases with exact constraints
  - Test strategy:
    1. Create mock getUserMedia that simulates exact constraint rejection
    2. Generate test cases with `{ exact: 'environment' }` and `{ exact: 'user' }`
    3. Verify promise rejects immediately without fallback attempts
    4. Document counterexamples:
       - `NotFoundError` when environment camera doesn't exist on single-front-camera device
       - `NotAllowedError` when permission denied
       - No error message displayed
       - Component stuck in loading state indefinitely
  - Expected behavior per design: Should use `{ ideal: ['user', 'environment'] }` with fallback
  - Run test on UNFIXED code (App.tsx current implementation)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - **Counterexamples to document**:
    - Laptop with only front camera: `getUserMedia({ video: { facingMode: { exact: 'environment' } } })` → NotFoundError
    - Permission denied scenario: `getUserMedia({ video: { facingMode: { exact: 'user' } } })` → NotAllowedError
    - Component hangs indefinitely after error
  - **Effort**: 25 minutes
  - **Dependencies**: [1]
  - _Requirements: 1.1, 1.2, 1.3, 2.1.3_

## Preservation Property Test (Before Fix)

- [ ] 3. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Input Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (successful camera activation)
  - Property-based test captures observed behavior patterns that must be preserved:
    1. When camera activates successfully with environment-facing camera:
       - Camera preview with green rectangle guide appears
       - Auto-capture triggers after 3 seconds
       - Front/back side capture workflow functions
    2. When camera activates successfully with user-facing camera:
       - Camera preview with oval guide appears
       - Auto-capture triggers after 3 seconds
       - Face capture workflow functions
  - Write PBT that generates successful activation scenarios and asserts:
    - Stream is active and has video track
    - Auto-capture timer starts
    - Guide overlay is rendered
    - Service switching between cameras works
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - **Effort**: 20 minutes
  - **Dependencies**: [1]
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

## Implementation Phase

- [ ] 4. Create cameraActivation.ts utility
  - **File**: `src/utils/cameraActivation.ts`
  - **Effort**: 45 minutes
  - **Dependencies**: [1]
  - **Implementation Details**:
    - Export `CameraConfig` interface with preferredFacingMode, width, height, maxAttempts, attemptTimeout
    - Export `activateCamera(config: CameraConfig): Promise<MediaStream>` function
    - Implement fallback order: environment → user → any
    - Implement getUserMediaWithTimeout helper with configurable timeout (default 3000ms)
    - Implement maxAttempts enforcement (default 3)
    - Implement error classification:
      - NotAllowedError → 'permission_denied'
      - NotFoundError → 'no_camera_found'
      - TrackStartError/DeviceInUseError → 'device_in_use'
      - Default → 'generic_error'
    - Export `getErrorMessage(errorType: string): string` helper
  - **Code Structure**:
    ```typescript
    export interface CameraConfig {
      preferredFacingMode: 'environment' | 'user' | 'any';
      width?: MediaTrackConstraintSet['width'];
      height?: MediaTrackConstraintSet['height'];
      maxAttempts?: number;  // default: 3
      attemptTimeout?: number; // default: 3000ms
    }

    export type CameraErrorType = 
      | 'permission_denied'
      | 'no_camera_found'
      | 'device_in_use'
      | 'generic_error'
      | 'timeout';

    export async function activateCamera(config: CameraConfig): Promise<MediaStream>;
    export function getErrorMessage(errorType: CameraErrorType): string;
    ```
  - _Bug_Condition: isBugCondition(input) where input.video.facingMode = { exact: 'environment' | 'user' }_
  - _Expected_Behavior: expectedBehavior(result) - returns stream or classified error with user-friendly message_
  - _Preservation: All successful activations produce same camera preview and auto-capture behavior_
  - _Requirements: 2.1.1, 2.1.3, 2.2.1, 2.2.2, 2.2.5, 2.2.6, 2.3.3_

- [ ] 5. Create useCameraActivation React hook
  - **File**: `src/hooks/useCameraActivation.ts`
  - **Effort**: 30 minutes
  - **Dependencies**: [4]
  - **Implementation Details**:
    - Export `useCameraActivation(config?: Partial<CameraConfig>)` hook
    - Manage states: isCameraActive, cameraError, cameraStream
    - Implement retry mechanism with attempt counter
    - Implement timeout enforcement using activateCamera
    - Expose methods: activateCamera(), retry(), cleanup()
    - Auto-cleanup MediaStream on unmount (stop all tracks)
  - **Return Type**:
    ```typescript
    {
      isCameraActive: boolean;
      cameraError: CameraErrorType | null;
      cameraStream: MediaStream | null;
      activateCamera: () => Promise<void>;
      retry: () => Promise<void>;
      cleanup: () => void;
      attemptCount: number;
    }
    ```
  - _Bug_Condition: isBugCondition() from design - uses exact constraints causing immediate rejection_
  - _Expected_Behavior: expectedBehavior() - flexible activation with user-friendly errors_
  - _Preservation: Successful activation continues to provide stream for preview and auto-capture_
  - _Requirements: 2.1.1, 2.1.2, 2.2.4, 2.3.1, 2.3.5_

- [ ] 6. Update App.tsx camera activation
  - **File**: `src/App.tsx`
  - **Effort**: 75 minutes (1.25 hours)
  - **Dependencies**: [4, 5]
  - **Implementation Details**:
    1. **Import useCameraActivation hook**
       ```typescript
       import { useCameraActivation } from './hooks/useCameraActivation';
       ```

    2. **Replace getUserMedia call** (lines 54-67):
       ```typescript
       // Before (buggy)
       navigator.mediaDevices.getUserMedia({ 
         video: { 
           facingMode: { exact: 'environment' },
           width: { ideal: 1280 },
           height: { ideal: 720 }
         } 
       })

       // After (fixed) - in useEffect
       const { activateCamera, isCameraActive, cameraError, cleanup } = useCameraActivation();
       useEffect(() => {
         activateCamera();
         return cleanup;
       }, []);
       ```

    3. **Update AutoCamera component error display** (lines 164-177):
       - Replace generic error with user-friendly messages from getErrorMessage()
       - Add retry button with 44x44px minimum touch target
       - Add aria-label: "Retry camera activation"
       - Position retry button within 8px of error message
       - Target 200ms visibility from failure detection
       - Error message mapping per 2.3.3:
         - permission_denied: "Camera access was denied. Please allow camera access and try again."
         - no_camera_found: "No camera detected on this device. Please use a device with a camera."
         - device_in_use: "Camera is in use by another application. Please close other apps using the camera."
         - generic_error: "Unable to activate camera. Please check your device and try again."

    4. **Add Live indicator**:
       - Add green badge with "● Live" text
       - Position: top-left of camera preview
       - Background color with 3:1 minimum contrast against camera feed
       - White text on green background (#10b981)
       - Font weight: bold, font size: small

    5. **Update camera container dimensions**:
       - Minimum viewport area: 480x480px
       - Use maxWidth and minHeight constraints

    6. **Fix TypeScript errors**:
       - Remove pointerEvents prop (use CSS class or style object)
       - Update Button variation to valid values (primary, default, link)
  - _Bug_Condition: isBugCondition(input) where input uses { exact: 'environment' } or { exact: 'user' }_
  - _Expected_Behavior: expectedBehavior(result) - activateCamera() with ideal constraints and fallback_
  - _Preservation: Preservation Requirements 3.1-3.6 - camera preview, guide overlay, auto-capture, workflow unchanged_
  - _Requirements: 2.1.1, 2.1.2, 2.1.3, 2.2.1, 2.2.2, 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6, 2.4.1, 2.4.2, 2.4.5, 2.4.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

## Verification Phase

- [ ] 7. Verify bug condition exploration test now passes
  - **Property 1: Expected Behavior** - Exact FacingMode Constraint Fix
  - **IMPORTANT**: Re-run the SAME test from task 2 - do NOT write a new test
  - The test from task 2 encodes the expected behavior for buggy inputs
  - When this test passes, it confirms the expected behavior is satisfied
  - Run bug condition exploration test from task 2 using activateCamera()
  - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
  - Verify:
    - activateCamera uses { ideal: ['user', 'environment'] } constraint
    - Promise does NOT reject immediately on exact constraint unavailability
    - Fallback to alternative cameras is attempted
  - **Effort**: 10 minutes
  - **Dependencies**: [2, 6]
  - _Requirements: 2.1.1, 2.1.3, 2.2.1, 2.2.3_

- [ ] 8. Verify preservation tests still pass
  - **Property 2: Preservation** - Non-Buggy Input Behavior Preserved
  - **IMPORTANT**: Re-run the SAME tests from task 3 - do NOT write new tests
  - Run preservation property tests from task 3
  - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
  - Verify:
    - Camera preview with guide overlay still renders
    - Auto-capture still triggers after 3 seconds
    - Capture workflow still completes successfully
    - Service switching between cameras still works
  - **Effort**: 5 minutes
  - **Dependencies**: [3, 6]
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

## Additional Testing

- [ ] 9. Write unit tests for cameraActivation.ts
  - **File**: `src/utils/cameraActivation.test.ts`
  - **Effort**: 45 minutes
  - **Dependencies**: [4, 6]
  - **Test Cases**:
    1. **Fallback order test**: Verify environment → user → any priority
    2. **Timeout enforcement test**: Verify 3000ms timeout per attempt
    3. **Max attempts test**: Verify 3 total attempts maximum
    4. **Error classification tests**:
       - NotAllowedError → permission_denied message
       - NotFoundError → no_camera_found message
       - TrackStartError → device_in_use message
       - Unknown error → generic_error message
    5. **Ideal constraint test**: Verify { ideal: 'environment' } is used over { exact }
  - **Effort**: 45 minutes
  - _Requirements: 2.2.2, 2.2.5, 2.2.6, 2.3.3_

- [ ] 10. Write integration tests
  - **Files**: 
    - `src/components/AutoCamera.test.tsx`
    - `src/hooks/useCameraActivation.test.ts`
  - **Effort**: 45 minutes
  - **Dependencies**: [1, 6, 9]
  - **Test Scenarios**:
    1. **OCR flow with front-camera-only device** (laptop)
    2. **OCR flow with environment camera available** (mobile)
    3. **OCR flow with no camera** (error path)
    4. **Liveness check with user camera**
    5. **Compare faces with both camera types**
    6. **Performance tests**:
       - Camera feed visible within 500ms of permission grant
       - Error display within 200ms of failure detection
       - Retry click to camera activation time
    7. **UI accessibility tests**:
       - Retry button keyboard focusable
       - aria-label present and descriptive
       - Color contrast 3:1 ratio for Live indicator
       - Touch target minimum 44x44px
  - _Requirements: 2.4.2, 2.3.5, 2.4.7, 2.3.4, 2.3.6_

## Checkpoint

- [ ] 11. Checkpoint - Ensure all tests pass
  - **Action**: Run full test suite
  - **Effort**: 15 minutes
  - **Dependencies**: [7, 8, 9, 10]
  - **Verification Checklist**:
    - [ ] All unit tests pass
    - [ ] All integration tests pass
    - [ ] Bug condition exploration test passes (Property 1)
    - [ ] Preservation property tests pass (Property 2)
    - [ ] Performance targets met (<500ms feed, <200ms error)
    - [ ] Accessibility requirements satisfied
    - [ ] Build compiles without TypeScript errors
    - [ ] Lint passes with no warnings
  - **Note**: Ask the user if questions arise during checkpoint verification
  - _Requirements: All requirements from bugfix.md and design.md_

---

## Task Completion Summary

| Task | Title | Effort | Status |
|------|-------|--------|--------|
| 1 | Set up Vitest | 15 min | ⏳ Pending |
| 2 | Bug Condition Exploration Test | 25 min | ⏳ Pending |
| 3 | Preservation Property Test | 20 min | ⏳ Pending |
| 4 | Create cameraActivation.ts | 45 min | ⏳ Pending |
| 5 | Create useCameraActivation Hook | 30 min | ⏳ Pending |
| 6 | Update App.tsx Camera Activation | 75 min | ⏳ Pending |
| 7 | Verify Exploration Test (Fix Check) | 10 min | ⏳ Pending |
| 8 | Verify Preservation Test | 5 min | ⏳ Pending |
| 9 | Unit Tests for cameraActivation.ts | 45 min | ⏳ Pending |
| 10 | Integration Tests | 45 min | ⏳ Pending |
| 11 | Checkpoint | 15 min | ⏳ Pending |
| **TOTAL** | | **~5 hours** | |

---

## Key Design References

### Bug Condition (C)
```
CONST hasExactEnvironment = constraints.facingMode = { exact: 'environment' }
CONST hasExactUser = constraints.facingMode = { exact: 'user' }
RETURN hasExactEnvironment OR hasExactUser
```

### Expected Behavior (P)
```
activateCamera(config):
  - Use { ideal: ['user', 'environment'] } constraint
  - Fallback order: environment → user → any
  - Max 3 attempts, 3000ms timeout each
  - Return user-friendly error message on failure
```

### Preservation (¬C)
- Camera preview with green rectangle guide remains visible
- Auto-capture triggers after 3 seconds
- Front/back side capture workflow unchanged
- Service switching between environment/user cameras works
- AWS Bedrock submission workflow unchanged