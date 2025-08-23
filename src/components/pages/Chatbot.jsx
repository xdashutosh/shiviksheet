import React, { useState, useRef, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { X, Send, Sparkles, User, Bot, Loader2, MessageCircle, Brain, Zap, Download, Copy, Check } from 'lucide-react';

export const Chatbot = ({ onSendMessage, isLoading, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 'initial',
      role: 'ai',
      content: "Hello! I'm your AI assistant. Ask me anything about the current sheet data, analysis, or insights! ✨",
    },
  ]);
  const [input, setInput] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { id: `user-${Date.now()}`, role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    const prompt = input;
    setInput('');

    try {
      const aiResponse = await onSendMessage(prompt);
      const aiMessage = { id: `ai-${Date.now()}`, role: 'ai', content: aiResponse };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'error',
        content: `Sorry, an error occurred: ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleCopyMessage = async (messageId, content) => {
    try {
      // Remove markdown formatting for cleaner copied text
      const cleanText = content
        .replace(/```[\s\S]*?```/g, (match) => match.replace(/```(\w+)?\n?/g, '').replace(/\n```/g, ''))
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      
      await navigator.clipboard.writeText(cleanText);
      setCopiedMessageId(messageId);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedMessageId(messageId);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    }
  };

  const handleDownloadHtml = (content) => {
    const contentHtml = ReactDOMServer.renderToStaticMarkup(renderMessageContent(content));
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Assistant Response</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 2rem; max-width: 1200px; margin: 0 auto; }
          .container { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); }
          h1, h2, h3 { margin-top: 1.5rem; margin-bottom: 1rem; }
          h1 { font-size: 1.5rem; font-weight: 700; color: #1e40af; border-bottom: 2px solid #dbeafe; padding-bottom: 0.5rem; }
          h2 { font-size: 1.25rem; font-weight: 600; color: #15803d; }
          h3 { font-size: 1.1rem; font-weight: 600; color: #be185d; }
          p { margin-bottom: 1rem; }
          strong { font-weight: 700; color: #111827; } 
          em { font-style: italic; color: #374151; }
          a { color: #2563eb; text-decoration: none; } 
          a:hover { text-decoration: underline; }
          ul { list-style: none; padding-left: 1rem; margin-bottom: 1rem; }
          li { position: relative; padding-left: 1.5rem; margin-bottom: 0.5rem; }
          li::before { content: ''; position: absolute; left: 0; top: 0.6em; width: 6px; height: 6px; border-radius: 50%; background: linear-gradient(to right, #60a5fa, #a78bfa); }
          pre { background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; overflow-x: auto; font-size: 0.9em; box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05); }
          code { font-family: "Courier New", Courier, monospace; color: #111827; }
          pre code { background-color: transparent; padding: 0; border-radius: 0; border: none; }
          code:not(pre > code) { background-color: #e0f2f1; color: #0d9488; padding: 0.2em 0.4em; margin: 0; font-size: 85%; border-radius: 3px; }
          
          /* Enhanced Table Styling with Scrolling */
          .table-wrapper { 
            margin-bottom: 1.5rem; 
            border-radius: 12px; 
            border: 1px solid #e5e7eb; 
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); 
            background-color: #ffffff; 
            overflow: hidden;
          }
          
          .table-header { 
            padding: 12px 16px; 
            background: linear-gradient(to right, #f8fafc, #e0f2fe); 
            border-bottom: 1px solid #e5e7eb; 
            font-size: 0.75rem; 
            color: #64748b; 
            display: flex; 
            align-items: center; 
            gap: 8px;
          }
          
          .scroll-icon { 
            width: 12px; 
            height: 12px; 
            display: inline-block; 
            vertical-align: middle;
          }
          
          .table-container { 
            max-height: 400px; 
            overflow: auto; 
            scrollbar-width: thin; 
            scrollbar-color: #cbd5e1 transparent;
          }
          
          .table-container::-webkit-scrollbar { 
            width: 6px; 
            height: 6px; 
          }
          
          .table-container::-webkit-scrollbar-track { 
            background: transparent; 
          }
          
          .table-container::-webkit-scrollbar-thumb { 
            background-color: #cbd5e1; 
            border-radius: 3px; 
          }
          
          .table-container::-webkit-scrollbar-thumb:hover { 
            background-color: #94a3b8; 
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 0; 
            font-size: 0.875rem;
            min-width: 100%;
          }
          
          th, td { 
            border: 1px solid #e5e7eb; 
            padding: 12px; 
            text-align: left; 
            white-space: nowrap; 
          }
          
          th { 
            background: linear-gradient(to right, #dbeafe, #e0f2fe); 
            font-weight: 600; 
            position: sticky; 
            top: 0; 
            z-index: 10; 
            color: #1e40af;
            border-bottom: 2px solid #3b82f6;
          }
          
          tbody tr:nth-child(even) { 
            background-color: #f8fafc; 
          }
          
          tbody tr:hover { 
            background-color: #eff6ff; 
            transition: background-color 0.15s ease;
          }
          
          .table-footer { 
            padding: 8px 16px; 
            background-color: #f8fafc; 
            border-top: 1px solid #e5e7eb; 
            font-size: 0.75rem; 
            color: #64748b; 
            text-align: center; 
          }
          
          /* SVG Icons */
          svg { 
            width: 12px; 
            height: 12px; 
            fill: none; 
            stroke: currentColor; 
            stroke-width: 2; 
            stroke-linecap: round; 
            stroke-linejoin: round;
          }
          
          /* Responsive design */
          @media (max-width: 768px) {
            body { padding: 1rem; }
            .container { padding: 1rem; }
            .table-container { max-height: 300px; }
          }
        </style>
      </head>
      <body><div class="container">${contentHtml}</div></body>
      </html>
    `;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-response-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseMarkdown = (content) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(parseInlineMarkdown(content.slice(lastIndex, match.index)));
      }
      const language = match[1] || '';
      const code = match[2];
      parts.push(
        <pre key={`code-${match.index}`} className="bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800 p-4 rounded-xl text-sm overflow-x-auto my-3 border border-slate-200 dark:border-slate-700 shadow-inner">
          {language && <div className="text-emerald-600 dark:text-emerald-400 text-xs mb-2 font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md inline-block">{language}</div>}
          <code className="text-slate-800 dark:text-slate-200">{code}</code>
        </pre>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push(parseInlineMarkdown(content.slice(lastIndex)));
    }
    return <>{parts}</>;
  };

  const parseInlineMarkdown = (text) => {
    if (!text.trim()) return null;

    const lines = text.split('\n');
    const elements = [];
    let currentParagraph = [];
    let listItems = [];
    let tableRows = [];
    let inList = false;
    let inTable = false;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push(<p key={`p-${elements.length}`} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">{parseInlineElements(currentParagraph.join('\n'))}</p>);
        currentParagraph = [];
      }
    };
    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-none mb-3 space-y-2 pl-4">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 mt-2 flex-shrink-0"></div>
                <span className="text-gray-700 dark:text-gray-300">{parseInlineElements(item)}</span>
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };
    const flushTable = () => {
      if (tableRows.length > 0) {
        const table = parseTable(tableRows);
        if (table) {
          elements.push(table);
        } else {
            // If it's not a valid table, treat the lines as a paragraph
            tableRows.forEach(row => currentParagraph.push(row));
            flushParagraph();
        }
        tableRows = [];
        inTable = false;
      }
    };

    const isTableRow = (line) => line.trim().includes('|');
    const isTableSeparator = (line) => /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line.trim());

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      // Table Detection Logic
      if (isTableRow(line)) {
        if (!inTable) {
            // Potentially starting a new table
            flushParagraph();
            flushList();
            inTable = true;
        }
        tableRows.push(line);
        return;
      }
      
      if (inTable) {
          // The line after a table block is not a table row, so flush the collected table rows
          flushTable();
      }

      // Headers
      if (trimmedLine.startsWith('#')) {
        flushParagraph(); flushList();
        const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const text = headerMatch[2];
          const HeaderTag = `h${Math.min(level, 6)}`;
          const className = level === 1 ? 'text-xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent' : level === 2 ? 'text-lg font-bold mb-3 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent' : level === 3 ? 'text-base font-bold mb-2 bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent' : 'text-sm font-semibold mb-2 text-indigo-600 dark:text-indigo-400';
          elements.push(React.createElement(HeaderTag, { key: `h-${elements.length}`, className }, parseInlineElements(text)));
        }
        return;
      }

      // List items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || /^\d+\.\s/.test(trimmedLine)) {
        flushParagraph();
        if (!inList) inList = true;
        listItems.push(trimmedLine.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
        return;
      }

      // Empty line signifies a break
      if (!trimmedLine) {
        flushParagraph(); flushList();
        return;
      }

      // Regular text
      flushList();
      currentParagraph.push(line);
    });

    // Flush any remaining content
    flushParagraph(); flushList(); flushTable();
    return <>{elements}</>;
  };
  
  // Enhanced Table Parsing Function with Both Horizontal and Vertical Scrolling
  const parseTable = (tableRows) => {
    const isTableSeparator = (line) => /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line.trim());
    
    // A valid markdown table requires at least a header and a separator line.
    if (tableRows.length < 2 || !isTableSeparator(tableRows[1])) {
      return null;
    }

    const parseTableRow = (rowStr) => {
      // Remove leading/trailing pipes before splitting
      const cleanRow = rowStr.trim().replace(/^\||\|$/g, '');
      return cleanRow.split('|').map(cell => cell.trim());
    };

    const headerCells = parseTableRow(tableRows[0]);
    const dataRows = tableRows.slice(2)
      .filter(row => row.trim()) // Ignore empty lines within table data
      .map(parseTableRow);

    // Ensure all rows have the same number of columns as the header
    if (dataRows.some(row => row.length !== headerCells.length)) {
        // This is not a well-formed table, treat it as plain text.
        return null;
    }

    return (
      <div key={`table-${Math.random()}`} className="table-wrapper mb-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800">
        {/* Table scroll indicator */}
        <div className="table-header px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 rounded-t-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <svg className="scroll-icon w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Scroll horizontally and vertically to view all data
          </p>
        </div>
        
        {/* Scrollable table container */}
        <div className="table-container overflow-auto max-h-96 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <table className="w-full border-collapse text-sm min-w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
                {headerCells.map((header, i) => (
                  <th key={i} className="border-b-2 border-gray-200 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
                    {parseInlineElements(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="even:bg-gray-50 dark:even:bg-gray-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-gray-100 dark:border-gray-700 px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {parseInlineElements(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Table info footer */}
        {dataRows.length > 10 && (
          <div className="table-footer px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 rounded-b-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Showing {dataRows.length} rows × {headerCells.length} columns
            </p>
          </div>
        )}
      </div>
    );
  };
  
  const parseInlineElements = (text) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 px-2 py-1 rounded-md text-sm text-emerald-800 dark:text-emerald-200 font-mono border border-emerald-200 dark:border-emerald-700">{part.slice(1, -1)}</code>;
      }
      return parseTextFormatting(part, index);
    });
  };

  const parseTextFormatting = (text, keyPrefix) => {
    let result = text;
    result = String(result).split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={`${keyPrefix}-bold-${i}`} className="font-bold text-gray-900 dark:text-gray-100">{part.slice(2, -2)}</strong> : part));
    result = result.map((part, i) => (typeof part === 'string' ? part.split(/(\*[^*]+\*)/g).map((subPart, j) => (subPart.startsWith('*') && subPart.endsWith('*') && !subPart.startsWith('**') ? <em key={`${keyPrefix}-italic-${i}-${j}`} className="italic text-gray-800 dark:text-gray-200">{subPart.slice(1, -1)}</em> : subPart)) : part)).flat();
    result = result.map((part, i) => {
      if (typeof part === 'string') {
        return part.split(/(\[[^\]]+\]\([^)]+\))/g).map((subPart, j) => {
          const linkMatch = subPart.match(/\[([^\]]+)\]\(([^)]+)\)/);
          return linkMatch ? <a key={`${keyPrefix}-link-${i}-${j}`} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-2 underline-offset-2 hover:decoration-blue-600 transition-colors">{linkMatch[1]}</a> : subPart;
        });
      }
      return part;
    }).flat();
    return <>{result}</>;
  };

  const renderMessageContent = (content) => <div className="markdown-content">{parseMarkdown(content)}</div>;
  const quickPrompts = ["📊 Analyze this data", "📈 Show trends", "🔍 Find insights", "📋 Summarize data"];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
        <CardHeader className="p-0 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm"><Brain className="w-6 h-6" /></div>
                <div>
                  <CardTitle className="text-xl font-bold">AI Data Assistant</CardTitle>
                  <p className="text-sm opacity-90 mt-1">Powered by advanced AI • Ready to help analyze your data</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 text-white hover:bg-white/20 rounded-full transition-all duration-200"><X className="w-5 h-5" /></Button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-blue-50/30 dark:from-gray-900 dark:to-blue-900/20">
          {messages.map((message, index) => {
              const isUser = message.role === 'user';
              const isAI = message.role === 'ai';
              const isError = message.role === 'error';
              const isInitial = message.id === 'initial';

              return (
                <div key={message.id} className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''} animate-in slide-in-from-bottom-4 duration-300`} style={{ animationDelay: `${index * 50}ms` }}>
                  {!isUser && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}
                  <div className="relative group max-w-[85%]">
                    <div className={`p-4 rounded-2xl text-sm shadow-lg transition-all duration-200 hover:shadow-xl ${isUser ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white shadow-blue-200 dark:shadow-blue-900/50' : isError ? 'bg-gradient-to-br from-red-500 via-red-600 to-pink-600 text-white shadow-red-200 dark:shadow-red-900/50' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 shadow-gray-200 dark:shadow-gray-900/50'}`}>
                      {renderMessageContent(message.content)}
                    </div>
                    {isAI && !isInitial && (
                      <div className="absolute -top-2 -right-2 flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleCopyMessage(message.id, message.content)} 
                          title={copiedMessageId === message.id ? "Copied!" : "Copy response"} 
                          className="h-7 w-7 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200"
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDownloadHtml(message.content)} 
                          title="Download as HTML" 
                          className="h-7 w-7 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </div>
              )
          })}
          {isLoading && (
            <div className="flex items-start gap-3 animate-in slide-in-from-bottom-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg">
                <Bot className="w-5 h-5" />
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500"/>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <CardFooter className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20">
          {messages.length === 1 && (
            <div className="w-full mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" />Quick actions:</p>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt, index) => <Button key={index} variant="outline" size="sm" onClick={() => setInput(prompt)} className="text-xs bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border-2 border-gray-200 hover:border-blue-300 transition-all duration-200" disabled={isLoading}>{prompt}</Button>)}
              </div>
            </div>
          )}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 relative">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything about your spreadsheet data..." autoComplete="off" disabled={isLoading} className="pr-12 border-2 border-gray-200 focus:border-blue-400 dark:border-gray-600 dark:focus:border-blue-500 rounded-xl bg-white dark:bg-gray-800 transition-all duration-200" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}/>
              <MessageCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <Button onClick={handleSubmit} disabled={isLoading || !input.trim()} className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-xl px-6 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};