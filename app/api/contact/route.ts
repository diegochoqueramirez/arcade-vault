import { Resend } from "resend";

export interface ContactRequest {
  name: string;
  email: string;
  msg: string;
  website?: string; // honeypot, debe venir vacío
}

export type ContactField = "name" | "email" | "msg";

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: "invalid"; fields: ContactField[] }
  | { ok: false; error: "send_failed" };

const LIMITS: Record<ContactField, number> = { name: 60, email: 254, msg: 2000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: ContactResponse, status: number) => Response.json(body, { status });
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("body no es un objeto");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid", fields: ["name", "email", "msg"] }, 400);
  }

  // Bot: éxito falso para no darle pistas.
  if (str(body.website)) return json({ ok: true }, 200);

  const data = { name: str(body.name), email: str(body.email), msg: str(body.msg) };
  const fields = (Object.keys(LIMITS) as ContactField[]).filter(
    (f) => !data[f] || data[f].length > LIMITS[f] || (f === "email" && !EMAIL_RE.test(data[f])),
  );
  if (fields.length) return json({ ok: false, error: "invalid", fields }, 400);

  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    console.error("[api/contact] Faltan variables de entorno de Resend");
    return json({ ok: false, error: "send_failed" }, 500);
  }

  try {
    const { error } = await new Resend(RESEND_API_KEY).emails.send({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      replyTo: data.email,
      subject: `[Arcade Vault] Mensaje de ${data.name}`,
      text: `Nombre: ${data.name}\nCorreo: ${data.email}\n\nMensaje:\n${data.msg}\n`,
    });
    if (error) {
      console.error("[api/contact] Resend devolvió error:", error);
      return json({ ok: false, error: "send_failed" }, 500);
    }
  } catch (err) {
    console.error("[api/contact] Fallo al llamar a Resend:", err);
    return json({ ok: false, error: "send_failed" }, 500);
  }

  return json({ ok: true }, 200);
}
