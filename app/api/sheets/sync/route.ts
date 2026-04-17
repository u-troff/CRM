import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Google Sheets sync not yet implemented. Planned: poll sheet → diff against local leads → upsert new rows.",
    },
    { status: 501 }
  );
}
