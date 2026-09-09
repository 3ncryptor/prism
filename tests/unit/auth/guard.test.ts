import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { getSession } from "@/lib/auth/session";

jest.mock("../../../lib/auth/session", () => ({ getSession: jest.fn() }));

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;

describe("requireRole", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("throws UnauthorizedError when there is no session", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(requireRole("ADMIN")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws ForbiddenError when the session role does not match", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: "1", email: "s@prism.dev", name: "S", role: "STUDENT" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    });

    await expect(requireRole("ADMIN")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns the session when the role matches", async () => {
    const session = {
      user: { id: "1", email: "a@prism.dev", name: "A", role: "ADMIN" as const },
      expires: new Date(Date.now() + 60_000).toISOString(),
    };
    mockedGetSession.mockResolvedValue(session);

    await expect(requireRole("ADMIN")).resolves.toEqual(session);
  });
});
