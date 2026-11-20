import { NextResponse } from "next/server";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
