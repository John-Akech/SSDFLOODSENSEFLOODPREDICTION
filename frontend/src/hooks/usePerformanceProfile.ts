import { useEffect, useState } from 'react';

export type PerformanceProfile = {
    shouldReduceMotion: boolean;
    isLowPowerMode: boolean;
    deviceMemory?: number;
    saveDataEnabled?: boolean;
    connectionType?: string;
};

const getConnection = () => {
    if (typeof navigator === 'undefined') return undefined;
    return (navigator as Navigator & { connection?: any }).connection;
};

const readProfile = (): PerformanceProfile => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return { shouldReduceMotion: false, isLowPowerMode: false };
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = getConnection();
    const deviceMemory = typeof (navigator as any).deviceMemory === 'number' ? (navigator as any).deviceMemory : undefined;
    const saveDataEnabled = Boolean(connection?.saveData);
    const connectionType: string | undefined = connection?.effectiveType;
    const slowConnection = connectionType ? ['slow-2g', '2g'].includes(connectionType) : false;
    const lowMemory = typeof deviceMemory === 'number' && deviceMemory <= 2;

    const shouldReduceMotion = mediaQuery.matches || saveDataEnabled || slowConnection || lowMemory;
    const isLowPowerMode = saveDataEnabled || slowConnection || lowMemory;

    return {
        shouldReduceMotion,
        isLowPowerMode,
        deviceMemory,
        saveDataEnabled,
        connectionType
    };
};

export const usePerformanceProfile = (): PerformanceProfile => {
    const [profile, setProfile] = useState<PerformanceProfile>(readProfile);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const connection = getConnection();

        const updateProfile = () => setProfile(readProfile());

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', updateProfile);
        } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(updateProfile);
        }

        if (connection && typeof connection.addEventListener === 'function') {
            connection.addEventListener('change', updateProfile);
        }

        return () => {
            if (typeof mediaQuery.removeEventListener === 'function') {
                mediaQuery.removeEventListener('change', updateProfile);
            } else if (typeof mediaQuery.removeListener === 'function') {
                mediaQuery.removeListener(updateProfile);
            }

            if (connection && typeof connection.removeEventListener === 'function') {
                connection.removeEventListener('change', updateProfile);
            }
        };
    }, []);

    return profile;
};
