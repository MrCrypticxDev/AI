import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Public routes — no auth required
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/scan(.*)',
  '/api/events(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware((auth, req) => {
  // If DEMO_MODE is enabled, skip all auth checks
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return NextResponse.next()
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
