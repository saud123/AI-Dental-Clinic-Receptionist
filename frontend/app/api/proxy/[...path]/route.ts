import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function forward(req: NextRequest, context: RouteContext) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const { path } = await context.params;
    // Ensure backend port is 8001 (where FastAPI is actually running)
    const apiUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api/v1";
    const search = req.nextUrl.search;
    const targetUrl = `${apiUrl}/${path.join("/")}${search}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    const contentType = req.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    const init: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      // 🔥 FIX: Use arrayBuffer for binary safety (Audio / FormData)
      const bodyBuffer = await req.arrayBuffer();
      if (bodyBuffer.byteLength > 0) {
        init.body = bodyBuffer;
      }
    }

    const res = await fetch(targetUrl, init);

    const resContentType = res.headers.get("content-type") || "";
    if (resContentType.includes("application/json")) {
      const json = await res.json().catch(() => null);
      return NextResponse.json(json, { status: res.status });
    } else {
      // 🔥 FIX: Return binary response (MP3 audio) safely
      const resBuffer = await res.arrayBuffer();
      return new NextResponse(resBuffer, {
        status: res.status,
        headers: { 
          "Content-Type": resContentType || "application/octet-stream",
          "X-User-Text": res.headers.get("X-User-Text") || "",
          "X-Bot-Text": res.headers.get("X-Bot-Text") || "",
          "X-Provider": res.headers.get("X-Provider") || "",
        },
      });
    }
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Proxy Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  return forward(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return forward(req, context);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return forward(req, context);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return forward(req, context);
}