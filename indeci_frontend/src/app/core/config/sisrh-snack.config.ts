/** Duración estándar de notificaciones MatSnackBar (ms). */
export const SISRH_SNACK_DURATION_MS = {
  /** Mensajes breves de confirmación (3 s). */
  short: 3000,
  default: 4000,
  long: 6000,
} as const;

export type SisrhSnackDurationMs =
  (typeof SISRH_SNACK_DURATION_MS)[keyof typeof SISRH_SNACK_DURATION_MS];
