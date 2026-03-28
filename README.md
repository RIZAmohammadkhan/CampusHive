# CampusHive

CampusHive is a live college club operating system for discovery, club membership, events, and student operations.

This refactor keeps the existing Clerk + Convex foundation, but reshapes the product around the real student and organizer workflow inside a college club ecosystem.

## What This Build Includes

- Campus-scoped auth and routing with Clerk Organizations
- A Campus Hub dashboard at `/w/[workspaceSlug]`
- Club spaces with realtime Convex-backed chat
- Club categories plus open-club and approval-based joining flows
- Club-native event tickets with QR generation and attendee check-in
- An Event Ops board with assignees and live task status updates
- A shared events calendar with admin event creation
- A resources library for playbooks, notes, and reusable context
- A Gate & Polls control room with live pass issuance, desk check-in, and realtime voting

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

CampusHive currently treats each Clerk Organization as one college workspace.

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

## Module Layout

The app is now organized under `src/modules` so teams can work mostly inside a single domain folder instead of editing shared buckets.

- `src/modules/workspace`: app shell, workspace bootstrap, member directory, profile sheet, shared section registry
- `src/modules/dashboard`: Campus Hub page and dashboard Convex contract
- `src/modules/channels`: club discovery, channel detail, club tickets, and chat Convex contract
- `src/modules/projects`: Event Ops board and task mutations
- `src/modules/events`: calendar page and event creation
- `src/modules/resources`: resource library page and resource mutations
- `src/modules/whiteboard`: gate control room and polling flows
- `src/modules/presence`: presence API and presence UI primitives
- `src/modules/shared`: cross-module UI primitives like loading states
- `src/lib/convex-api.ts`: compatibility barrel that now re-exports module-owned APIs instead of defining everything in one file

This means parallel work usually stays inside one module:

- feature UI in `src/modules/<feature>/components`
- feature Convex references in `src/modules/<feature>/api.ts`
- workspace chrome metadata in each feature `manifest.ts`

## Product Mapping

- Clerk Organization = college workspace
- Channel = club space
- Task board = event operations
- Calendar = events and meetings
- Docs = resources and reusable context
- Whiteboard route = gate passes and live campus polls

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
- `src/modules/workspace/components/sidebar.tsx`: campus navigation driven by module manifests
- `src/modules/workspace/components/topbar.tsx`: page framing and campus controls
- `src/modules/workspace/sections.ts`: shared section registry for nav, titles, and runtime rooms
- `src/modules/dashboard/components/live-office-page.tsx`: Campus Hub
- `src/modules/channels/components/live-channels-page.tsx`: club discovery and creation
- `src/modules/channels/components/live-channel-page.tsx`: club detail, messages, tickets, and polls
- `src/modules/projects/components/live-projects-page.tsx`: Event Ops board
- `src/modules/events/components/live-calendar-page.tsx`: shared events calendar
- `src/modules/resources/components/live-docs-page.tsx`: resources library
- `src/modules/whiteboard/components/live-whiteboard-page.tsx`: gate and polling control room
- `src/lib/convex-api.ts`: compatibility barrel over module-owned Convex contracts
- `convex/workspaces.ts`: campus bootstrap and directory sync
- `convex/chat.ts`: club-space conversations
- `convex/projects.ts`: event task board logic
- `convex/events.ts`: events calendar queries and mutation
- `convex/resources.ts`: resources library queries and mutation
- `convex/whiteboard.ts`: gate pass issuance, check-in, and poll logic

## Current Status

Implemented now:

- College-focused branding and design system
- Campus Hub shell and navigation
- Club spaces with realtime chat
- Club categories plus open-club and approval-based join flows
- Club event creation, QR ticket claiming, and attendee check-in inside each club
- Event task creation, assignment, and live status changes
- Shared event creation and grouped calendar view
- Resource creation and library view
- Clickable member profiles with organization, club memberships, and recent tickets
- Gate pass issuance, code-based check-in, and live poll creation/results

Not wired yet:

- Camera-based QR generation and scanning
- Automatic virtual room creation
- Fine-grained role layers beyond current workspace admin/member plus club owner/officer/member

## Verification

Run:

```bash
npm run lint
npm run build
```
