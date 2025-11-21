import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationBell from '../NotificationBell';
import { apiService } from '../../services/api';
import { reverseGeocode } from '../../services/geocoding';

jest.mock('../../services/api', () => ({
    apiService: {
        getActiveAlerts: jest.fn(),
        pushSubscribe: jest.fn(),
    },
}));

jest.mock('../../services/geocoding', () => ({
    reverseGeocode: jest.fn(),
}));

const mockAlerts = [
    {
        id: 1,
        title: 'High Risk',
        severity: 'high',
        description: 'River levels are rising rapidly.',
        latitude: 6.8,
        longitude: 31.3,
        confidence: 0.9,
        timestamp: new Date().toISOString(),
    },
];

describe('NotificationBell', () => {
    beforeEach(() => {
        localStorage.clear();
        (globalThis as { __APP_ENV__?: Record<string, string> }).__APP_ENV__ = {
            VITE_VAPID_PUBLIC_KEY: 'test-vapid-key',
        };
        (apiService.getActiveAlerts as jest.Mock).mockResolvedValue({ alerts: mockAlerts });
        (reverseGeocode as jest.Mock).mockResolvedValue('Bor, Jonglei');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders unread badge and fetched alert details', async () => {
        render(<NotificationBell />);

        await waitFor(() => expect(apiService.getActiveAlerts).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

        expect(await screen.findByText(/1 active warning/i)).toBeInTheDocument();
        const severityLabels = await screen.findAllByText(/high risk/i);
        expect(severityLabels.length).toBeGreaterThan(0);
        expect(screen.getByText(/bor, jonglei/i)).toBeInTheDocument();
    });
});
