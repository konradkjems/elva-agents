import { Fragment } from 'react';

/**
 * Minimal, safe markdown → React renderer for chat messages.
 * No innerHTML anywhere: model output and visitor text can never inject
 * markup (v1 rendered raw HTML). Supports paragraphs, line breaks, - / * / 1.
 * lists, #-headings, **bold**, *italic*, `code`, [links](url), bare URLs and
 * emails. Image links are lifted out and returned separately.
 *
 * `animate`:
 *   'stream'  — words mount with the blur-in as they arrive (keys are source
 *               offsets, so earlier words never re-animate)
 *   'stagger' — every word blurs in with a short cascade (welcome message)
 */

const IMAGE_EXT = /\.(?:jpe?g|png|gif|webp|avif|svg)(?:[?#][^\s)]*)?$/i;
const URL_RE = /https?:\/\/[^\s<>()[\]{}"']+[^\s<>()[\]{}"'.,;:!?]/gi;

export function extractImages(text) {
  const images = [];
  let out = String(text || '').replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_, alt, url) => {
    images.push({ url, alt });
    return '';
  });
  out = out.replace(URL_RE, (url, offset, src) => {
    const before = src.slice(Math.max(0, offset - 2), offset);
    if (before === '](') return url; // part of a [text](url) link
    if (IMAGE_EXT.test(url)) {
      images.push({ url, alt: '' });
      return '';
    }
    return url;
  });
  const seen = new Set();
  return {
    text: out.replace(/[ \t]+\n/g, '\n').trim(),
    images: images.filter((img) => (seen.has(img.url) ? false : seen.add(img.url))),
  };
}

export function linkLabel(url) {
  try {
    const u = new URL(url);
    const segs = decodeURIComponent(u.pathname).split('/').filter((s) => s && !/^\d+$/.test(s));
    let last = (segs[segs.length - 1] || '').replace(/\.(html?|php|aspx|jsp)$/i, '');
    last = last.replace(/&[a-z]+;/gi, ' ').replace(/^[\d&.]+/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (last.length < 3 || /^\d/.test(last)) return u.hostname.replace(/^www\./, '');
    return last.charAt(0).toUpperCase() + last.slice(1);
  } catch {
    return 'Link';
  }
}

function safeHref(url) {
  const u = String(url || '').trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (/^mailto:/i.test(u)) return u;
  return null;
}

/* ------------------------------------------------------------------ inline */

const INLINE = [
  { type: 'code', re: /`([^`\n]+)`/y },
  { type: 'link', re: /\[([^\]\n]+)\]\(\s*([^)\s]+)\s*\)/y },
  { type: 'strong', re: /\*\*([^*\n](?:[^\n]*?[^*\n])?)\*\*/y },
  { type: 'strong', re: /__([^_\n](?:[^\n]*?[^_\n])?)__/y },
  { type: 'em', re: /\*([^*\s](?:[^*\n]*?[^*\s])?)\*/y },
  { type: 'em', re: /(?<![\w])_([^_\s](?:[^_\n]*?[^_\s])?)_(?![\w])/y },
  { type: 'url', re: /https?:\/\/[^\s<>()[\]{}"']+[^\s<>()[\]{}"'.,;:!?]/y },
  { type: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/y },
];

function tokenize(text, base) {
  const nodes = [];
  let buf = '';
  let bufStart = base;
  let i = 0;
  const flush = () => {
    if (buf) nodes.push({ type: 'text', value: buf, offset: bufStart });
    buf = '';
  };
  while (i < text.length) {
    let matched = false;
    for (const rule of INLINE) {
      // cheap prefilter on the first char
      const ch = text[i];
      if (rule.type === 'code' && ch !== '`') continue;
      if (rule.type === 'link' && ch !== '[') continue;
      if ((rule.type === 'strong' || rule.type === 'em') && ch !== '*' && ch !== '_') continue;
      if (rule.type === 'url' && ch !== 'h') continue;
      if (rule.type === 'email' && !/[A-Za-z0-9._%+-]/.test(ch)) continue;
      if (rule.type === 'email' && i > 0 && /[A-Za-z0-9._%+-]/.test(text[i - 1])) continue;
      rule.re.lastIndex = i;
      const m = rule.re.exec(text);
      if (!m) continue;
      if (rule.type === 'email' && !m[0].includes('@')) continue;
      flush();
      const start = base + i;
      if (rule.type === 'code') nodes.push({ type: 'code', value: m[1], offset: start });
      else if (rule.type === 'link') nodes.push({ type: 'link', href: m[2], children: tokenize(m[1], start + 1), offset: start });
      else if (rule.type === 'url') nodes.push({ type: 'link', href: m[0], children: [{ type: 'text', value: linkLabel(m[0]), offset: start }], offset: start });
      else if (rule.type === 'email') nodes.push({ type: 'link', href: `mailto:${m[0]}`, children: [{ type: 'text', value: m[0], offset: start }], offset: start });
      else nodes.push({ type: rule.type, children: tokenize(m[1], start + 2), offset: start });
      i += m[0].length;
      bufStart = base + i;
      matched = true;
      break;
    }
    if (!matched) {
      if (!buf) bufStart = base + i;
      buf += text[i];
      i += 1;
    }
  }
  flush();
  return nodes;
}

function Words({ value, offset, anim }) {
  if (!anim) return value;
  const parts = value.split(/(\s+)/);
  let pos = offset;
  return parts.map((part) => {
    const key = pos;
    pos += part.length;
    if (!part || /^\s+$/.test(part)) return part;
    const style = anim.mode === 'stagger' ? { animationDelay: `${Math.min(anim.next(), 900)}ms` } : undefined;
    return (
      <span key={key} className="elva-word" style={style}>
        {part}
      </span>
    );
  });
}

function renderInline(nodes, anim) {
  return nodes.map((n) => {
    const key = `${n.type}-${n.offset}`;
    switch (n.type) {
      case 'text':
        return <Fragment key={key}><Words value={n.value} offset={n.offset} anim={anim} /></Fragment>;
      case 'code':
        return <code key={key}>{n.value}</code>;
      case 'strong':
        return <strong key={key}>{renderInline(n.children, anim)}</strong>;
      case 'em':
        return <em key={key}>{renderInline(n.children, anim)}</em>;
      case 'link': {
        const href = safeHref(n.href);
        if (!href) return <Fragment key={key}>{renderInline(n.children, anim)}</Fragment>;
        return (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {renderInline(n.children, anim)}
          </a>
        );
      }
      default:
        return null;
    }
  });
}

/* ------------------------------------------------------------------ blocks */

function parseBlocks(src) {
  const lines = src.split('\n');
  const blocks = [];
  let offset = 0;
  let para = null;
  let list = null;
  const endPara = () => {
    if (para) blocks.push(para);
    para = null;
  };
  const endList = () => {
    if (list) blocks.push(list);
    list = null;
  };
  for (const raw of lines) {
    const lineStart = offset;
    offset += raw.length + 1;
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      endPara();
      endList();
      continue;
    }
    const bullet = /^\s*(?:[-*•])\s+(.*)$/.exec(line);
    const ordered = /^\s*(\d{1,3})[.)]\s+(.*)$/.exec(line);
    const heading = /^\s*(#{1,4})\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      endPara();
      const kind = bullet ? 'ul' : 'ol';
      const text = bullet ? bullet[1] : ordered[2];
      const at = lineStart + line.indexOf(text);
      if (!list || list.kind !== kind) {
        endList();
        list = { type: 'list', kind, start: ordered ? Number(ordered[1]) : 1, items: [], offset: lineStart };
      }
      list.items.push({ text, offset: at });
      continue;
    }
    if (heading) {
      endPara();
      endList();
      blocks.push({ type: 'heading', text: heading[2], offset: lineStart + line.indexOf(heading[2]) });
      continue;
    }
    endList();
    if (!para) para = { type: 'p', lines: [], offset: lineStart };
    para.lines.push({ text: line, offset: lineStart });
  }
  endPara();
  endList();
  return blocks;
}

export function Markdown({ text, animate, className }) {
  const blocks = parseBlocks(String(text || ''));
  let counter = 0;
  const anim = animate ? { mode: animate, next: () => (counter++) * 22 } : null;
  return (
    <div className={className}>
      {blocks.map((b) => {
        if (b.type === 'heading') return <h4 key={`h-${b.offset}`}>{renderInline(tokenize(b.text, b.offset), anim)}</h4>;
        if (b.type === 'list') {
          const Tag = b.kind;
          return (
            <Tag key={`l-${b.offset}`} start={b.kind === 'ol' && b.start !== 1 ? b.start : undefined}>
              {b.items.map((it) => (
                <li key={it.offset}>{renderInline(tokenize(it.text, it.offset), anim)}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={`p-${b.offset}`}>
            {b.lines.map((ln, i) => (
              <Fragment key={ln.offset}>
                {i > 0 && <br />}
                {renderInline(tokenize(ln.text, ln.offset), anim)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
