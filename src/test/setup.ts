import '@testing-library/jest-dom';
import { vi } from 'vitest';

if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {} as Crypto;
}

Object.defineProperty(globalThis.crypto, 'randomUUID', {
  value: () => vi.fn().mockReturnValue('test-uuid-1234')(),
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
