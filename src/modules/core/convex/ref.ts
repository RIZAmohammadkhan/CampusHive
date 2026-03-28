import type { FunctionReference } from "convex/server"

export const queryRef = <Args extends Record<string, unknown>, ReturnType>(
  name: string
) => name as unknown as FunctionReference<"query", "public", Args, ReturnType>

export const mutationRef = <Args extends Record<string, unknown>, ReturnType>(
  name: string
) =>
  name as unknown as FunctionReference<"mutation", "public", Args, ReturnType>

export const actionRef = <Args extends Record<string, unknown>, ReturnType>(
  name: string
) => name as unknown as FunctionReference<"action", "public", Args, ReturnType>
