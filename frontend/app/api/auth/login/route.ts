import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

    const res = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // ── NEW: Surface raw backend error instead of silent 500 ──
    const rawText = await res.text();           // <-- read raw body FIRST
    console.log(">>> BACKEND LOGIN RESPONSE:", { status: res.status, body: rawText });

    // Parse JSON from raw text (re-seek since text() consumes the stream)
    const data = rawText && rawText.trim()
      ? (() => {
          try { return JSON.parse(rawText); }
          catch { return { raw: rawText }; }
        })()
      : {};

    if (!res.ok) {
      // Return backend's own status + detail instead of throwing 500
      return NextResponse.json(
        { detail: (data as { detail?: string }).detail || "Authentication failed" },
        { status: res.status }
      );
    }

    const token = (data as { access_token?: string }).access_token;
    const user = (data as { user?: unknown }).user;

    if (!token || !user) {
      return NextResponse.json(
        { detail: "Invalid login response from backend" },
        { status: 502 }
      );
    }

    const response = NextResponse.json({ user }, { status: 200 });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error(">>> LOGIN PROXY ERROR:", error);
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
