
import React, { useState, useMemo } from 'react';
import { QuizQuestion } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface QuizViewProps {
  quiz: QuizQuestion[];
  answers: Record<number, string>;
  onAnswerChange: (answers: Record<number, string>) => void;
}

const QuizView: React.FC<QuizViewProps> = ({ quiz, answers, onAnswerChange }) => {
  const [showResults, setShowResults] = useState(false);

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    onAnswerChange({ ...answers, [questionIndex]: answer });
  };

  const score = useMemo(() => {
    if (!showResults) return 0;
    return quiz.reduce((total, question, index) => {
      return total + (answers[index] === question.correctAnswer ? 1 : 0);
    }, 0);
  }, [showResults, answers, quiz]);
  
  const resetQuiz = () => {
    onAnswerChange({});
    setShowResults(false);
  };

  if (!quiz || quiz.length === 0) {
    return <p className="text-center text-slate-500">No quiz available.</p>;
  }

  if (showResults) {
    return (
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-4">Quiz Results</h3>
        <p className="text-4xl font-bold mb-2 text-blue-600">{score} / {quiz.length}</p>
        <p className="text-slate-600 mb-6">You answered {score} out of {quiz.length} questions correctly.</p>
        <button onClick={resetQuiz} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
          Try Again
        </button>

        <div className="mt-8 text-left">
          <h4 className="text-lg font-bold mb-4">Review Your Answers:</h4>
          {quiz.map((q, index) => (
            <div key={index} className={`p-4 rounded-lg mb-4 ${answers[index] === q.correctAnswer ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
              <p className="font-semibold">{index + 1}. {q.question}</p>
              <p className="text-sm mt-2">Your answer: <span className="font-medium">{answers[index] || 'Not answered'}</span></p>
              <p className={`text-sm ${answers[index] === q.correctAnswer ? 'text-green-700' : 'text-red-700'}`}>
                Correct answer: <span className="font-medium">{q.correctAnswer}</span>
              </p>
              {q.explanation && (
                <div className="mt-3 pt-3 border-t border-slate-200/80">
                  <MarkdownRenderer 
                    content={q.explanation} 
                    className="prose prose-sm prose-slate max-w-none leading-relaxed"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold mb-6 text-center">Test Your Knowledge</h3>
      <div className="space-y-8">
        {quiz.map((q, index) => (
          <div key={index}>
            <p className="font-semibold mb-3">{index + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((option, optionIndex) => (
                <label key={optionIndex} className="flex items-center p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={option}
                    checked={answers[index] === option}
                    onChange={() => handleAnswerChange(index, option)}
                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-slate-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <button onClick={() => setShowResults(true)} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
          Submit Quiz
        </button>
      </div>
    </div>
  );
};

export default QuizView;