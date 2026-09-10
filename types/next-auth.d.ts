import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/schemas/user";

declare module "next-auth" {
  interface User {
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

// Augmenting the standard "@auth/core/jwt" specifier (the module next-auth's
// own JWT callback type actually resolves through internally via a relative
// import). npm doesn't reliably hoist @auth/core to the top-level
// node_modules — it can end up nested under next-auth/node_modules/@auth/core
// instead — so tsconfig.json's `paths` maps this exact specifier to whichever
// physical file is really there, keeping this augmentation resolvable
// regardless of how npm's install happens to lay out the tree.
declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
  }
}
