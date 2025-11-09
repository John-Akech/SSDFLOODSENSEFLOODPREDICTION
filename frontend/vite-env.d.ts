/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    // add more env variables as needed
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Declare modules for image imports
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
