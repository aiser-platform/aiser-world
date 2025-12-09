'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import './MarkdownRenderer.css';

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
    content, 
    className = '' 
}) => {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeHighlight, rehypeKatex]}
                components={{
                    // Customize code blocks - improved styling like Claude/OpenAI
                    code: ({ node, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !className || !match;
                        const language = match ? match[1] : '';
                        
                        if (!isInline && match) {
                            return (
                                <div className="code-block-wrapper">
                                    {language && (
                                        <div className="code-block-header">
                                            <span className="code-language">{language}</span>
                                        </div>
                                    )}
                                    <pre className="code-block">
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    </pre>
                                </div>
                            );
                        }
                        return (
                            <code className="inline-code" {...props}>
                                {children}
                            </code>
                        );
                    },
                    // Customize tables
                    table: ({ children }) => (
                        <div className="table-wrapper">
                            <table className="markdown-table">
                                {children}
                            </table>
                        </div>
                    ),
                    // Customize blockquotes
                    blockquote: ({ children }) => (
                        <blockquote className="markdown-blockquote">
                            {children}
                        </blockquote>
                    ),
                    // Customize lists
                    ul: ({ children }) => (
                        <ul className="markdown-list">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="markdown-list">
                            {children}
                        </ol>
                    ),
                    // Customize headings
                    h1: ({ children }) => (
                        <h1 className="markdown-h1">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="markdown-h2">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="markdown-h3">
                            {children}
                        </h3>
                    ),
                    // Customize paragraphs
                    p: ({ children }) => (
                        <p className="markdown-paragraph">
                            {children}
                        </p>
                    ),
                    // Customize links
                    a: ({ href, children }) => (
                        <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="markdown-link"
                        >
                            {children}
                        </a>
                    ),
                    // Customize strong/bold
                    strong: ({ children }) => (
                        <strong className="markdown-strong">
                            {children}
                        </strong>
                    ),
                    // Customize emphasis/italic
                    em: ({ children }) => (
                        <em className="markdown-em">
                            {children}
                        </em>
                    )
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
