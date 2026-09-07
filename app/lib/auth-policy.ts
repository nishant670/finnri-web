/**
 * Whether email/PIN/OTP sign-in is offered at all.
 *
 * **False for launch.** Google and guest are the two doors in. Email-only OTP
 * was a half-measure: almost anyone willing to type an email address picks
 * Google instead, and the people who actually want a one-time code want it on
 * a phone, which needs DLT registration India has not granted yet. Both
 * channels ship together later rather than half of one now.
 *
 * The backend gates the same flow with `AUTH_OTP_ENABLED` and is the
 * authority — `/v1/auth/otp/send` and `/v1/auth/otp/verify` answer 503
 * whatever this flag says. This one only decides whether the UI offers a road
 * that ends in that 503.
 *
 * Keep it in step with `EMAIL_LOGIN_ENABLED` in the mobile app's `lib/auth.ts`.
 */
export const EMAIL_LOGIN_ENABLED = false;
