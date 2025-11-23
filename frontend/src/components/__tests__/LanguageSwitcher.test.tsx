import { fireEvent, render, screen } from '@testing-library/react';
import LanguageSwitcher from '../LanguageSwitcher';
import { LanguageProvider } from '../../i18n/LanguageContext';

const renderWithProvider = () =>
    render(
        <LanguageProvider>
            <LanguageSwitcher />
        </LanguageProvider>
    );

describe('LanguageSwitcher', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.lang = 'en';
    });

    it('opens the language menu and shows available locales', () => {
        renderWithProvider();

        fireEvent.click(screen.getByRole('button', { name: /floodsense/i }));

        expect(screen.getAllByText(/floodsense/i).length).toBeGreaterThan(1);
        expect(screen.getByText('العربية')).toBeInTheDocument();
    });

    it('updates the selected language and html lang attribute', () => {
        renderWithProvider();

        fireEvent.click(screen.getByRole('button', { name: /floodsense/i }));
        fireEvent.click(screen.getByText(/kiswahili/i));

        expect(screen.getByRole('button', { name: /kiswahili/i })).toBeInTheDocument();
        expect(document.documentElement.lang).toBe('sw');
        expect(localStorage.getItem('language')).toBe('sw');
    });
});
