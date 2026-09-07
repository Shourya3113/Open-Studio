import React, { useState } from 'react';
import { Copy, Check, ArrowDownToLine, Code2 } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';

interface MarkdownMessageProps {
  content: string;
  isStreaming?: boolean;
}

interface CodeBlockPart {
  type: 'code';
  language: string;
  code: string;
}

interface TextBlockPart {
  type: 'text';
  text: string;
}

type ContentPart = CodeBlockPart | TextBlockPart;

/**
 * Splits raw markdown into text segments and code blocks,
 * gracefully tolerating unclosed code blocks during token streaming.
 */
export function parseMarkdownParts(markdown: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const lines = markdown.split('\n');

  let inCodeBlock = false;
  let currentLanguage = '';
  let currentCodeLines: string[] = [];
  let currentTextLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        // Flushing previous text
        if (currentTextLines.length > 0) {
          parts.push({ type: 'text', text: currentTextLines.join('\n') });
          currentTextLines = [];
        }
        inCodeBlock = true;
        currentLanguage = line.trim().slice(3).trim() || 'plaintext';
        currentCodeLines = [];
      } else {
        // Closing current code block
        parts.push({
          type: 'code',
          language: currentLanguage,
          code: currentCodeLines.join('\n'),
        });
        inCodeBlock = false;
        currentLanguage = '';
        currentCodeLines = [];
      }
    } else {
      if (inCodeBlock) {
        currentCodeLines.push(line);
      } else {
        currentTextLines.push(line);
      }
    }
  }

  // Handle open block during streaming
  if (inCodeBlock && currentCodeLines.length > 0) {
    parts.push({
      type: 'code',
      language: currentLanguage,
      code: currentCodeLines.join('\n'),
    });
  } else if (currentTextLines.length > 0) {
    parts.push({ type: 'text', text: currentTextLines.join('\n') });
  }

  return parts;
}

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);
  const insertTextAtCursor = useEditorStore((s) => s.insertTextAtCursor);
  const activeBufferId = useEditorStore((s) => s.activeBufferId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleInsert = () => {
    insertTextAtCursor(code);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-md border border-ide-border/80 bg-ide-bg overflow-hidden shadow-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-ide-activityBar border-b border-ide-border/60 text-[11px] select-none">
        <div className="flex items-center gap-1.5 text-ide-textMuted font-mono lowercase">
          <Code2 size={13} className="text-ide-accent" />
          <span>{language || 'code'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeBufferId && (
            <button
              onClick={handleInsert}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-ide-textMuted hover:text-ide-textBright hover:bg-ide-hover transition"
              title="Insert snippet into active editor at cursor"
            >
              {inserted ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 text-[10px]">Inserted</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine size={12} />
                  <span className="text-[10px]">Insert</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-ide-textMuted hover:text-ide-textBright hover:bg-ide-hover transition"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400 text-[10px]">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span className="text-[10px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre className="p-3 text-[11.5px] font-mono leading-relaxed text-ide-textBright overflow-x-auto selection:bg-ide-accent/30 selection:text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const InlineTextRenderer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1 text-xs leading-relaxed text-ide-textBright break-words">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Headings
        if (line.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-semibold text-sm text-ide-textBright pt-1.5 pb-0.5">
              {line.replace(/^###\s+/, '')}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-semibold text-base text-ide-textBright pt-2 pb-0.5 border-b border-ide-border/40">
              {line.replace(/^##\s+/, '')}
            </h3>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h2 key={idx} className="font-bold text-lg text-ide-textBright pt-2 pb-1 border-b border-ide-border">
              {line.replace(/^#\s+/, '')}
            </h2>
          );
        }

        // Blockquote
        if (line.startsWith('> ')) {
          return (
            <blockquote key={idx} className="border-l-2 border-ide-accent/60 pl-2.5 my-1 text-ide-textMuted italic">
              {renderInlineSpans(line.replace(/^>\s+/, ''))}
            </blockquote>
          );
        }

        // Bullet list
        if (line.match(/^[-*]\s+/)) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-ide-accent select-none mt-1 text-[8px]">•</span>
              <span className="flex-1">{renderInlineSpans(line.replace(/^[-*]\s+/, ''))}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = line.match(/^(\d+)\.\s+/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-2">
              <span className="text-ide-textMuted select-none font-mono text-[11px]">{numMatch[1]}.</span>
              <span className="flex-1">{renderInlineSpans(line.replace(/^\d+\.\s+/, ''))}</span>
            </div>
          );
        }

        // Regular paragraph line
        return <p key={idx}>{renderInlineSpans(line)}</p>;
      })}
    </div>
  );
};

/**
 * Renders inline code backticks (`code`), bold (**text**), and italic (*text*).
 */
function renderInlineSpans(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Tokenize by inline code `...`
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderFormatting(text.substring(lastIndex, match.index), parts.length));
    }
    parts.push(
      <code
        key={`code_${match.index}`}
        className="px-1.5 py-0.5 mx-0.5 rounded bg-ide-bg border border-ide-border/60 text-amber-300 font-mono text-[11px]"
      >
        {match[1]}
      </code>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(renderFormatting(text.substring(lastIndex), parts.length));
  }

  return parts;
}

function renderFormatting(text: string, keyPrefix: number): React.ReactNode {
  // Bold **text**
  if (text.includes('**')) {
    const boldParts = text.split(/\*\*([^*]+)\*\*/g);
    return (
      <span key={`fmt_${keyPrefix}`}>
        {boldParts.map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="font-semibold text-white">
              {part}
            </strong>
          ) : (
            part
          )
        )}
      </span>
    );
  }
  return text;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, isStreaming }) => {
  const parts = parseMarkdownParts(content);

  return (
    <div className="space-y-1 select-text">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return <CodeBlock key={idx} language={part.language} code={part.code} />;
        }
        return <InlineTextRenderer key={idx} text={part.text} />;
      })}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 ml-1 bg-ide-accent animate-pulse align-middle" />
      )}
    </div>
  );
};
