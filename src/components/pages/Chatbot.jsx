import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { X, Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';

export const Chatbot = ({ onSendMessage, isLoading, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 'initial',
      role: 'ai',
      content: "Hello! I'm your AI assistant. Ask me anything about the current sheet.",
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
        <pre key={`code-${match.index}`} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-xs overflow-x-auto my-2">
          {language && <div className="text-gray-500 text-xs mb-1">{language}</div>}
          <code>{code}</code>
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
          <p key={`p-${elements.length}`} className="mb-2">
            {parseInlineElements(paragraphText)}
          </p>
        );
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside mb-2 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx}>{parseInlineElements(item)}</li>
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
          const className = level === 1 ? 'text-xl font-bold mb-2' :
                          level === 2 ? 'text-lg font-bold mb-2' :
                          level === 3 ? 'text-base font-bold mb-1' :
                          'text-sm font-semibold mb-1';
          
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
      <div key={`table-${Math.random()}`} className="overflow-x-auto mb-4">
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              {headerRow.map((header, i) => (
                <th 
                  key={i} 
                  className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold"
                >
                  {parseInlineElements(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="even:bg-gray-50 dark:even:bg-gray-800/50">
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex} 
                    className="border border-gray-300 dark:border-gray-600 px-3 py-2"
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
          <code key={index} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">
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
        return <strong key={`${keyPrefix}-bold-${i}`}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    // Italic (*text*)
    result = result.map((part, i) => {
      if (typeof part === 'string') {
        return part.split(/(\*[^*]+\*)/g).map((subPart, j) => {
          if (subPart.startsWith('*') && subPart.endsWith('*') && !subPart.startsWith('**')) {
            return <em key={`${keyPrefix}-italic-${i}-${j}`}>{subPart.slice(1, -1)}</em>;
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
                className="text-blue-500 hover:underline"
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

  return (
    <Card className="fixed bottom-4  right-4 w-full max-w-md h-[70vh] flex flex-col z-50 shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <CardTitle className="text-lg">AI Assistant</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
            {message.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : message.role === 'error'
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-muted'
              }`}
            >
              {renderMessageContent(message.content)}
            </div>
             {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
           <div className="flex items-start gap-3">
             <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="p-3 rounded-lg bg-muted flex items-center">
                  <Loader2 className="w-5 h-5 animate-spin"/>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="p-4 border-t">
        <div className="w-full flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the data..."
            autoComplete="off"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};