// flow-typed signature: 83c416de68c62add9a5f5c1178d383bb
// flow-typed version: 15b5072ad2/promise-retry_v1.1.x/flow_>=v0.45.x

type RetryFn = (err?: Error) => void;
type Options = {|
  retries?: number,
  factor?: number,
  minTimeout?: number,
  maxTimeout?: number,
  randomize?: boolean,
|};

declare module 'promise-retry' {
  declare export type RetryOptions = Options;

  declare module.exports: <T>(
    handler: (retry: RetryFn, retryNumber: Number) => Promise<T>,
    options?: Options
  ) => Promise<T>;
}
