import { vi } from 'vitest'

// Mock React.act for React 19 compatibility
globalThis.React = {
  ...globalThis.React,
  act: vi.actual(() => {
    throw new Error(
      'React.act is deprecated. ' +
      'Render using render() from @testing-library/react instead. ' +
      'All of your tests should work without calling React.act() directly.'
    )
  }),
}
