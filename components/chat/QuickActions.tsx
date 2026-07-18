'use client';

interface QuickActionsProps {
  onSelect: (question: string) => void;
  locale: string;
}

interface QuickAction {
  emoji: string;
  label: Record<string, string>;
  question: Record<string, string>;
}

const quickActions: QuickAction[] = [
  {
    emoji: '📶',
    label: { de: 'WLAN', en: 'WiFi', fr: 'WiFi' },
    question: {
      de: 'Wie lautet das WLAN-Passwort?',
      en: 'What is the WiFi password?',
      fr: 'Quel est le mot de passe WiFi?',
    },
  },
  {
    emoji: '🔑',
    label: { de: 'Check-in', en: 'Check-in', fr: 'Check-in' },
    question: {
      de: 'Wie funktioniert der Check-in?',
      en: 'How does check-in work?',
      fr: 'Comment fonctionne le check-in?',
    },
  },
  {
    emoji: '🏔️',
    label: { de: 'Tipps', en: 'Tips', fr: 'Conseils' },
    question: {
      de: 'Was kann ich in Interlaken unternehmen?',
      en: 'What can I do in Interlaken?',
      fr: 'Que puis-je faire à Interlaken?',
    },
  },
  {
    emoji: '🚂',
    label: { de: 'Transport', en: 'Transport', fr: 'Transport' },
    question: {
      de: 'Wie komme ich vom Bahnhof zur Wohnung?',
      en: 'How do I get from the train station to the apartment?',
      fr: 'Comment aller de la gare à l\'appartement?',
    },
  },
  {
    emoji: '📅',
    label: { de: 'Buchen', en: 'Book', fr: 'Réserver' },
    question: {
      de: 'Wie kann ich eine Wohnung buchen?',
      en: 'How can I book an apartment?',
      fr: 'Comment puis-je réserver un appartement?',
    },
  },
];

export default function QuickActions({ onSelect, locale }: QuickActionsProps) {
  const lang = ['de', 'en', 'fr'].includes(locale) ? locale : 'en';

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-gray-100">
      {quickActions.map((action, index) => (
        <button
          key={index}
          onClick={() => onSelect(action.question[lang] || action.question.en)}
          className="
            flex items-center gap-1.5
            px-3 py-1.5
            bg-gray-50 hover:bg-gray-100
            rounded-full
            text-xs text-gray-600
            transition-colors duration-200
          "
        >
          <span>{action.emoji}</span>
          <span>{action.label[lang] || action.label.en}</span>
        </button>
      ))}
    </div>
  );
}
