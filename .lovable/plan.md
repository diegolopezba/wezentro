Add the uploaded mascot illustration to the global error fallback screen (the "Algo salió mal — Recargar" page rendered by `src/components/ErrorBoundary.tsx`).

## Steps
1. Copy `user-uploads://zentro_icons_3.png` → `src/assets/error-mascot.png`.
2. In `src/components/ErrorBoundary.tsx`:
   - Add `import errorMascot from "@/assets/error-mascot.png";`
   - Insert `<img src={errorMascot} alt="" className="w-40 h-40 mx-auto" />` above the `<h1>Algo salió mal</h1>` inside the existing centered container.

Nothing else changes — copy, button, and layout stay as-is.