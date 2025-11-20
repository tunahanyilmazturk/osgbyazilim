import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      payload,
      userMessage,
      resultSummary,
      user,
    }: {
      action: string;
      payload?: Record<string, unknown>;
      userMessage?: string;
      resultSummary?: string;
      user?: { id?: number; fullName?: string; role?: string };
    } = body ?? {};

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    logger.info("AI assistant action", {
      action,
      payload,
      userMessage,
      resultSummary,
      user,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    logger.apiError("/api/assistant/logs", error, 500);
    return NextResponse.json(
      { error: "Internal server error: " + (error as Error).message },
      { status: 500 }
    );
  }
}
