/* Login gate — same UI as the prototype, but backed by Supabase Auth.
 * "Continue with a demo account" uses anonymous sign-in. */
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export function Login() {
  const [mode, setMode] = useState<"up" | "in">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
      setErr("Enter a valid email address.");
      return;
    }
    if (pw.length < 4) {
      setErr("Password must be at least 4 characters.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email: em,
          password: pw,
          options: { data: { name: name.trim() || em.split("@")[0] } },
        });
        if (error) {
          setErr(error.message);
          setBusy(false);
        }
        // On success, AuthProvider's listener flips the gate. If email confirmation
        // is enabled on the project, the user must confirm first.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
        if (error) {
          setErr("Email or password doesn't match.");
          setBusy(false);
        }
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card glass" onSubmit={submit}>
        <div className="login-mark">
          <span className="login-dot"></span>Nimbus
        </div>
        <h1 className="login-h">{mode === "up" ? "Create your account" : "Welcome back"}</h1>
        <p className="login-sub">
          {mode === "up" ? "Your boards sync securely to your account." : "Sign in to get back to your boards."}
        </p>

        {mode === "up" && (
          <label className="login-field">
            <span>Name</span>
            <input value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} placeholder="Your name" autoComplete="name" />
          </label>
        )}
        <label className="login-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="you@example.com" autoComplete="email" autoFocus />
        </label>
        <label className="login-field">
          <span>Password</span>
          <div className="login-pw">
            <input
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => { setPw(e.target.value); setErr(""); }}
              placeholder="••••••••"
              autoComplete={mode === "up" ? "new-password" : "current-password"}
            />
            <button type="button" className="login-eye" onClick={() => setShow((s) => !s)}>
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {err && <div className="login-err">{err}</div>}

        <button type="submit" className="login-btn" disabled={busy}>
          {busy ? "…" : mode === "up" ? "Create account" : "Sign in"}
        </button>

        <div className="login-alt">
          {mode === "up" ? (
            <span>
              Already have an account? <button type="button" onClick={() => { setMode("in"); setErr(""); }}>Sign in</button>
            </span>
          ) : (
            <span>
              New here? <button type="button" onClick={() => { setMode("up"); setErr(""); }}>Create an account</button>
            </span>
          )}
        </div>
      </form>
      <div className="login-foot">A glassy little task board</div>
    </div>
  );
}
