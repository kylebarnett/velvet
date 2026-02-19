import { sendEmailBatchWithRetry } from "./retry";

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const mockEmails = [
  {
    from: "noreply@example.com",
    to: ["user@example.com"],
    subject: "Test",
    html: "<p>Hello</p>",
  },
];

function okResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number) {
  return new Response(JSON.stringify({ message: "Error" }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("sendEmailBatchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns sent count on success", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse({ data: [{ id: "msg_1" }] }));

    const result = await sendEmailBatchWithRetry("test-key", mockEmails);

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails/batch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it("returns full email count as sent when response has no data array", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      okResponse({ success: true }),
    );

    const emails = [mockEmails[0], { ...mockEmails[0], to: ["b@example.com"] }];
    const result = await sendEmailBatchWithRetry("test-key", emails);

    expect(result).toEqual({ sent: 2, failed: 0 });
  });

  it("does not retry on 4xx errors", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(errorResponse(422));

    const result = await sendEmailBatchWithRetry("test-key", mockEmails);

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 401 errors", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(errorResponse(401));

    const result = await sendEmailBatchWithRetry("test-key", mockEmails);

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx and succeeds", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(okResponse({ data: [{ id: "msg_1" }] }));

    const promise = sendEmailBatchWithRetry("test-key", mockEmails);

    // First attempt fails with 500, then waits 1000ms before retry
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on network error and succeeds", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(okResponse({ data: [{ id: "msg_1" }] }));

    const promise = sendEmailBatchWithRetry("test-key", mockEmails);

    // First attempt throws, waits 1000ms before retry
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails after all retries are exhausted", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(errorResponse(503));

    const promise = sendEmailBatchWithRetry("test-key", mockEmails);

    // attempt 0 fails → wait 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // attempt 1 fails → wait 2000ms
    await vi.advanceTimersByTimeAsync(2000);
    // attempt 2 fails → wait 4000ms
    await vi.advanceTimersByTimeAsync(4000);
    // attempt 3 (final) fails → no more retries

    const result = await promise;

    expect(result).toEqual({ sent: 0, failed: 1 });
    // 1 initial + 3 retries = 4 total attempts
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("uses exponential backoff delays", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(okResponse({ data: [{ id: "msg_1" }] }));

    const promise = sendEmailBatchWithRetry("test-key", mockEmails);

    // First retry: 1000ms * 2^0 = 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // Second retry: 1000ms * 2^1 = 2000ms
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("handles batch with multiple emails", async () => {
    const emails = [
      mockEmails[0],
      { ...mockEmails[0], to: ["b@example.com"] },
      { ...mockEmails[0], to: ["c@example.com"] },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      okResponse({ data: [{ id: "msg_1" }, { id: "msg_2" }] }),
    );

    const result = await sendEmailBatchWithRetry("test-key", emails);

    // 2 out of 3 had IDs in the response
    expect(result).toEqual({ sent: 2, failed: 1 });
  });
});
