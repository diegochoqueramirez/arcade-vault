"use client";

import { useState, type FormEvent } from "react";
import type { ContactResponse } from "@/app/api/contact/route";

type Status = "idle" | "sending" | "success" | "error";

const EMPTY = { name: "", email: "", msg: "" };

export default function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [sentName, setSentName] = useState("");
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      triggerShake();
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website }),
      });
      const data = (await res.json()) as ContactResponse;
      if (data.ok) {
        setSentName(form.name.trim());
        setStatus("success");
      } else if (data.error === "invalid") {
        setStatus("idle");
        triggerShake();
      } else {
        setStatus("error");
      }
    } catch {
      // Error de red o respuesta no JSON: mismo trato que un 500.
      setStatus("error");
    }
  };

  const reset = () => {
    setForm(EMPTY);
    setStatus("idle");
  };

  const sending = status === "sending";

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit}>
      {status === "idle" || sending ? (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              value={form.name}
              disabled={sending}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              type="email"
              value={form.email}
              disabled={sending}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-msg">MENSAJE</label>
            <textarea
              id="contact-msg"
              rows={5}
              value={form.msg}
              disabled={sending}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>
          {/* Honeypot: invisible para personas, los bots lo rellenan. */}
          <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor="contact-website">WEBSITE</label>
            <input
              id="contact-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <button className="btn xl press" type="submit" disabled={sending} style={{ width: "100%" }}>
            {sending ? "▶ ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className={"terminal-success" + (status === "error" ? " is-error" : "")}>
          <div className="term-bar">
            <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            {status === "success" ? (
              <>
                <div className="line dim">[OK] Transmitiendo paquete…</div>
                <div className="line success">
                  &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sentName.toUpperCase()}.<span className="caret">_</span>
                </div>
                <div style={{ marginTop: 18 }}>
                  <button className="btn ghost" type="button" onClick={reset}>ENVIAR OTRO MENSAJE</button>
                </div>
              </>
            ) : (
              <>
                <div className="line error" role="alert">
                  [ERROR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.<span className="caret">_</span>
                </div>
                <div style={{ marginTop: 18 }}>
                  <button className="btn magenta" type="button" autoFocus onClick={() => setStatus("idle")}>
                    REINTENTAR
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
