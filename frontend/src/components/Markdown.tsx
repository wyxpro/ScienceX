/* 轻量 Markdown 渲染器（标题/加粗/列表/表格/引用/代码/链接） */
import { type ReactNode } from 'react';

let key = 0;
const k = () => `md-${key++}`;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  // 依次处理：`code`、**bold**、*italic*、[link](url)
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) out.push(<code key={k()}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('**')) out.push(<strong key={k()}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('*')) out.push(<em key={k()}>{tok.slice(1, -1)}</em>);
    else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;
      out.push(<a key={k()} href={mm[2]} target="_blank" rel="noreferrer">{mm[1]}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(src: string): ReactNode[] {
  const lines = src.split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      nodes.push(<p key={k()}>{inline(para.join(' '))}</p>);
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      flushPara();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i++; }
      i++;
      nodes.push(<pre key={k()}><code>{buf.join('\n')}</code></pre>);
      continue;
    }
    if (/^#{1,4}\s/.test(line)) {
      flushPara();
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s*/, '');
      const Tag = (`h${Math.min(level + 1, 4)}`) as 'h2';
      nodes.push(<Tag key={k()}>{inline(text)}</Tag>);
      i++; continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara();
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      nodes.push(<blockquote key={k()}>{inline(buf.join(' '))}</blockquote>);
      continue;
    }
    if (/^\|.*\|/.test(line) && i + 1 < lines.length && /^\|[\s:-]+\|/.test(lines[i + 1])) {
      flushPara();
      const parse = (l: string) => l.split('|').slice(1, -1).map((c) => c.trim());
      const head = parse(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|/.test(lines[i])) { rows.push(parse(lines[i])); i++; }
      nodes.push(
        <table key={k()}>
          <thead><tr>{head.map((h) => <th key={k()}>{inline(h)}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={k()}>{r.map((c) => <td key={k()}>{inline(c)}</td>)}</tr>)}</tbody>
        </table>
      );
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; }
      nodes.push(<ul key={k()}>{items.map((it) => <li key={k()}>{inline(it)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+[.、]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.、]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.、]\s+/, '')); i++; }
      nodes.push(<ol key={k()}>{items.map((it) => <li key={k()}>{inline(it)}</li>)}</ol>);
      continue;
    }
    if (line.trim() === '') { flushPara(); i++; continue; }
    para.push(line.trim());
    i++;
  }
  flushPara();
  return nodes;
}

export default function Markdown({ text, className = '' }: { text: string; className?: string }) {
  return <div className={`md ${className}`}>{renderMarkdown(text)}</div>;
}
