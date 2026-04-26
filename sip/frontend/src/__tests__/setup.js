import '@testing-library/jest-dom';

// Suppress Ant Design icon/svg warnings in test output
global.SVGElement = global.Element;

// Minimal localStorage stub (jsdom provides one, but some AntD internals read window.matchMedia)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
