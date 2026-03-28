# Vercel Deployment Guide

Last checked: 2026-03-29

This guide explains how to deploy CampusHive to Vercel with Clerk for auth and Convex for realtime backend data.

## Deployment architecture

- Vercel hosts the Next.js app.
- Clerk handles authentication and organizations.
- Convex hosts the backend functions, schema, indexes, and realtime data.

For this repo, a correct deployment means:

- Vercel has the right Clerk environment variables.
- Convex has the right Clerk environment variables.
- Clerk production is configured for organizations and your production domain.
- The frontend build uses the correct `NEXT_PUBLIC_CONVEX_URL`.

## What this app expects

This repo currently depends on these variables in Next.js:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

This repo also expects these variables in Convex:

```env
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
```

Why both places matter:

- Next.js needs Clerk keys and the public Convex URL.
- Convex needs the Clerk issuer for auth validation.
- Convex also calls the Clerk API in `convex/clerkSync.ts`, so it needs `CLERK_SECRET_KEY`.

## Before you start

- Node.js 20+ locally
- A Vercel account
- A Clerk production instance
- A Convex project with a production deployment

## 1. Prepare Clerk production

Create or open your Clerk production instance and configure it for the same app shape this repo uses.

Required Clerk settings:

1. Enable Organizations.
2. Require organization membership.
3. Enable organization slugs.
4. Enable the Convex integration for the Clerk app.

Collect these values from Clerk:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`

Important:

- CampusHive maps one Clerk Organization to one campus workspace.
- Workspace routes depend on organization slugs under `/w/[workspaceSlug]`.
- Clerk production should use your real production domain.
- Clerk does not support a `vercel.app` URL as your production application URL, so plan to use a custom domain on Vercel.

If you use social login, also configure production OAuth credentials in Clerk before launch.

## 2. Prepare Convex production

Make sure your local repo is already linked to the correct Convex project.

Set the required Convex production environment variables:

```bash
npx convex env set --prod CLERK_SECRET_KEY
npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN
```

Use the same production Clerk values you collected in step 1.

## 3. Choose your deployment style

There are two workable ways to deploy this repo on Vercel.

### Recommended: automated Vercel + Convex deploy

Use Vercel to trigger both:

- `next build`
- `convex deploy`

This keeps frontend and backend changes in sync on each deployment.

Use this Vercel Build Command:

```bash
npx convex deploy --cmd "npm run build" --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

Why this is the best fit for this repo:

- The app reads `NEXT_PUBLIC_CONVEX_URL`.
- Convex can inject that URL into the build command.
- Your deployed frontend always points at the exact Convex deployment used for that build.

### Alternative: manual Convex deploy

Use Vercel only for the frontend build:

```bash
npm run build
```

If you choose this path, you must:

1. Run `npx convex deploy` yourself before or alongside the Vercel deployment.
2. Manually set `NEXT_PUBLIC_CONVEX_URL` in Vercel to your production Convex URL.

This works, but it is easier for frontend and backend to drift apart.

## 4. Create the Vercel project

Import the repository into Vercel.

Recommended project settings:

- Framework Preset: `Next.js`
- Root Directory: repo root
- Install Command: `npm install`
- Build Command:
  Use the recommended Convex command above unless you intentionally want the manual path.

This repo does not need a `vercel.json` file for a normal deployment.

## 5. Add Vercel environment variables

Set these in Vercel Project Settings.

### Required Vercel variables

| Variable | Production | Preview | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Required | Required if preview auth should work | Use Clerk keys for the instance that preview/prod should use |
| `CLERK_SECRET_KEY` | Required | Required if preview auth should work | Server-side Clerk secret |
| `CLERK_JWT_ISSUER_DOMAIN` | Required | Required if preview auth should work | Must match Clerk and Convex |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | `/sign-in` | Keep as-is unless routes change |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | `/sign-up` | Keep as-is unless routes change |

### Required for the recommended automated Convex flow

| Variable | Production | Preview | Notes |
| --- | --- | --- | --- |
| `CONVEX_DEPLOY_KEY` | Required | Required if Preview deployments use the automated Convex build command | Use a Production Deploy Key in Production and a Preview Deploy Key in Preview |

Important:

- Do not reuse a production `CONVEX_DEPLOY_KEY` for Preview deployments.
- If you want Preview deployments to work with Convex, create a Convex Preview Deploy Key and store that in Vercel Preview envs.
- Vercel uses one build command per project. If your project uses the automated Convex build command, Preview deployments also need a valid Preview `CONVEX_DEPLOY_KEY` or the preview build will fail.
- If you do not want Convex-backed previews, use the manual Convex deployment style instead of the automated build-command style.

### Only for the manual Convex flow

If you are not using the automated Convex build command, also add:

| Variable | Production | Preview | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Required | Required if preview uses Convex | Manually point the frontend at the correct Convex deployment |

## 6. Add a custom domain in Vercel

Before launching production, add a real domain to the Vercel project.

After the Vercel domain is verified:

1. Set it as the production domain in Vercel.
2. Update your Clerk production domain settings to match it.
3. Review any Clerk OAuth redirect URIs if you use social auth.

Do not treat `*.vercel.app` as the final production URL for Clerk.

## 7. First production deploy

### If you use the recommended automated Convex flow

1. Add all Production env vars in Vercel.
2. Set the Build Command to:

```bash
npx convex deploy --cmd "npm run build" --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

3. Trigger a production deployment from Vercel.

What happens during the build:

- Convex deploys backend code, schema, and indexes.
- Convex injects `NEXT_PUBLIC_CONVEX_URL` into the build command.
- Vercel builds the Next.js app against that backend URL.

### If you use the manual Convex flow

1. Run:

```bash
npx convex deploy
```

2. Copy the production Convex URL from the Convex dashboard.
3. Add `NEXT_PUBLIC_CONVEX_URL` to Vercel Production env vars.
4. Trigger a Vercel production deployment.

## 8. Preview deployment setup

If you want working Preview deployments:

1. Add Preview env vars in Vercel for Clerk.
2. Add a Preview `CONVEX_DEPLOY_KEY` from Convex.
3. Keep the same build command:

```bash
npx convex deploy --cmd "npm run build" --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

With a Preview Deploy Key, Convex can create and deploy a branch-specific preview backend for Vercel previews.

If you do not want preview auth or preview backends, keep previews internal or disable them until they are configured.

## 9. Smoke test after deploy

Run this checklist on the live deployment:

1. Visit `/`.
2. Confirm signed-out users are redirected to `/sign-in`.
3. Sign in with a user who belongs to a Clerk Organization.
4. Confirm the app redirects to `/w/[workspaceSlug]`.
5. Confirm the workspace slug matches the Clerk organization slug.
6. Open Messages, Clubs, People, Projects, Calendar, and Tickets.
7. Create or update one Convex-backed item such as a message, event, or task.
8. Confirm the change persists and updates live.

## 10. Troubleshooting

### Sign-in works, but campus routes fail

Check:

- Clerk Organizations are enabled.
- Required organization membership is enabled.
- Organization slugs are enabled.
- The signed-in user actually belongs to the organization matching the URL slug.

### The app shows a Convex setup notice in production

This usually means the frontend build did not receive `NEXT_PUBLIC_CONVEX_URL`.

Check:

- You used the Convex build command, or
- You manually set `NEXT_PUBLIC_CONVEX_URL` in Vercel

### Convex auth errors or unauthorized requests

Check:

- `CLERK_JWT_ISSUER_DOMAIN` in Vercel
- `CLERK_JWT_ISSUER_DOMAIN` in Convex
- The value matches the Clerk production instance exactly

### Member profile repair or Clerk sync actions fail

Check:

- `CLERK_SECRET_KEY` exists in Convex production env vars
- The secret belongs to the same Clerk instance used by the app

### Preview builds accidentally touched production data

This usually means Preview used a production `CONVEX_DEPLOY_KEY`.

Fix:

- Replace the Preview key with a Convex Preview Deploy Key
- Redeploy the preview

## 11. Post-deploy hardening

After the app is live, review these items:

- Add the final production domain everywhere Clerk expects it.
- If you use social auth, switch every provider to production credentials.
- Consider explicitly configuring Clerk `authorizedParties` for your production origin allowlist.npm run lint
npm run build
npx convex deploy
npx convex env list --prod
- Keep Clerk and Convex secrets identical across the systems only where they are meant to match.

## 12. Useful commands

```bash
npm run lint
npm run build
npx convex deploy
npx convex env list --prod
```

## 13. References

- Vercel environment variables: https://vercel.com/docs/environment-variables/manage-across-environments
- Vercel deploy flow: https://vercel.com/docs/projects/deploy-from-cli
- Clerk production deployment: https://clerk.com/docs/guides/development/deployment/production
- Clerk + custom domain note for Vercel deployments: https://clerk.com/docs/deployments/deploy-to-vercel
- Convex CLI deploy guide: https://docs.convex.dev/cli
- Convex hosting and custom domains: https://docs.convex.dev/production/hosting/custom
