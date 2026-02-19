import { NextRequest } from "next/server";

/**
 * Create a mock NextRequest for API route testing.
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = "GET", body, headers = {} } = options;

  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3001",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(
    url.startsWith("http") ? url : `http://localhost:3001${url}`,
    init as never,
  );
}

/**
 * Parse a NextResponse for assertions.
 */
export async function parseResponse<T = unknown>(
  response: Response,
): Promise<{ status: number; body: T }> {
  const status = response.status;
  const body = (await response.json()) as T;
  return { status, body };
}
