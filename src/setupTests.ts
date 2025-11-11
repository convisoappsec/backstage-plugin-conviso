import '@testing-library/jest-dom';

if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

if (typeof global.BroadcastChannel === 'undefined') {
  global.BroadcastChannel = class BroadcastChannel {
    name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    
    constructor(name: string) {
      this.name = name;
    }
    
    postMessage(_message: any): void {
      // Mock implementation
    }
    
    close(): void {
      // Mock implementation
    }
    
    addEventListener(_type: string, _listener: EventListener): void {
      // Mock implementation
    }
    
    removeEventListener(_type: string, _listener: EventListener): void {
      // Mock implementation
    }
  } as any;
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: jest.fn().mockReturnValue({
    createLinearGradient: jest.fn().mockReturnValue({
      addColorStop: jest.fn(),
    }),
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  }),
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = (...args) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    // Suppress known warnings from dependencies
    if (
      message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('React Router Future Flag Warning') ||
      message.includes('Support for defaultProps will be removed') ||
      message.includes('findDOMNode is deprecated')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.error = (...args) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    // Suppress known warnings from dependencies
    if (
      message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('Support for defaultProps will be removed') ||
      message.includes('findDOMNode is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
