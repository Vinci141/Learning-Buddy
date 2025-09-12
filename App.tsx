
import React, { useState, useCallback, useEffect } from 'react';
import { StudyMaterials, Tab } from './types';
import { generateStudyMaterials } from './services/geminiService';
import TopicInput from './components/TopicInput';
import StudyTabs from './components/StudyTabs';
import SummaryView from './components/SummaryView';
import FlashcardView from './components/FlashcardView';
import QuizView from './components/QuizView';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import ExportButtons from './components/ExportButtons';

const App: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterials | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});

  // Load session from localStorage on initial render
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('learningBuddySession');
      if (savedSession) {
        const { topic, studyMaterials, quizAnswers: savedAnswers } = JSON.parse(savedSession);
        if (topic && studyMaterials) {
          setTopic(topic);
          setStudyMaterials(studyMaterials);
          setQuizAnswers(savedAnswers || {});
        }
      }
    } catch (err) {
      console.error("Failed to load session from localStorage:", err);
      localStorage.removeItem('learningBuddySession'); // Clear corrupted data
    }
  }, []);

  // Save session to localStorage whenever data changes
  useEffect(() => {
    if (topic && studyMaterials) {
      try {
        const sessionData = {
          topic,
          studyMaterials,
          quizAnswers,
        };
        localStorage.setItem('learningBuddySession', JSON.stringify(sessionData));
      } catch (err) {
        console.error("Failed to save session to localStorage:", err);
      }
    }
  }, [topic, studyMaterials, quizAnswers]);


  const handleGenerate = useCallback(async (newTopic: string) => {
    if (!newTopic.trim()) {
      setError('Please enter a topic.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStudyMaterials(null);
    setTopic(newTopic);
    setActiveTab('summary');
    setQuizAnswers({}); // Reset quiz answers for new topic

    try {
      const materials = await generateStudyMaterials(newTopic);
      setStudyMaterials(materials);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate study materials. ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderContent = () => {
    if (!studyMaterials) return null;

    switch (activeTab) {
      case 'summary':
        return <SummaryView summary={studyMaterials.summary} />;
      case 'flashcards':
        return <FlashcardView flashcards={studyMaterials.flashcards} />;
      case 'quiz':
        return (
          <QuizView
            quiz={studyMaterials.quiz}
            answers={quizAnswers}
            onAnswerChange={setQuizAnswers}
          />
        );
      default:
        return null;
    }
  };
  
  const WelcomeMessage: React.FC = () => (
    <div className="text-center p-8 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-slate-700 mb-2">Welcome to your Learning Buddy!</h2>
      <p className="text-slate-500">Enter a topic above to generate a summary, flashcards, and a quiz to kickstart your study session.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-blue-600">Learning Buddy</h1>
            <p className="text-sm text-slate-500 hidden md:block">AI-Powered Study Tools</p>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <TopicInput onGenerate={handleGenerate} isLoading={isLoading} />
          
          <div className="mt-8">
            {isLoading && <Loader />}
            {error && <ErrorMessage message={error} />}
            
            {!isLoading && !error && !studyMaterials && <WelcomeMessage />}

            {studyMaterials && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 capitalize">{topic}</h2>
                    <p className="text-slate-500">Your generated study materials.</p>
                  </div>
                  <ExportButtons studyMaterials={studyMaterials} topic={topic} />
                </div>
                
                <StudyTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                
                <div className="p-6">
                  {renderContent()}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-sm text-slate-400">
        <p>Powered by AI. Generated content may require fact-checking.</p>
      </footer>
    </div>
  );
};

export default App;
