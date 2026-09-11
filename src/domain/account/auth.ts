import { z } from "zod";

const email = z.string().trim().email().max(254).transform(value => value.toLowerCase());
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();
export const signupSchema = z.object({
  email,
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
  isBetaTester: z.boolean().default(false),
}).strict().refine(value => value.password === value.confirmPassword, { message: "Le password non coincidono.", path: ["confirmPassword"] });
export const recoverySchema = z.object({ email }).strict();
export const passwordSchema = z.object({ password: z.string().min(8).max(128), confirmPassword: z.string() }).strict()
  .refine(value => value.password === value.confirmPassword, { message: "Le password non coincidono.", path: ["confirmPassword"] });

export function authErrorMessage(error: { code?: string; status?: number }): string {
  switch (error.code) {
    case "user_already_exists": case "email_exists": return "Questa email e gia registrata. Accedi o recupera la password.";
    case "invalid_credentials": return "Email o password non corrette.";
    case "email_not_confirmed": return "Conferma la tua email prima di accedere.";
    case "weak_password": return "Scegli una password di almeno 8 caratteri.";
    case "same_password": return "Scegli una password diversa dalla precedente.";
    case "otp_expired": return "Il link e scaduto. Richiedine uno nuovo.";
    case "session_not_found": case "refresh_token_not_found": return "La sessione e scaduta. Accedi di nuovo.";
    default: return error.status === 429 ? "Troppi tentativi. Attendi qualche minuto e riprova." : "Operazione non disponibile. Riprova tra poco.";
  }
}

export function safeAuthDestination(value: string | null) {
  return value === "/onboarding" || value === "/profile/security" ? value : "/dashboard";
}
