import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'العربية', flag: '🇸🇩' },
    { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' }
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-lg rounded-xl border border-white/40 hover:bg-white transition-all shadow-md hover:shadow-lg"
      >
        <span className="text-xl">{currentLang.flag}</span>
        <span className="font-bold text-gray-900">{currentLang.name}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden z-50 min-w-[180px]">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-ocean-50 hover:to-cyan-50 transition-all ${
                language === lang.code ? 'bg-gradient-to-r from-ocean-100 to-cyan-100' : ''
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="font-bold text-gray-900">{lang.name}</span>
              {language === lang.code && (
                <svg className="w-5 h-5 text-ocean-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
