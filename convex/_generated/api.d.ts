/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chat from "../chat.js";
import type * as dashboard from "../dashboard.js";
import type * as events from "../events.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_workspaces from "../lib/workspaces.js";
import type * as presence from "../presence.js";
import type * as projects from "../projects.js";
import type * as resources from "../resources.js";
import type * as types from "../types.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  dashboard: typeof dashboard;
  events: typeof events;
  "lib/auth": typeof lib_auth;
  "lib/workspaces": typeof lib_workspaces;
  presence: typeof presence;
  projects: typeof projects;
  resources: typeof resources;
  types: typeof types;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
