import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isPaymentsApiRoute = createRouteMatcher(["/api/payments(.*)"]);

export default clerkMiddleware(
  async (auth, request) => {
    const authState = await auth();

    if (isAdminRoute(request)) {
      if (!authState.userId) {
        return authState.redirectToSignIn({ returnBackUrl: request.url });
      }
    }

    if (isPaymentsApiRoute(request)) {
      if (!authState.userId) {
        return NextResponse.json(
          {
            error: "UNAUTHORIZED",
            message: "Authentication is required.",
          },
          { status: 401 },
        );
      }
    }

    return NextResponse.next();
  },
  {
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  },
);

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
