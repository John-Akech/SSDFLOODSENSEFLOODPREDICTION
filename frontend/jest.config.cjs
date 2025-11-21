const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
    testEnvironment: 'jsdom',
    clearMocks: true,
    maxWorkers: 2,
    setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'],
    testMatch: ['<rootDir>/src/**/*.(spec|test).(ts|tsx)'],
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.jest.json',
                diagnostics: {
                    ignoreCodes: ['TS151001'],
                },
            },
        ],
    },
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
            prefix: '<rootDir>/',
        }),
    },
};
