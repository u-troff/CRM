import { NextRequest, NextResponse } from "next/server";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { generateSequenceWithOpenAI } from "@/lib/inbound/aiServer";

// Draft-generates a nurture sequence by calling OpenAI directly (gpt-4o) with
// the OPEN_AI_API key from the Next.js environment. Synchronous: the sequence
// is small and fast, so we await the result and hand the draft straight back
// for the user to preview/tweak. Nothing is written to the database here.
export async function POST(req: NextRequest) {
  // Only authenticated users can spend OpenAI credits.
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const brief = await req.json().catch(() => ({}));

  try {
    const draft = await generateSequenceWithOpenAI(brief);
    return NextResponse.json(draft);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 502 }
    );
  }
}
