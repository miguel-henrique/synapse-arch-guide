import React from 'react';
import './Markdown.css';

// ─────────────────────────────────────────────────────────────────────────────
// A small, dependency-free markdown renderer tuned for the doc content in
// src/data/docs.ts. Supports:
//   #/##/### headings · paragraphs · - and 1. lists · ``` code fences ·
//   > blockquotes · | tables | · inline `code` and **bold**
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  source: string;
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

function parse(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Code fence
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().replace(/```/g, '').trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: 'code', lang, code: code.join('\n') });
      continue;
    }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ kind: 'heading', level: h[1].length, text: h[2].trim() });
      i++;
      continue;
    }

    // Table — a line with pipes followed by a separator row
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const header = splitRow(line);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ kind: 'table', header, rows });
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'quote', lines: quote });
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*[-*]\s+/, '');
        // Continuation lines (indented, not a new bullet)
        i++;
        while (
          i < lines.length &&
          lines[i].trim() !== '' &&
          !/^\s*[-*]\s+/.test(lines[i]) &&
          !/^\s*\d+\.\s+/.test(lines[i]) &&
          !/^#{1,6}\s/.test(lines[i]) &&
          !lines[i].trimStart().startsWith('```') &&
          /^\s+/.test(lines[i])
        ) {
          item += ' ' + lines[i].trim();
          i++;
        }
        items.push(item);
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*\d+\.\s+/, '');
        i++;
        while (
          i < lines.length &&
          lines[i].trim() !== '' &&
          !/^\s*[-*]\s+/.test(lines[i]) &&
          !/^\s*\d+\.\s+/.test(lines[i]) &&
          !/^#{1,6}\s/.test(lines[i]) &&
          !lines[i].trimStart().startsWith('```') &&
          /^\s+/.test(lines[i])
        ) {
          item += ' ' + lines[i].trim();
          i++;
        }
        items.push(item);
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    // Paragraph — collect consecutive non-structural lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !lines[i].trimStart().startsWith('```') &&
      !lines[i].trimStart().startsWith('>') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) blocks.push({ kind: 'para', text: para.join(' ') });
  }

  return blocks;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(c => c.trim());
}

// Inline formatting: **bold** and `code`
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Tokenize on `code` first (highest precedence), then **bold** inside the rest.
  const codeParts = text.split(/(`[^`]+`)/g);
  codeParts.forEach((part, ci) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      nodes.push(
        <code key={`${keyBase}-c${ci}`} className="md__code-inline">
          {part.slice(1, -1)}
        </code>,
      );
      return;
    }
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    boldParts.forEach((bp, bi) => {
      if (bp.startsWith('**') && bp.endsWith('**') && bp.length > 2) {
        nodes.push(<strong key={`${keyBase}-c${ci}-b${bi}`}>{bp.slice(2, -2)}</strong>);
      } else if (bp) {
        nodes.push(<React.Fragment key={`${keyBase}-c${ci}-t${bi}`}>{bp}</React.Fragment>);
      }
    });
  });
  return nodes;
}

export function Markdown({ source }: Props) {
  const blocks = React.useMemo(() => parse(source), [source]);

  return (
    <div className="md">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'heading': {
            const Tag = (`h${Math.min(b.level + 2, 6)}`) as keyof JSX.IntrinsicElements;
            return (
              <Tag key={i} className={`md__h md__h${b.level}`}>
                {renderInline(b.text, `h${i}`)}
              </Tag>
            );
          }
          case 'para':
            return (
              <p key={i} className="md__p">
                {renderInline(b.text, `p${i}`)}
              </p>
            );
          case 'code':
            return (
              <pre key={i} className="md__pre">
                {b.lang && <span className="md__pre-lang">{b.lang}</span>}
                <code>{b.code}</code>
              </pre>
            );
          case 'ul':
            return (
              <ul key={i} className="md__ul">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `ul${i}-${j}`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="md__ol">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `ol${i}-${j}`)}</li>
                ))}
              </ol>
            );
          case 'quote':
            return (
              <blockquote key={i} className="md__quote">
                {b.lines.map((ln, j) => (
                  <p key={j}>{renderInline(ln, `q${i}-${j}`)}</p>
                ))}
              </blockquote>
            );
          case 'table':
            return (
              <div key={i} className="md__table-wrap">
                <table className="md__table">
                  <thead>
                    <tr>
                      {b.header.map((h, j) => (
                        <th key={j}>{renderInline(h, `th${i}-${j}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c}>{renderInline(cell, `td${i}-${r}-${c}`)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
