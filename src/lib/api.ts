import { NextResponse } from "next/server";

// Small helpers so every route reports bad input the same way.
export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function readUserId(request: Request): string | null {
  return new URL(request.url).searchParams.get("userId");
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
