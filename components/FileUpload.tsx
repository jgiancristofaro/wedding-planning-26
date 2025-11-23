import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Spinner } from './Spinner';

interface FileUploadProps {
  onUpload: (files: FileList) => Promise<void>;
  label: string;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, label, isLoading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setError(null);
      try {
        await onUpload(e.target.files);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to process file. Please try again.";
        setError(errorMessage);
        console.error(err);
      } finally {
        if (inputRef.current) inputRef.current.value = ''; // Reset
      }
    }
  };

  return (
    <div className="w-full mb-8">
      <div
        onClick={isLoading ? undefined : handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 group cursor-pointer
          ${isLoading ? 'bg-wedding-50 border-wedding-200 cursor-wait opacity-70' : 'border-wedding-300 hover:border-wedding-500 hover:bg-white bg-wedding-50/50'}
        `}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.csv,.xlsx,.txt,image/*"
          ref={inputRef}
          onChange={handleChange}
          className="hidden"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center justify-center gap-3">
          {isLoading ? (
            <>
              <Spinner />
              <p className="text-wedding-700 font-medium animate-pulse">AI is reading your documents...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-wedding-500" />
              </div>
              <h3 className="text-lg font-serif font-semibold text-wedding-900">Upload {label} Documents</h3>
              <p className="text-sm text-wedding-500 max-w-sm mx-auto">
                Drag and drop PDF, CSV, or Excel files here, or click to browse. 
                Our AI will automatically extract details.
              </p>
            </>
          )}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg mt-2 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};