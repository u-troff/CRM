"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = {};

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <div className="auth-page">
      <form className="auth-card" action={formAction}>
        <div className="auth-title">CREATE ACCOUNT</div>

        {/* Solo CRM note: remove or hide this page once your account is created. */}
        {state?.message && (
          <div className="info-banner" style={{ marginBottom: 12 }}>
            {state.message}
          </div>
        )}

        {state?.error && (
          <div className="error-banner" style={{ marginBottom: 12 }}>
            {state.error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input className="form-input" id="email" name="email" type="email" required />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <input
            className="form-input"
            id="password"
            name="password"
            type="password"
            minLength={6}
            required
          />
        </div>

        <button className="btn-primary" type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create account"}
        </button>

        <div className="auth-footer">
          Already have an account? <Link href="/auth/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
