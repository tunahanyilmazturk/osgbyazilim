import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({ message: "Logged out" }, { status: 200 });
    response.cookies.set("app_session", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("AUTH LOGOUT error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + (error as Error).message },
      { status: 500 }
    );
  }
}
