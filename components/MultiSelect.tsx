import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selected, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative font-sans text-left" ref={containerRef}>
      <label className="text-xs font-bold text-wedding-500 uppercase tracking-wider mb-1 block">
        {label}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md shadow-sm transition-all duration-200 ${
          isOpen ? 'border-wedding-500 ring-1 ring-wedding-500 bg-white' : 'border-wedding-200 bg-wedding-50 hover:bg-white hover:border-wedding-300'
        } ${disabled ? 'bg-gray-50 opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-1 truncate max-w-[85%]">
          <span className={`truncate font-medium ${selected.length === 0 ? 'text-gray-500 font-normal' : 'text-wedding-900'}`}>
            {selected.length === 0 ? `Select ${label}...` : `${label} (${selected.length})`}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
            {selected.length > 0 && (
                <div 
                    role="button"
                    onClick={clearSelection}
                    className="p-0.5 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 transition-colors mr-1"
                    title="Clear selection"
                >
                    <X className="w-3 h-3" />
                </div>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-wedding-200 rounded-md shadow-xl max-h-60 overflow-y-auto animate-fade-in">
          {options.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 italic text-center">No options available</div>
          ) : (
            <div className="p-1">
              {options.map((option) => {
                  const isSelected = selected.includes(option);
                  return (
                    <div
                        key={option}
                        onClick={() => toggleOption(option)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
                            isSelected ? 'bg-wedding-50 text-wedding-900 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors flex-shrink-0 ${
                            isSelected ? 'bg-wedding-600 border-wedding-600' : 'border-gray-300 bg-white'
                        }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="truncate select-none">{option}</span>
                    </div>
                  );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
