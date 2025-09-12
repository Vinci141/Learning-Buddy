
import React from 'react';
import { Tab } from '../types';
import { SummaryIcon, FlashcardIcon, QuizIcon, MindMapIcon } from './icons';

interface StudyTabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const StudyTabs: React.FC<StudyTabsProps> = ({ activeTab, setActiveTab }) => {
  // Fix: Use React.ReactElement instead of JSX.Element to resolve namespace issue.
  const tabs: { id: Tab; label: string; icon: React.ReactElement }[] = [
    { id: 'summary', label: 'Summary', icon: <SummaryIcon /> },
    { id: 'flashcards', label: 'Flashcards', icon: <FlashcardIcon /> },
    { id: 'quiz', label: 'Quiz', icon: <QuizIcon /> },
    { id: 'mindmap', label: 'Mind Map', icon: <MindMapIcon /> },
  ];

  return (
    <div className="border-b border-slate-200 bg-slate-50">
      <nav className="-mb-px flex space-x-2 sm:space-x-4 px-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              transition-colors duration-200
              ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default StudyTabs;