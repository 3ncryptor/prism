import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LandingContent } from "@/app/LandingContent";

/** docs/screens.md §4.1 (feature 27b). */
export default async function Home() {
  const session = await getSession();
  if (session?.user.role === "STUDENT") {
    redirect("/student");
  }
  if (session?.user.role === "ADMIN") {
    redirect("/admin");
  }

  return <LandingContent />;
}
