import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';

describe('ProtectedRoute', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('blocks access when no token is present', () => {
        render(
            <ProtectedRoute>
                <div>Private Content</div>
            </ProtectedRoute>
        );

        expect(
            screen.getByRole('heading', { name: /authentication required/i })
        ).toBeInTheDocument();
        expect(screen.queryByText(/private content/i)).not.toBeInTheDocument();
    });

    it('denies access when role requirements are not met', () => {
        localStorage.setItem('token', 'test-token');
        localStorage.setItem('userRole', 'community_member');

        render(
            <ProtectedRoute requiredRole="ngo_partner">
                <div>Restricted Content</div>
            </ProtectedRoute>
        );

        expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
        expect(screen.queryByText(/restricted content/i)).not.toBeInTheDocument();
    });

    it('renders children when token and role requirements are satisfied', () => {
        localStorage.setItem('token', 'test-token');
        localStorage.setItem('userRole', 'admin');

        render(
            <ProtectedRoute requireAdmin>
                <div>Dashboard</div>
            </ProtectedRoute>
        );

        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
});
