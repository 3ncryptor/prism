import { GoogleGenerativeAIFetchError } from "@google/generative-ai";
import { generateContentWithRetry } from "@/lib/extraction/geminiExtractionProvider";

function makeResponse(text: string) {
  return { response: { text: () => text } };
}

describe("generateContentWithRetry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns immediately on success without retrying", async () => {
    const generateContent = jest.fn().mockResolvedValue(makeResponse("ok"));

    const result = await generateContentWithRetry(generateContent, "prompt");

    expect(result.response.text()).toBe("ok");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("retries on a 503 and succeeds once the transient error clears", async () => {
    const generateContent = jest
      .fn()
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError("high demand", 503))
      .mockResolvedValueOnce(makeResponse("ok"));

    const promise = generateContentWithRetry(generateContent, "prompt");
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.response.text()).toBe("ok");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("retries on a 429 rate-limit error", async () => {
    const generateContent = jest
      .fn()
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError("rate limited", 429))
      .mockResolvedValueOnce(makeResponse("ok"));

    const promise = generateContentWithRetry(generateContent, "prompt");
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.response.text()).toBe("ok");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-transient error (e.g. 400 bad request)", async () => {
    const error = new GoogleGenerativeAIFetchError("bad request", 400);
    const generateContent = jest.fn().mockRejectedValue(error);

    await expect(generateContentWithRetry(generateContent, "prompt")).rejects.toBe(error);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("does not retry a plain error with no status", async () => {
    const error = new Error("network down");
    const generateContent = jest.fn().mockRejectedValue(error);

    await expect(generateContentWithRetry(generateContent, "prompt")).rejects.toBe(error);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("gives up after exhausting all attempts on a persistent 503", async () => {
    const error = new GoogleGenerativeAIFetchError("high demand", 503);
    const generateContent = jest.fn().mockRejectedValue(error);

    const promise = generateContentWithRetry(generateContent, "prompt");
    promise.catch(() => {}); // avoid unhandled rejection warning while timers run
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toBe(error);
    expect(generateContent).toHaveBeenCalledTimes(4);
  });

  it("does not retry a 429 caused by daily-quota exhaustion — retrying cannot succeed until the quota resets", async () => {
    const error = new GoogleGenerativeAIFetchError("quota exceeded", 429, "Too Many Requests", [
      {
        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
        violations: [
          {
            quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests",
            quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
          },
        ],
      },
    ]);
    const generateContent = jest.fn().mockRejectedValue(error);

    await expect(generateContentWithRetry(generateContent, "prompt")).rejects.toBe(error);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("still retries a 429 with no daily-quota violation (a transient per-minute rate limit)", async () => {
    const generateContent = jest
      .fn()
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError("rate limited", 429, "Too Many Requests", [
        {
          "@type": "type.googleapis.com/google.rpc.QuotaFailure",
          violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" }],
        },
      ]))
      .mockResolvedValueOnce(makeResponse("ok"));

    const promise = generateContentWithRetry(generateContent, "prompt");
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.response.text()).toBe("ok");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});
