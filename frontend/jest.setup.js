/* eslint-env node */
// Mock import.meta for Jest
const importMeta = {
    env: {
        VITE_VAPID_PUBLIC_KEY: 'test-vapid-key',
        VITE_API_URL: '/api/v1',
        VITE_SAR_URL: '/sar',
    },
};

// Make import.meta available globally
global.import = {
    meta: importMeta,
};
