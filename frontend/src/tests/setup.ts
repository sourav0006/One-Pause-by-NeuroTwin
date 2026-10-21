import '@testing-library/jest-dom';

// Mock ResizeObserver for jsdom test environment (used by React Flow)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock as any;
