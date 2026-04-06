// Convex trusts Clerk JWTs.
// Set CLERK_JWT_ISSUER_DOMAIN in your Convex dashboard environment variables.

import { AuthConfig } from "convex/server";

// Value: https://<your-clerk-instance>.clerk.accounts.dev
const authConfig: AuthConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
