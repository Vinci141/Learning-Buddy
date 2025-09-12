
import React, { useState } from 'react';
import { StudyMaterials } from '../types';
import { exportToDoc, exportToPdf, exportToCsv } from '../utils/exportUtils';
import { DownloadIcon } from './icons';

interface ExportButtonsProps {
  studyMaterials: StudyMaterials;
  topic: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ studyMaterials, topic }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: 'doc' | 'pdf' | 'csv') => {
    switch (format) {
      case 'doc':
        exportToDoc(studyMaterials, topic);
        break;
      case 'pdf':
        exportToPdf(studyMaterials, topic);
        break;
      case 'csv':
        exportToCsv(studyMaterials, topic);
        break;
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-center w-full rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <DownloadIcon />
          Export
          <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div 
          className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
          role="menu" aria-orientation="vertical" aria-labelledby="menu-button"
        >
          <div className="py-1" role="none">
            <button onClick={() => handleExport('pdf')} className="text-slate-700 block w-full text-left px-4 py-2 text-sm hover:bg-slate-100" role="menuitem">PDF Document (.pdf)</button>
            <button onClick={() => handleExport('doc')} className="text-slate-700 block w-full text-left px-4 py-2 text-sm hover:bg-slate-100" role="menuitem">Word Document (.doc)</button>
            <button onClick={() => handleExport('csv')} className="text-slate-700 block w-full text-left px-4 py-2 text-sm hover:bg-slate-100" role="menuitem">Excel/CSV (.csv)</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButtons;
