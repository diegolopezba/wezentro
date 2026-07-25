Add a "Descargar QR" button to the revealed QR step in `src/components/events/PaymentQRModal.tsx` so users can save the payment QR image directly to their device.

### What will change
- In `PaymentQRModal.tsx`:
  - Import a download icon (`Download` from `lucide-react`).
  - Add a `handleDownloadQR` async function that:
    - Fetches the current `qrImageUrl` as a blob.
    - Creates a temporary object URL.
    - Programmatically clicks a hidden `<a>` with `download` attribute set to a meaningful filename (e.g., `zentro-qr-${eventId}.png`).
    - Cleans up the object URL after the click.
    - Catches failures and shows a brief error message or falls back to opening the image.
  - Insert a secondary button below the QR code image in the `revealed` step.
  - Style it as a light-themed, pill/outline button that matches the existing sheet design.

### UX details
- Button label: "Descargar QR" (or icon + text).
- Disabled / loading state while the image is being fetched.
- On failure, show a small inline text: "No se pudo descargar. Intenta con una captura de pantalla."

### Files to edit
- `src/components/events/PaymentQRModal.tsx`

### Out of scope
- No backend changes.
- No changes to QR generation or polling flow.