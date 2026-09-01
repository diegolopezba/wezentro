/**
 * Card payments (Qhantuy → Cybersource, REDIRECT mode).
 *
 * Card data never touches Zentro: Qhantuy returns a hosted `payment_url` and
 * handles 3-D Secure there. We only open it and keep polling the payment
 * session, so confirmation still arrives through the same callback as QR.
 */

export type CheckoutMethod = "qr" | "card";

export interface PaymentGateway {
  /** Sends the user to the hosted gateway. */
  navigate: (url: string) => void;
  /** Closes the placeholder tab when the checkout could not be created. */
  abort: () => void;
}

/**
 * Opens a placeholder tab synchronously inside the click handler so the popup
 * blocker doesn't kill it while we await the checkout request. Falls back to
 * navigating the current tab when the browser blocks it anyway (in-app
 * browsers, some PWAs).
 */
export const openPaymentGateway = (): PaymentGateway => {
  let placeholder: Window | null = null;
  try {
    placeholder = window.open("", "_blank");
    if (placeholder) {
      placeholder.document.write(
        '<!doctype html><meta charset="utf-8"><title>Zentro</title>' +
          '<body style="font-family:system-ui;display:flex;align-items:center;' +
          'justify-content:center;height:100vh;margin:0;color:#111">' +
          "Abriendo el pago seguro…</body>",
      );
    }
  } catch {
    placeholder = null;
  }

  return {
    navigate: (url: string) => {
      if (placeholder && !placeholder.closed) {
        placeholder.location.href = url;
      } else {
        window.location.href = url;
      }
    },
    abort: () => {
      try {
        if (placeholder && !placeholder.closed) placeholder.close();
      } catch {
        /* nothing to close */
      }
    },
  };
};

/** Absolute URL Qhantuy sends the payer back to once the card flow ends. */
export const buildReturnUrl = (path: string): string =>
  `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
