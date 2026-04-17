"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = {};

function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const searchParams = useSearchParams();
  const confirmationError = searchParams.get("error") === "confirmation_failed";

  return (
    <form className="auth-card" action={formAction}>
      <div className="auth-title">U-FLOW CRM LOGIN</div>

      {confirmationError && (
        <div className="error-banner" style={{ marginBottom: 12 }}>
          Email confirmation failed. Please request a new confirmation link.
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
          required
        />
      </div>

      <button className="btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </button>

      <div className="auth-footer">
        Need an account? <Link href="/auth/signup">Create one</Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-page">
      <Suspense fallback={<div className="auth-card" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
