import { resolveProtectedRouteRedirect } from "@/lib/auth/routeGuard";

describe("resolveProtectedRouteRedirect", () => {
  it("does not redirect unprotected paths", () => {
    expect(
      resolveProtectedRouteRedirect({ pathname: "/", role: undefined }),
    ).toBeNull();
  });

  it("sends unauthenticated visitors to /sign-in for /student", () => {
    expect(
      resolveProtectedRouteRedirect({ pathname: "/student", role: undefined }),
    ).toBe("/sign-in");
  });

  it("sends unauthenticated visitors to /sign-in for /admin", () => {
    expect(
      resolveProtectedRouteRedirect({ pathname: "/admin", role: undefined }),
    ).toBe("/sign-in");
  });

  it("redirects a STUDENT away from /admin to /student", () => {
    expect(
      resolveProtectedRouteRedirect({ pathname: "/admin", role: "STUDENT" }),
    ).toBe("/student");
  });

  it("redirects an ADMIN away from /student to /admin", () => {
    expect(
      resolveProtectedRouteRedirect({ pathname: "/student", role: "ADMIN" }),
    ).toBe("/admin");
  });

  it("allows a STUDENT on /student", () => {
    expect(
      resolveProtectedRouteRedirect({ pathname: "/student", role: "STUDENT" }),
    ).toBeNull();
  });

  it("allows an ADMIN on /admin", () => {
    expect(
      resolveProtectedRouteRedirect({ pathname: "/admin", role: "ADMIN" }),
    ).toBeNull();
  });

  it("matches nested paths (/admin/jobs/1)", () => {
    expect(
      resolveProtectedRouteRedirect({ pathname: "/admin/jobs/1", role: "STUDENT" }),
    ).toBe("/student");
  });
});
