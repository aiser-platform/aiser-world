'use client';

import React, { useRef, useEffect, useCallback, memo } from 'react';
import { Editor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface MemoryOptimizedEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  height?: string;
  options?: any;
  className?: string;
}

const MemoryOptimizedEditor = memo(({
  value,
  onChange,
  language = 'sql',
  theme = 'vs-light',
  height = '100%',
  options = {},
  className
}: MemoryOptimizedEditorProps) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced onChange handler to prevent excessive re-renders
  const debouncedOnChange = useCallback((newValue: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300); // 300ms debounce
  }, [onChange]);

  // Handle editor mount with memory optimization
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Optimize editor for memory usage
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      // Memory optimizations
      renderWhitespace: 'none',
      renderControlCharacters: false,
      guides: { indentation: false, highlightActiveIndentation: false },
      renderLineHighlight: 'line',
      // Disable features that consume memory
      occurrencesHighlight: 'off',
      selectionHighlight: false,
      codeLens: false,
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: 'off',
      tabCompletion: 'off',
      wordBasedSuggestions: 'off',
      parameterHints: { enabled: false },
      hover: { enabled: false }
    });

    // Set up change listener with debouncing
    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      debouncedOnChange(newValue);
    });

    // Memory cleanup on unmount
    const cleanup = () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };

    // Store cleanup function for later use
    (editor as any)._cleanup = cleanup;
  }, [debouncedOnChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  // Update editor value when prop changes (but avoid unnecessary updates)
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  // Language-specific formatting options
  const getLanguageOptions = (lang: string) => {
    const baseOptions = {
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      folding: true,
      foldingStrategy: 'indentation' as const,
      showFoldingControls: 'always' as const,
      // Memory optimizations
      renderWhitespace: 'none' as const,
      renderControlCharacters: false,
      guides: { indentation: false, highlightActiveIndentation: false },
      renderLineHighlight: 'line' as const,
      occurrencesHighlight: 'off' as const,
      selectionHighlight: false,
      codeLens: false,
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: 'off' as const,
      tabCompletion: 'off' as const,
      wordBasedSuggestions: 'off' as const,
      parameterHints: { enabled: false },
      hover: { enabled: false },
    };

    // Language-specific formatting
    if (lang === 'python') {
      return {
        ...baseOptions,
        tabSize: 4,
        insertSpaces: true,
        detectIndentation: false,
        trimAutoWhitespace: true,
        formatOnPaste: true,
        formatOnType: true,
      };
    } else if (lang === 'sql') {
      return {
        ...baseOptions,
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: false,
        trimAutoWhitespace: true,
        formatOnPaste: true,
        formatOnType: true,
      };
    }
    
    return {
      ...baseOptions,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: false,
    };
  };

  // Optimized editor options with language-specific formatting
  const optimizedOptions = {
    ...getLanguageOptions(language),
    ...options
  };

  return (
    <div ref={containerRef} className={className} style={{ height, width: '100%' }}>
      <Editor
        height={height}
        language={language}
        theme={theme}
        value={value}
        onMount={handleEditorDidMount}
        options={optimizedOptions}
        loading={<div>Loading editor...</div>}
      />
    </div>
  );
});

MemoryOptimizedEditor.displayName = 'MemoryOptimizedEditor';

export default MemoryOptimizedEditor;
