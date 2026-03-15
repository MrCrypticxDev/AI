import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public routes — no auth required
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/scan(.*)',
  '/api/events(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
])

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const CLERK_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
)

export default clerkMiddleware((auth, req) => {
  // Guard against edge middleware crashes on deployments missing Clerk env.
  // In demo mode (or missing Clerk config), allow pass-through auth.
  if (DEMO_MODE || !CLERK_CONFIGURED) {
    return
  }

  if (!isPublicRoute(req)) {
    auth().protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip)).*)',
    '/(api|trpc)(.*)',
  ],
}
