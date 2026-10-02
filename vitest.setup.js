// to remove errors du to React Suite

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {}, // Deprecated
        removeListener: () => {}, // Deprecated
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
    }),
});

// jsdom measures no element: the scroll frames of Radix (components/ui/scroll-area.jsx) watch their size
window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
