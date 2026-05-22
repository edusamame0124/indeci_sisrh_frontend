/**
 * Branded types para tokens. Evita confundir un AccessToken con un RefreshToken
 * en signatures de funciones — el compilador atrapa el bug en compile-time.
 */
export type Brand<K, T> = K & { readonly __brand: T };

export type AccessToken = Brand<string, 'AccessToken'>;
export type RefreshToken = Brand<string, 'RefreshToken'>;
export type TemporalToken = Brand<string, 'TemporalToken'>;
export type ChangePasswordToken = Brand<string, 'ChangePasswordToken'>;

/** JWT genérico antes de clasificar por claims */
export type AnyJwt = AccessToken | RefreshToken | TemporalToken | ChangePasswordToken;
