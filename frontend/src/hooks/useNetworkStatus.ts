import { useEffect, useState } from 'react';

type NetworkStatus = {
    isOffline: boolean;
    isOnline: boolean;
};

export const useNetworkStatus = (): NetworkStatus => {
    const getInitialStatus = () => {
        if (typeof navigator === 'undefined') {
            return { isOffline: false, isOnline: true };
        }
        return { isOffline: !navigator.onLine, isOnline: navigator.onLine };
    };

    const [status, setStatus] = useState<NetworkStatus>(getInitialStatus);

    useEffect(() => {
        const handleOnline = () => setStatus({ isOffline: false, isOnline: true });
        const handleOffline = () => setStatus({ isOffline: true, isOnline: false });

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return status;
};
