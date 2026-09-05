import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(code: ApiErrorCode, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("BAD_REQUEST", error.errors.map((item) => item.message).join("; "), 422);
  }

  const message = error instanceof Error ? error.message : "服务器内部错误";
  return fail("INTERNAL_ERROR", message, 500);
}
