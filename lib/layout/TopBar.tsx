import { NSButton, NSTypography } from "@newtonschool/grauity";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";

interface TopBarProps {
  name: string;
  email: string;
  onSignOut: () => Promise<void>;
}

/** docs/screens.md §1: identity + sign-out, previously duplicated in every page's own header. */
export function TopBar({ name, email, onSignOut }: TopBarProps) {
  return (
    // role="banner" instead of a plain <header> — see the same cascade-
    // layer note in Sidebar.tsx (Grauity's CSS resets nav/header/etc to
    // display:block, unlayered, which beats Tailwind's layered `flex`).
    <div role="banner" className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
        {name} · {email}
      </NSTypography>
      <form action={onSignOut}>
        <NSButton variant="tertiary" type="submit">
          Sign out
        </NSButton>
      </form>
    </div>
  );
}
