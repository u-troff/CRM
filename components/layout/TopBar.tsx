"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import SignOutButton from "@/components/auth/SignOutButton";

interface TopBarProps {
  title: string;
  children?: ReactNode;
}

export default function TopBar({ title, children }: TopBarProps) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="topbar">
      <span
        style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          fontWeight: 600,
        }}
      >
        {title}
      </span>
      <div style={{ flex: 1 }} />
      {children}
      {email && <span className="topbar-user-email">{email}</span>}
      {email && <SignOutButton />}
    </div>
  );
}
