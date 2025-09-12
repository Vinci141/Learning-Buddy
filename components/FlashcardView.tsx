
import React, { useState } from 'react';
import { Flashcard } from '../types';

interface FlashcardViewProps {
  flashcards: Flashcard[];
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ flashcards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };
  
  if (!flashcards || flashcards.length === 0) {
    return <p className="text-center text-slate-500">No flashcards available.</p>;
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-lg h-80 perspective-1000">
        <div
          className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white border border-slate-200 rounded-xl shadow-lg flex items-center justify-center p-6 cursor-pointer">
            <p className="text-2xl font-semibold text-center text-slate-700">{currentCard.term}</p>
          </div>
          {/* Back */}
          <div className="absolute w-full h-full backface-hidden bg-blue-50 border border-blue-200 rounded-xl shadow-lg flex items-center justify-center p-6 cursor-pointer rotate-y-180">
            <p className="text-lg text-center text-slate-600 leading-relaxed">{currentCard.definition}</p>
          </div>
        </div>
      </div>
      
      <p className="text-slate-500 font-medium">{currentIndex + 1} / {flashcards.length}</p>

      <div className="flex items-center gap-4">
        <button onClick={handlePrev} className="px-5 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors">Previous</button>
        <button onClick={() => setIsFlipped(!isFlipped)} className="px-5 py-2 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 transition-colors">Flip Card</button>
        <button onClick={handleNext} className="px-5 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors">Next</button>
      </div>
      
      {/* Add hidden CSS for 3D transform */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      `}</style>
    </div>
  );
};

export default FlashcardView;
