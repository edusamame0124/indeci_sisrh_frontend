/** Estados discretos del flujo de autenticación. Unión discriminada por `kind`. */
export type LoginFlowState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'awaiting-otp'; attemptsRemaining: number } // 5 → 0
  | { kind: 'awaiting-otp-enroll'; qr: string }
  | { kind: 'awaiting-password-change' }
  | { kind: 'awaiting-captcha'; previousMessage: string }
  | { kind: 'rate-limited'; secondsRemaining: number } // countdown 60s
  | { kind: 'error'; mensaje: string }
  | { kind: 'success' };
