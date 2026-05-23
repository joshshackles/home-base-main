import type { PlatformContext } from "@/lib/platform/types";

export type PlatformQuery<Input, Output> = (ctx: PlatformContext, input: Input) => Promise<Output>;
export type PlatformCommand<Input, Output> = (ctx: PlatformContext, input: Input) => Promise<Output>;

export function definePlatformQuery<Input, Output>(query: PlatformQuery<Input, Output>) {
  return query;
}

export function definePlatformCommand<Input, Output>(command: PlatformCommand<Input, Output>) {
  return command;
}
