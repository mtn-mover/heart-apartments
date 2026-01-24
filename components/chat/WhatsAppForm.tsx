'use client';

import { useState } from 'react';

interface WhatsAppFormProps {
  onSubmit: (data: { name: string; contact: string; question: string }) => void;
  onCancel: () => void;
  locale: string;
  prefillQuestion?: string;
}

const translations: Record<string, Record<string, string>> = {
  title: {
    de: 'Diana kontaktieren',
    en: 'Contact Diana',
    fr: 'Contacter Diana',
  },
  subtitle: {
    de: 'Diana wird sich so schnell wie möglich bei dir melden.',
    en: 'Diana will get back to you as soon as possible.',
    fr: 'Diana vous répondra dès que possible.',
  },
  namePlaceholder: {
    de: 'Dein Name',
    en: 'Your name',
    fr: 'Votre nom',
  },
  contactPlaceholder: {
    de: 'Email oder Telefon (optional)',
    en: 'Email or phone (optional)',
    fr: 'Email ou téléphone (optionnel)',
  },
  questionPlaceholder: {
    de: 'Deine Frage oder Nachricht...',
    en: 'Your question or message...',
    fr: 'Votre question ou message...',
  },
  send: {
    de: 'Nachricht senden',
    en: 'Send message',
    fr: 'Envoyer',
  },
  cancel: {
    de: 'Abbrechen',
    en: 'Cancel',
    fr: 'Annuler',
  },
};

export default function WhatsAppForm({
  onSubmit,
  onCancel,
  locale,
  prefillQuestion,
}: WhatsAppFormProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [question, setQuestion] = useState(prefillQuestion || '');

  const lang = ['de', 'en', 'fr'].includes(locale) ? locale : 'en';
  const t = (key: string) => translations[key]?.[lang] || translations[key]?.en || key;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && question.trim()) {
      onSubmit({ name: name.trim(), contact: contact.trim(), question: question.trim() });
    }
  };

  return (
    <div className="p-4 bg-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-green-600"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.88L2 22l5.23-1.37C8.69 21.53 10.31 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm.02 16c-1.5 0-2.97-.39-4.26-1.14l-.3-.18-3.12.82.83-3.04-.2-.31C4.29 12.87 4 11.46 4 10c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{t('title')}</h3>
          <p className="text-xs text-gray-500">{t('subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          required
          className="
            w-full px-4 py-2.5
            bg-gray-50 rounded-xl
            text-sm text-gray-800
            placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-green-500/30
          "
        />

        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t('contactPlaceholder')}
          className="
            w-full px-4 py-2.5
            bg-gray-50 rounded-xl
            text-sm text-gray-800
            placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-green-500/30
          "
        />

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('questionPlaceholder')}
          required
          rows={3}
          className="
            w-full px-4 py-2.5
            bg-gray-50 rounded-xl
            text-sm text-gray-800
            placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-green-500/30
            resize-none
          "
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="
              flex-1 px-4 py-2.5
              bg-gray-100 hover:bg-gray-200
              rounded-xl
              text-sm text-gray-600
              transition-colors duration-200
            "
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={!name.trim() || !question.trim()}
            className="
              flex-1 px-4 py-2.5
              bg-green-500 hover:bg-green-600
              rounded-xl
              text-sm text-white font-medium
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {t('send')}
          </button>
        </div>
      </form>
    </div>
  );
}
