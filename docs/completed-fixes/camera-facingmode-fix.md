# Camera activation fix (completed)

**Status:** Done, already implemented in `src/components/verification/AutoCamera.tsx`.

**Original problem:** `getUserMedia` was called with `facingMode: { exact: 'environment' }` (or `{ exact: 'user' }`), which threw immediately on any device that couldn't satisfy that exact constraint (e.g. laptops with only a front camera), leaving the component stuck in a permanent loading state with no user feedback.

**Fix applied:** `AutoCamera.tsx` now requests `facingMode: { ideal: facingMode }`, and falls back to a plain `getUserMedia({ video: { width, height } })` call (no facingMode at all) if the first attempt fails, before showing a specific error state (permission denied / no camera found / generic) with a retry button.

Full original spec (requirements, design, and task breakdown) is preserved in git history at `.kiro/specs/ocr-camera-activation-fix/` as of commit history before this consolidation, if the detailed reasoning or test plan is ever needed again.
