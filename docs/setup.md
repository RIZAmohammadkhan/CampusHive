# Setup Guide

This guide explains how to run CampusHive locally with Clerk Organizations and Convex.

## Prerequisites

- Node.js 20+
- npm
- A Clerk app
- A Convex deployment

## 1. Install dependencies

```bash
npm install
```

## 2. Add environment variables

Create `.env.local` with:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

## 3. Configure Clerk

CampusHive currently uses Clerk Organizations as campus spaces.

Required settings:

1. Enable Organizations.
2. Require organization membership.
3. Enable organization slugs.
4. Turn on the Convex integration for the Clerk app.

Why this matters:

- Each organization maps to one campus.
- Routes are scoped under `/w/[workspaceSlug]`.
- Convex validates the active Clerk organization claim on every campus-scoped request.

## 4. Configure Convex

1. Create or open your Convex project.
2. Verify `convex/auth.config.ts` matches your Clerk issuer domain.
3. Add `CLERK_JWT_ISSUER_DOMAIN` to Convex env settings if needed.
4. Run:

```bash
npm run convex:dev
```

## 5. Start the app

Keep Convex running:

```bash
npm run convex:dev
```

Start Next.js in another terminal:

```bash
npm run dev
```

Open `http://localhost:3000`.

## 6. First-run behavior

### Signed-out user

- Visits `/`
- Gets redirected to `/sign-in`

### Signed-in user with campus access

- Visits `/`
- Gets redirected to `/w/[workspaceSlug]`
- Convex bootstraps the campus record and syncs the current member

### Signed-in user with no campus access

- Visits `/`
- Gets redirected to `/invite-needed`

## 7. Important routes

- `/sign-in`
- `/sign-up`
- `/invite-needed`
- `/w/[workspaceSlug]`
- `/w/[workspaceSlug]/channels`
- `/w/[workspaceSlug]/projects`
- `/w/[workspaceSlug]/calendar`
- `/w/[workspaceSlug]/docs`
- `/w/[workspaceSlug]/whiteboard`

## 8. Current authorization model

The current live model is still based on `admin` and `member` roles synced from Clerk + Convex.

Implemented today:

- authenticated campus access
- campus scoping through the active Clerk organization
- backend admin checks for club-space creation, event creation, resource creation, and assignee changes
- live member presence and task status updates
- gate pass issuance, gate check-in, and poll persistence with live vote results
- club-scoped event ticket generation with QR codes and clickable member profiles

Not implemented yet:

- manager/officer/member role tiers per club
- club join requests
- camera-based QR generation and scanning

## 9. Verification

Run:

```bash
npm run lint
npm run build
```

## 10. Relevant files

- [src/app/invite-needed/page.tsx](../src/app/invite-needed/page.tsx)
- [src/app/w/[workspaceSlug]/layout.tsx](../src/app/w/[workspaceSlug]/layout.tsx)
- [src/components/app/sidebar.tsx](../src/components/app/sidebar.tsx)
- [src/components/app/topbar.tsx](../src/components/app/topbar.tsx)
- [src/components/app/live-office-page.tsx](../src/components/app/live-office-page.tsx)
- [src/components/app/live-channels-page.tsx](../src/components/app/live-channels-page.tsx)
- [src/components/app/live-projects-page.tsx](../src/components/app/live-projects-page.tsx)
- [src/components/app/live-calendar-page.tsx](../src/components/app/live-calendar-page.tsx)
- [src/components/app/live-docs-page.tsx](../src/components/app/live-docs-page.tsx)
- [src/components/app/live-whiteboard-page.tsx](../src/components/app/live-whiteboard-page.tsx)
- [convex/workspaces.ts](../convex/workspaces.ts)
- [convex/chat.ts](../convex/chat.ts)
- [convex/projects.ts](../convex/projects.ts)
- [convex/events.ts](../convex/events.ts)
- [convex/resources.ts](../convex/resources.ts)
- [convex/whiteboard.ts](../convex/whiteboard.ts)
