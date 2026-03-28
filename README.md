# CampusHive

CampusHive is a connected digital campus for college clubs, events, and student community operations.

This refactor keeps the existing working Clerk + Convex foundation, but reshapes the product from a generic digital office into a campus community platform.

## What This Build Includes

- Campus-scoped auth and routing with Clerk Organizations
- A Campus Hub dashboard at `/w/[workspaceSlug]`
- Club spaces with realtime Convex-backed chat
- An Event Ops board with assignees and live task status updates
- A shared events calendar with admin event creation
- A resources library for playbooks, notes, and reusable context
- A Gate & Polls control-room surface built around live presence and next-step modules

## Current Stack

- Next.js 16
- React 19
- TypeScript
- Clerk
- Convex
- Tailwind CSS v4
- shadcn/ui
- Fraunces + Geist via `next/font`
- Sonner

## Important Note

The product brief mentions Convex Auth and Next.js 15. This repository currently continues to use Clerk Organizations plus Convex because that integration is already working correctly in the codebase, and this refactor preserves it.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` and add:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 3. Configure Clerk

CampusHive currently treats each Clerk Organization as one campus space.

Required settings:

1. Enable Organizations.
2. Use required organization membership.
3. Enable organization slugs.
4. Activate the Convex integration for the app.

### 4. Configure Convex

1. Create or open a Convex deployment.
2. Make sure `convex/auth.config.ts` uses the same Clerk issuer domain.
3. Add `CLERK_JWT_ISSUER_DOMAIN` to Convex environment settings if needed.
4. Run:

```bash
npm run convex:dev
```

### 5. Start the app

In one terminal:

```bash
npm run convex:dev
```

In another:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Route Structure

- `/sign-in`
- `/sign-up`
- `/invite-needed`
- `/w/[workspaceSlug]`
- `/w/[workspaceSlug]/channels`
- `/w/[workspaceSlug]/channels/[...slug]`
- `/w/[workspaceSlug]/projects`
- `/w/[workspaceSlug]/calendar`
- `/w/[workspaceSlug]/docs`
- `/w/[workspaceSlug]/whiteboard`

## Product Mapping

- Clerk Organization = campus
- Channel = club space
- Task board = event operations
- Calendar = events and meetings
- Docs = resources and reusable context
- Whiteboard route = gate passes, polls, and notification control room

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
npm run convex:dev
npm run convex:deploy
```

## Key Files

- `src/app/layout.tsx`: global app layout and metadata
- `src/app/globals.css`: CampusHive design tokens and shared surface styles
- `src/components/app/sidebar.tsx`: campus navigation
- `src/components/app/topbar.tsx`: page framing and campus controls
- `src/components/app/live-office-page.tsx`: Campus Hub
- `src/components/app/live-channels-page.tsx`: club discovery and creation
- `src/components/app/live-projects-page.tsx`: Event Ops board
- `src/components/app/live-calendar-page.tsx`: shared events calendar
- `src/components/app/live-docs-page.tsx`: resources library
- `src/components/app/live-whiteboard-page.tsx`: gate and polling control room
- `convex/workspaces.ts`: campus bootstrap and directory sync
- `convex/chat.ts`: club-space conversations
- `convex/projects.ts`: event task board logic
- `convex/events.ts`: events calendar queries and mutation
- `convex/resources.ts`: resources library queries and mutation

## Current Status

Implemented now:

- Campus-focused branding and design system
- Campus Hub shell and navigation
- Club spaces with realtime chat
- Event task creation, assignment, and live status changes
- Shared event creation and grouped calendar view
- Resource creation and library view
- Control-room style surface for passes, polls, and notifications

Not wired yet:

- Actual join-request flows for clubs
- QR code generation and scanning
- Poll persistence and live vote results
- Automatic virtual room creation
- Fine-grained manager/officer permission layers beyond current admin/member roles

## Verification

Run:

```bash
npm run lint
npm run build
```
