import { PlatformError } from "@/lib/platform/errors";

export type PlatformResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; status: number; details?: unknown } };

export function platformOk<T>(data: T): PlatformResult<T> {
  return { ok: true, data };
}

export function platformFailure(error: unknown): PlatformResult<never> {
  if (error instanceof PlatformError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        status: error.status,
        details: error.details
      }
    };
  }

  return {
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong while processing this request.",
      status: 500
    }
  };
}

export async function runPlatformOperation<T>(operation: () => Promise<T>): Promise<PlatformResult<T>> {
  try {
    return platformOk(await operation());
  } catch (error) {
    return platformFailure(error);
  }
}
