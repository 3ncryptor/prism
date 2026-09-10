import { rejectIfOversized } from "@/lib/http/rejectIfOversized";

const TEN_MB = 10 * 1024 * 1024;

function makeRequest(contentLength: string | null): Request {
  const headers = new Headers();
  if (contentLength !== null) headers.set("content-length", contentLength);
  return new Request("https://prism.example.edu/api/resumes", { method: "POST", headers });
}

describe("rejectIfOversized", () => {
  it("allows a request with no Content-Length header (streamed/chunked)", () => {
    expect(rejectIfOversized(makeRequest(null), TEN_MB)).toBeNull();
  });

  it("allows a request comfortably under the limit", () => {
    expect(rejectIfOversized(makeRequest(String(5 * 1024 * 1024)), TEN_MB)).toBeNull();
  });

  it("allows a request within the multipart overhead slack just above the limit", () => {
    expect(rejectIfOversized(makeRequest(String(TEN_MB + 500 * 1024)), TEN_MB)).toBeNull();
  });

  it("rejects with 413 when Content-Length exceeds the limit plus overhead slack", async () => {
    const result = rejectIfOversized(makeRequest(String(50 * 1024 * 1024)), TEN_MB);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(413);
    const body = await result?.json();
    expect(body.error).toMatch(/too large/i);
  });

  it("allows a request with a non-numeric Content-Length rather than crashing", () => {
    expect(rejectIfOversized(makeRequest("not-a-number"), TEN_MB)).toBeNull();
  });
});
