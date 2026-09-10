import { VerifyEmailStatus } from "@/app/(auth)/verify-email/VerifyEmailStatus";

/** docs/screens.md §7.2 (feature 28). */
export default async function VerifyEmailPage(props: PageProps<"/verify-email">) {
  const { token } = await props.searchParams;
  const rawToken = typeof token === "string" ? token : null;

  return <VerifyEmailStatus token={rawToken} />;
}
