import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { X, Send, Sparkles, User, Bot, Loader2, MessageCircle, Brain, Zap } from 'lucide-react';

export const Chatbot = ({ onSendMessage, isLoading, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 'initial',
      role: 'ai',
      content: "Hello! I'm your AI assistant. Ask me anything about the current sheet data, analysis, or insights! ✨",
    },
  ]);
  const [input, setInput] = useState('');
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

  const parseMarkdown = (content) => {
    // Split content by code blocks first to handle them separately
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index);
        parts.push(parseInlineMarkdown(textBefore));
      }

      // Add code block
      const language = match[1] || '';
      const code = match[2];
      parts.push(
        <pre key={`code-${match.index}`} className="bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800 p-4 rounded-xl text-sm overflow-x-auto my-3 border border-slate-200 dark:border-slate-700 shadow-inner">
          {language && (
            <div className="text-emerald-600 dark:text-emerald-400 text-xs mb-2 font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md inline-block">
              {language}
            </div>
          )}
          <code className="text-slate-800 dark:text-slate-200">{code}</code>
        </pre>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last code block
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex);
      parts.push(parseInlineMarkdown(remainingText));
    }

    return <>{parts}</>;
  };

  const parseInlineMarkdown = (text) => {
    if (!text.trim()) return null;

    // Split into lines to handle headers and lists
    const lines = text.split('\n');
    const elements = [];

    let currentParagraph = [];
    let listItems = [];
    let tableRows = [];
    let inList = false;
    let inTable = false;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join('\n');
        elements.push(
          <p key={`p-${elements.length}`} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
            {parseInlineElements(paragraphText)}
          </p>
        );
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
        }
        tableRows = [];
        inTable = false;
      }
    };

    const isTableRow = (line) => {
      const trimmed = line.trim();
      return trimmed.includes('|') && trimmed.length > 0;
    };

    const isTableSeparator = (line) => {
      const trimmed = line.trim();
      return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(trimmed);
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Check for table rows
      if (isTableRow(line) && !trimmedLine.startsWith('#')) {
        flushParagraph();
        flushList();
        
        if (!inTable) {
          inTable = true;
        }
        
        // Skip separator rows but keep them for processing
        tableRows.push(line);
        return;
      }

      // If we were in a table and this line is not a table row, flush the table
      if (inTable && !isTableRow(line)) {
        flushTable();
      }

      // Headers
      if (trimmedLine.startsWith('#')) {
        flushParagraph();
        flushList();
        flushTable();
        
        const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const text = headerMatch[2];
          const HeaderTag = `h${Math.min(level, 6)}`;
          const className = level === 1 ? 'text-xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent' :
                          level === 2 ? 'text-lg font-bold mb-3 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent' :
                          level === 3 ? 'text-base font-bold mb-2 bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent' :
                          'text-sm font-semibold mb-2 text-indigo-600 dark:text-indigo-400';
          
          elements.push(
            React.createElement(HeaderTag, {
              key: `h-${elements.length}`,
              className
            }, parseInlineElements(text))
          );
        }
        return;
      }

      // List items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || /^\d+\.\s/.test(trimmedLine)) {
        flushParagraph();
        flushTable();
        
        if (!inList) {
          inList = true;
        }
        
        const listText = trimmedLine.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
        listItems.push(listText);
        return;
      }

      // Empty line
      if (!trimmedLine) {
        flushParagraph();
        flushList();
        flushTable();
        return;
      }

      // Regular text
      flushList();
      flushTable();
      currentParagraph.push(line);
    });

    // Flush any remaining content
    flushParagraph();
    flushList();
    flushTable();

    return <>{elements}</>;
  };

  const parseTable = (tableRows) => {
    if (tableRows.length < 2) return null;

    // Filter out separator rows and process actual content rows
    const contentRows = tableRows.filter(row => {
      const trimmed = row.trim();
      return !(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(trimmed));
    });

    if (contentRows.length === 0) return null;

    const parseTableRow = (row) => {
      // Remove leading/trailing pipes and split by pipes
      const cleanRow = row.trim().replace(/^\|/, '').replace(/\|$/, '');
      return cleanRow.split('|').map(cell => cell.trim());
    };

    const headerRow = parseTableRow(contentRows[0]);
    const dataRows = contentRows.slice(1).map(parseTableRow);

    return (
      <div key={`table-${Math.random()}`} className="overflow-x-auto mb-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
              {headerRow.map((header, i) => (
                <th 
                  key={i} 
                  className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200"
                >
                  {parseInlineElements(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="even:bg-gray-50 dark:even:bg-gray-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex} 
                    className="border-b border-gray-100 dark:border-gray-800 px-4 py-3 text-gray-700 dark:text-gray-300"
                  >
                    {parseInlineElements(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const parseInlineElements = (text) => {
    // Handle inline code first (to avoid conflicts with other formatting)
    const parts = text.split(/(`[^`]+`)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        const codeText = part.slice(1, -1);
        return (
          <code key={index} className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 px-2 py-1 rounded-md text-sm text-emerald-800 dark:text-emerald-200 font-mono border border-emerald-200 dark:border-emerald-700">
            {codeText}
          </code>
        );
      }
      
      return parseTextFormatting(part, index);
    });
  };

  const parseTextFormatting = (text, keyPrefix) => {
    // Handle bold (**text**)
    let result = text;
    
    // Bold
    result = String(result).split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${keyPrefix}-bold-${i}`} className="font-bold text-gray-900 dark:text-gray-100">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    // Italic (*text*)
    result = result.map((part, i) => {
      if (typeof part === 'string') {
        return part.split(/(\*[^*]+\*)/g).map((subPart, j) => {
          if (subPart.startsWith('*') && subPart.endsWith('*') && !subPart.startsWith('**')) {
            return <em key={`${keyPrefix}-italic-${i}-${j}`} className="italic text-gray-800 dark:text-gray-200">{subPart.slice(1, -1)}</em>;
          }
          return subPart;
        });
      }
      return part;
    }).flat();

    // Links [text](url)
    result = result.map((part, i) => {
      if (typeof part === 'string') {
        return part.split(/(\[[^\]]+\]\([^)]+\))/g).map((subPart, j) => {
          const linkMatch = subPart.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (linkMatch) {
            return (
              <a 
                key={`${keyPrefix}-link-${i}-${j}`}
                href={linkMatch[2]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-2 underline-offset-2 hover:decoration-blue-600 transition-colors"
              >
                {linkMatch[1]}
              </a>
            );
          }
          return subPart;
        });
      }
      return part;
    }).flat();

    return <>{result}</>;
  };

  const renderMessageContent = (content) => {
    return <div className="markdown-content">{parseMarkdown(content)}</div>;
  };

  const quickPrompts = [
    "📊 Analyze this data",
    "📈 Show trends",
    "🔍 Find insights",
    "📋 Summarize data"
  ];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
        {/* Enhanced Header */}
        <CardHeader className="p-0 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">AI Data Assistant</CardTitle>
                  <p className="text-sm opacity-90 mt-1">Powered by advanced AI • Ready to help analyze your data</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                className="h-10 w-10 text-white hover:bg-white/20 rounded-full transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-blue-50/30 dark:from-gray-900 dark:to-blue-900/20">
          {messages.map((message, index) => (
            <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''} animate-in slide-in-from-bottom-4 duration-300`} style={{ animationDelay: `${index * 50}ms` }}>
              {message.role !== 'user' && (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-lg transition-all duration-200 hover:shadow-xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white shadow-blue-200 dark:shadow-blue-900/50'
                    : message.role === 'error'
                    ? 'bg-gradient-to-br from-red-500 via-red-600 to-pink-600 text-white shadow-red-200 dark:shadow-red-900/50'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 shadow-gray-200 dark:shadow-gray-900/50'
                }`}
              >
                {renderMessageContent(message.content)}
              </div>
              {message.role === 'user' && (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
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

        {/* Enhanced Footer */}
        <CardFooter className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20">
          {/* Quick prompt buttons */}
          {messages.length === 1 && (
            <div className="w-full mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Quick actions:
              </p>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(prompt)}
                    className="text-xs bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border-2 border-gray-200 hover:border-blue-300 transition-all duration-200"
                    disabled={isLoading}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your spreadsheet data..."
                autoComplete="off"
                disabled={isLoading}
                className="pr-12 border-2 border-gray-200 focus:border-blue-400 dark:border-gray-600 dark:focus:border-blue-500 rounded-xl bg-white dark:bg-gray-800 transition-all duration-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <MessageCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-xl px-6 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};