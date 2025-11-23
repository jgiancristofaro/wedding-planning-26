import React, { useRef, useState, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X, Plus, RefreshCw } from 'lucide-react';

interface FileUploadProps<T> {
  label: string;
  onProcessFile: (file: File) => Promise<T[]>;
  onComplete: (items: T[]) => void;
}

interface FileStatus {
  id: string;
  file: File;
  status: 'queued' | 'processing' | 'success' | 'error';
  error?: string;
  itemCount: number;
}

export const FileUpload = <T,>({ label, onProcessFile, onComplete }: FileUploadProps<T>) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAllComplete, setIsAllComplete] = useState(false);
  
  // Buffer to hold results until all files are processed
  const resultsBuffer = useRef<T[]>([]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const addFiles = (fileList: FileList) => {
    setIsAllComplete(false);
    const newFiles: FileStatus[] = Array.from(fileList).map(f => ({
      id: crypto.randomUUID(),
      file: f,
      status: 'queued',
      itemCount: 0
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    if (isProcessing) return; 
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleReset = () => {
    setFiles([]);
    setIsAllComplete(false);
    resultsBuffer.current = [];
  };

  // Processing Queue Logic
  useEffect(() => {
    if (isProcessing) return;

    const nextFile = files.find(f => f.status === 'queued');
    
    if (nextFile) {
      processFile(nextFile);
    } else if (files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error')) {
      // All files processed
      if (!isAllComplete) {
        setIsAllComplete(true);
        if (resultsBuffer.current.length > 0) {
          onComplete(resultsBuffer.current);
          resultsBuffer.current = []; // Clear buffer after handoff
        }
      }
    }
  }, [files, isProcessing, isAllComplete, onComplete]);

  const processFile = async (fileObj: FileStatus) => {
    setIsProcessing(true);
    
    // Update status to processing
    setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'processing' } : f));

    try {
      // Process the file
      const results = await onProcessFile(fileObj.file);
      resultsBuffer.current.push(...results);
      
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { 
        ...f, 
        status: 'success', 
        itemCount: results.length 
      } : f));

    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Extraction failed";
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { 
        ...f, 
        status: 'error', 
        error: msg 
      } : f));
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = {
    total: files.length,
    success: files.filter(f => f.status === 'success').length,
    failed: files.filter(f => f.status === 'error').length,
    itemsFound: files.reduce((acc, f) => acc + f.itemCount, 0)
  };

  return (
    <div className="w-full mb-8 space-y-4">
      
      {/* 1. Upload Drop Zone (Visible when empty) */}
      {files.length === 0 ? (
        <div
          onClick={handleClick}
          className="relative border-2 border-dashed border-wedding-300 rounded-xl p-8 text-center hover:border-wedding-500 hover:bg-wedding-50/50 transition-all cursor-pointer group bg-white"
        >
          <input
            type="file"
            multiple
            accept=".pdf,.csv,.xlsx,.txt,image/*"
            ref={inputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 bg-wedding-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <Upload className="w-6 h-6 text-wedding-500" />
            </div>
            <h3 className="text-lg font-serif font-semibold text-wedding-900">Upload {label} Documents</h3>
            <p className="text-sm text-wedding-500 max-w-sm mx-auto">
              Drag and drop PDF, CSV, or Excel files here. <br/>
              <span className="text-xs opacity-75">Our AI will process multiple files one by one.</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-wedding-200 shadow-sm overflow-hidden animate-fade-in">
            {/* 2. File List Header */}
            <div className="p-4 border-b border-wedding-100 flex justify-between items-center bg-wedding-50/30">
                <h3 className="font-serif font-bold text-wedding-900 flex items-center gap-2">
                   Files ({files.length})
                   {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-wedding-500" />}
                </h3>
                <div className="flex gap-2">
                    {!isProcessing && (
                         <button 
                            onClick={handleClick}
                            className="flex items-center gap-1 text-xs font-bold text-wedding-700 hover:text-wedding-900 px-3 py-1.5 rounded-md hover:bg-wedding-100 transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add More
                        </button>
                    )}
                    {!isProcessing && isAllComplete && (
                        <button 
                            onClick={handleReset}
                            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" /> Clear & New
                        </button>
                    )}
                </div>
                {/* Hidden input for 'Add More' button */}
                <input
                    type="file"
                    multiple
                    accept=".pdf,.csv,.xlsx,.txt,image/*"
                    ref={inputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>

            {/* 3. File Rows with Progress */}
            <div className="divide-y divide-wedding-50 max-h-80 overflow-y-auto">
                {files.map((f) => (
                    <div key={f.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`p-2 rounded-lg flex-shrink-0 ${f.status === 'error' ? 'bg-red-50' : 'bg-wedding-50'}`}>
                                <FileText className={`w-5 h-5 ${f.status === 'error' ? 'text-red-500' : 'text-wedding-600'}`} />
                            </div>
                            
                            {/* Main Content */}
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex justify-between items-start">
                                    <p className="text-sm font-medium text-gray-900 truncate pr-2" title={f.file.name}>{f.file.name}</p>
                                    
                                    {/* Status Label */}
                                    {f.status === 'queued' && <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">Queued</span>}
                                    {f.status === 'processing' && <span className="text-xs text-wedding-600 font-bold animate-pulse">Analyzing...</span>}
                                    {f.status === 'success' && (
                                        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span className="text-xs font-bold">{f.itemCount} Found</span>
                                        </div>
                                    )}
                                    {f.status === 'error' && <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">Failed</span>}
                                </div>

                                {/* Progress Bar */}
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden relative">
                                    {f.status === 'queued' && <div className="h-full w-0 bg-gray-300"></div>}
                                    
                                    {f.status === 'processing' && (
                                        <div className="absolute top-0 left-0 h-full w-full">
                                            <div className="w-full h-full bg-wedding-300/30"></div>
                                            <div className="absolute top-0 left-0 h-full w-1/3 bg-wedding-500 rounded-full animate-progress-indeterminate"></div>
                                        </div>
                                    )}
                                    
                                    {f.status === 'success' && (
                                        <div className="h-full bg-green-500 w-full rounded-full transition-all duration-500"></div>
                                    )}
                                    
                                    {f.status === 'error' && (
                                        <div className="h-full bg-red-500 w-full rounded-full"></div>
                                    )}
                                </div>
                                
                                {f.status === 'error' && (
                                    <div className="flex items-center gap-1 text-xs text-red-600">
                                        <AlertCircle className="w-3 h-3" />
                                        {f.error}
                                    </div>
                                )}
                            </div>

                            {/* Remove Action */}
                            {f.status === 'queued' && !isProcessing && (
                                <button onClick={() => removeFile(f.id)} className="text-gray-400 hover:text-red-500 p-1">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* 4. Batch Summary */}
            {isAllComplete && (
                <div className="bg-wedding-50 p-4 border-t border-wedding-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-wedding-900">Processing Complete</p>
                        <p className="text-xs text-wedding-600 mt-0.5">
                            Successfully processed {stats.success} of {stats.total} files. <br/>
                            Total of <span className="font-bold">{stats.itemsFound} new {label.toLowerCase()}(s)</span> added to database.
                        </p>
                    </div>
                    {stats.failed > 0 && (
                        <div className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold border border-red-200">
                            {stats.failed} Failed
                        </div>
                    )}
                </div>
            )}
        </div>
      )}
    </div>
  );
};