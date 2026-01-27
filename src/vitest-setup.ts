// Mock React.act for React 19 compatibility
// In React 19, act() is no longer required for most test scenarios
globalThis.React = {
  ...globalThis.React,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  act: ((fn: any) => fn()) as (fn: () => void) => Promise<void>,
}