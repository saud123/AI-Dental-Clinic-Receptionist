import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

    const res = await fetch(`${apiUrl}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const response = NextResponse.json(
        data || { detail: "Failed to fetch user" },
        { status: res.status }
      );
      if (res.status === 401) {
        response.cookies.delete("token");
      }
      return response;
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
