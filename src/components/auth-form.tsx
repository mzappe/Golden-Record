"use client";

import { useActionState, useEffect, useState } from "react";
import { signIn, signUp, type AuthActionState } from "@/app/actions";

export function AuthForm() {
  const [signInState, signInAction, signInPending] = useActionState<AuthActionState, FormData>(signIn, null);
  const [signUpState, signUpAction, signUpPending] = useActionState<AuthActionState, FormData>(signUp, null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  useEffect(() => {
    if (signUpState?.needsEmailConfirmation) {
      setShowConfirmationModal(true);
    }
  }, [signUpState]);

  return (
    <>
      <div className="auth-form-wrap">
        <h2 className="panel-title">Sign In</h2>

        <form action={signInAction} className="form-grid compact">
          <label className="form-field-wrap">
            <span className="form-label">Email</span>
            <input name="email" type="email" placeholder="you@example.com" className="field" required />
          </label>
          <label className="form-field-wrap">
            <span className="form-label">Password</span>
            <input name="password" type="password" placeholder="••••••••" className="field" required />
          </label>
          <button className="btn-primary" disabled={signInPending}>
            {signInPending ? "Signing in..." : "Enter"}
          </button>
          {signInState?.error ? <p className="form-status form-status-error">{signInState.error}</p> : null}
        </form>

        <div className="divider" />

        <h2 className="panel-title">Create Account</h2>
        <form action={signUpAction} className="form-grid compact">
          <label className="form-field-wrap">
            <span className="form-label">Email</span>
            <input name="email" type="email" placeholder="you@example.com" className="field" required />
          </label>
          <label className="form-field-wrap">
            <span className="form-label">Password</span>
            <input name="password" type="password" placeholder="Create a password" className="field" required />
          </label>
          <button className="btn-secondary" disabled={signUpPending}>
            {signUpPending ? "Creating..." : "Create Account"}
          </button>
          {signUpState?.error ? <p className="form-status form-status-error">{signUpState.error}</p> : null}
        </form>
      </div>

      {showConfirmationModal ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="panel-title">Confirm your email</h3>
            <p className="muted-small">Check your inbox{signUpState?.email ? ` (${signUpState.email})` : ""} and open the confirmation link.</p>
            <div className="modal-actions">
              <button onClick={() => setShowConfirmationModal(false)} className="btn-primary" type="button">
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
