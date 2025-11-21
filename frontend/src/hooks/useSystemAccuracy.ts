import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../services/api';

type AccuracyCache = {
    value: number | null;
    fetchedAt: number | null;
};

const CACHE_TTL_MS = 30_000;
const cache: AccuracyCache = {
    value: null,
    fetchedAt: null
};
let inFlightPromise: Promise<number | null> | null = null;

const readCache = (): { value: number | null; fetchedAt: number | null } => {
    if (cache.value === null || cache.fetchedAt === null) {
        return { value: null, fetchedAt: null };
    }
    const isStale = Date.now() - cache.fetchedAt > CACHE_TTL_MS;
    if (isStale) {
        cache.value = null;
        cache.fetchedAt = null;
        return { value: null, fetchedAt: null };
    }
    return { value: cache.value, fetchedAt: cache.fetchedAt };
};

const writeCache = (value: number | null) => {
    cache.value = value;
    cache.fetchedAt = Date.now();
};

export const formatAccuracyPercent = (value: number | null, fractionDigits = 1): string => {
    if (value === null || Number.isNaN(value)) return '—';
    const percent = Math.max(0, Math.min(100, value * 100));
    return `${percent.toFixed(fractionDigits)}%`;
};

export const useSystemAccuracy = (options?: { refreshIntervalMs?: number }) => {
    const { refreshIntervalMs } = options || {};
    const [{ value, fetchedAt }, setState] = useState(() => readCache());
    const [isLoading, setIsLoading] = useState(!value);
    const intervalRef = useRef<ReturnType<typeof setInterval>>();

    const fetchAccuracy = useCallback(async () => {
        if (inFlightPromise) {
            const result = await inFlightPromise;
            setState({ value: result, fetchedAt: Date.now() });
            setIsLoading(false);
            return result;
        }

        inFlightPromise = (async () => {
            try {
                const stats = await apiService.getSystemStats();
                const accuracy = (stats?.accuracy_metrics?.overall_accuracy ?? null) as number | null;
                writeCache(accuracy);
                setState({ value: accuracy, fetchedAt: Date.now() });
                setIsLoading(false);
                return accuracy;
            } catch (error) {
                console.error('Failed to fetch system accuracy:', error);
                setIsLoading(false);
                return null;
            } finally {
                inFlightPromise = null;
            }
        })();

        return inFlightPromise;
    }, []);

    useEffect(() => {
        const cached = readCache();
        if (!cached.value) {
            fetchAccuracy();
        } else {
            setIsLoading(false);
            setState(cached);
        }
    }, [fetchAccuracy]);

    useEffect(() => {
        if (!refreshIntervalMs) return;
        intervalRef.current = setInterval(fetchAccuracy, refreshIntervalMs);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchAccuracy, refreshIntervalMs]);

    return {
        accuracyDecimal: value,
        accuracyPercent: value !== null ? value * 100 : null,
        accuracyLabel: formatAccuracyPercent(value),
        lastUpdated: fetchedAt ? new Date(fetchedAt).toISOString() : null,
        isLoading,
        refresh: fetchAccuracy
    };
};
