import '@testing-library/jest-dom'
import { vi, expect, describe, it, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

// Mock ResizeObserver for Monaco Editor
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))