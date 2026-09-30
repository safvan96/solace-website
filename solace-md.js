// Markdown -> React renderer for SOLACE page copy. Inline styles only.
(function () {
  var C = { bg: '#080808', panel: '#131313', panel2: '#1A1A1A', line: 'rgba(237,237,237,0.12)', bone: '#EDEDED', muted: '#9C9C9C', copper: '#C2A05A', slate: '#78878A', scarlet: '#C8483E', danger: '#DE9A90', moss: '#789179' };
  var SERIF = "'Montserrat', system-ui, -apple-system, 'Segoe UI', sans-serif", SANS = SERIF, MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace";
  var OVERRIDES = { 'permadeath-pkpd': 'permadeath', 'slaver-break-will': 'slaver-breaking', 'slaver-break-will-and-truth-compulsion': 'slaver-breaking' };
  var PENDING_TIP = 'This detail is still being finalized. It is not a live rule.';

  function slug(t) {
    var s = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').toLowerCase().replace(/[*_`]/g, '').replace(/^\d+\.\s+/, '').replace(/[—–]/g, ' ')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
    return OVERRIDES[s] || s;
  }
  function plain(t) {
    return t.replace(/\[CONFIRM BEFORE LAUNCH:\s*([^\]]*)\]/g, 'In development: $1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`]/g, '').replace(/<[^>]+>/g, '');
  }
  function toHref(u) {
    if (/^https?:/.test(u)) return u;
    if (u.charAt(0) === '/') { var parts = u.split('#'); return '#' + parts[0] + (parts[1] ? '?s=' + parts[1] : ''); }
    return u;
  }
  var ROUTE_RE = /^\/[a-z\/-]*(#[a-z0-9-]+)?$/;
  var linkStyle = { color: C.copper, textDecoration: 'underline', textDecorationColor: 'rgba(194,160,90,0.45)', textUnderlineOffset: '3px' };

  function inline(text, h, ctx, kp) {
    var RE = /\[CONFIRM BEFORE LAUNCH:\s*([^\]]*)\]|\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|`([^`]+)`|\*([^*\s][^*]*?)\*|\[([^\]]+)\]/g;
    var out = [], last = 0, m, k = 0; kp = kp || 'i';
    while ((m = RE.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      var key = kp + '-' + (k++);
      if (m[1] !== undefined) {
        out.push(h('span', { key: key, title: PENDING_TIP, style: { display: 'inline' } },
          h('span', { style: { fontFamily: MONO, fontSize: '0.72em', letterSpacing: '0.04em', color: C.bone, border: '1px solid rgba(194,160,90,0.6)', background: 'rgba(194,160,90,0.12)', padding: '1px 7px', borderRadius: '3px', marginRight: '6px', whiteSpace: 'nowrap', verticalAlign: '2px' } }, '◇ In development'),
          h('span', { style: { color: C.muted, fontStyle: 'italic' } }, m[1])));
      } else if (m[2] !== undefined) {
        out.push(h('a', { key: key, href: toHref(m[3]), style: linkStyle }, inline(m[2], h, ctx, key)));
      } else if (m[4] !== undefined) {
        out.push(h('strong', { key: key, style: { color: C.bone, fontWeight: 600 } }, inline(m[4], h, ctx, key)));
      } else if (m[5] !== undefined) {
        var code = m[5];
        if (ROUTE_RE.test(code) && ctx && ctx.labels) {
          var base = code.split('#')[0];
          out.push(h('a', { key: key, href: toHref(code), style: linkStyle }, (ctx.labels[base] || code) + ' →'));
        } else {
          out.push(h('code', { key: key, style: { fontFamily: MONO, fontSize: '0.86em', background: C.panel2, border: '1px solid ' + C.line, padding: '1px 6px', borderRadius: '3px', color: C.bone } }, code));
        }
      } else if (m[6] !== undefined) {
        out.push(h('em', { key: key, style: { fontStyle: 'italic' } }, inline(m[6], h, ctx, key)));
      } else if (m[7] !== undefined) {
        out.push(h('span', { key: key, title: 'Placeholder: real value not provided yet', style: { fontFamily: MONO, fontSize: '0.8em', color: C.muted, border: '1px dashed rgba(237,237,237,0.35)', padding: '1px 7px', borderRadius: '3px' } }, 'Pending · ' + m[7]));
      }
      last = RE.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  function parse(md) {
    var lines = md.replace(/<!--[\s\S]*?-->/g, '').split('\n'), blocks = [], i = 0, m;
    var isStart = function (s) { return /^(#{1,4}\s|\||>|<CRITICAL|[-*] |\d+\.\s|---+\s*$)/.test(s); };
    while (i < lines.length) {
      var l = lines[i], t = l.trim();
      if (!t) { i++; continue; }
      if ((m = t.match(/^(#{1,4})\s+(.*)/))) { blocks.push({ t: 'h', lv: m[1].length, text: m[2].trim() }); i++; continue; }
      if (/^<CRITICAL/.test(t)) { blocks.push({ t: 'alert' }); i++; continue; }
      if (/^---+\s*$/.test(t)) { blocks.push({ t: 'hr' }); i++; continue; }
      if (t.charAt(0) === '>') { var q = []; while (i < lines.length && lines[i].trim().charAt(0) === '>') { q.push(lines[i].trim().replace(/^>\s?/, '')); i++; } blocks.push({ t: 'quote', text: q.join(' ') }); continue; }
      if (t.charAt(0) === '|') {
        var rows = []; while (i < lines.length && lines[i].trim().charAt(0) === '|') { rows.push(lines[i].trim()); i++; }
        var cells = function (r) { return r.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); };
        var hasSep = rows[1] && /^\|[\s:|-]+\|$/.test(rows[1]);
        var head = cells(rows[0]);
        var align = hasSep ? cells(rows[1]).map(function (s) { return /-:$/.test(s) ? 'right' : 'left'; }) : head.map(function () { return 'left'; });
        blocks.push({ t: 'table', head: head, align: align, rows: rows.slice(hasSep ? 2 : 1).map(cells) }); continue;
      }
      if (/^- \[[ xX]\]\s/.test(t)) { var ci = []; while (i < lines.length && /^- \[[ xX]\]\s/.test(lines[i].trim())) { ci.push(lines[i].trim().replace(/^- \[[ xX]\]\s/, '')); i++; } blocks.push({ t: 'check', items: ci }); continue; }
      if (/^[-*] /.test(t)) { var ui = []; while (i < lines.length && /^[-*] /.test(lines[i].trim())) { ui.push(lines[i].trim().replace(/^[-*] /, '')); i++; } blocks.push({ t: 'ul', items: ui }); continue; }
      if (/^\d+\.\s/.test(t)) { var oi = []; while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { oi.push(lines[i].trim().replace(/^\d+\.\s/, '')); i++; } blocks.push({ t: 'ol', items: oi }); continue; }
      var p = [];
      while (i < lines.length && lines[i].trim() && (p.length === 0 || !isStart(lines[i].trim()))) { p.push(lines[i].trim()); i++; }
      blocks.push({ t: 'p', text: p.join(' ') });
    }
    return blocks;
  }

  function blockText(b) {
    if (b.t === 'p' || b.t === 'quote') return plain(b.text);
    if (b.t === 'ul' || b.t === 'ol' || b.t === 'check') return b.items.map(plain).join(' ');
    if (b.t === 'table') return [b.head].concat(b.rows).map(function (r) { return r.map(plain).join(' '); }).join(' ');
    return '';
  }

  function render(md, h, ctx) {
    ctx = ctx || {};
    var blocks = parse(md || ''), title = '', subtitle = null, toc = [], sections = [], els = [], alertBuf = null, n = 0, route = ctx.route || '/';
    var sawTitle = false, cur = { id: '', heading: '', text: '' };
    sections.push(cur);
    var hIdx = -1;
    for (var bi = 0; bi < blocks.length; bi++) if (blocks[bi].t === 'h' && blocks[bi].lv === 1) { hIdx = bi; break; }
    if (hIdx >= 0) {
      title = plain(blocks[hIdx].text); sawTitle = true;
      var nb = blocks[hIdx + 1];
      if (nb && nb.t === 'p' && /^(\*{1,2}).+\1$/.test(nb.text)) { subtitle = inline(nb.text.replace(/^\*\*(.+)\*\*$/, '$1').replace(/^\*(.+)\*$/, '$1'), h, ctx, 'sub'); blocks.splice(hIdx + 1, 1); }
      blocks.splice(hIdx, 1);
    }
    var h2count = blocks.filter(function (b) { return b.t === 'h' && b.lv <= 2; }).length;
    var push = function (el) { (alertBuf ? alertBuf : els).push(el); };
    var closeAlert = function () {
      if (!alertBuf) return;
      els.push(h('div', { key: 'al' + (n++), role: 'alert', style: { margin: '28px 0', border: '1px solid ' + C.scarlet, borderRadius: '6px', background: 'rgba(200,72,62,0.12)', padding: '22px 24px 8px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', fontFamily: MONO, fontSize: '13px', letterSpacing: '0.06em', color: C.danger, marginBottom: '10px' } },
          h('span', { 'aria-hidden': 'true', style: { display: 'inline-flex', width: '22px', height: '22px', alignItems: 'center', justifyContent: 'center', border: '1.5px solid ' + C.danger, borderRadius: '50%', fontWeight: 700, fontSize: '13px' } }, '!'),
          'CRITICAL WARNING: READ BEFORE ATTACKING IN THE HUB'), alertBuf));
      alertBuf = null;
    };
    blocks.forEach(function (b) {
      var key = 'b' + (n++);
      if (b.t === 'h') {
        closeAlert();
        var lv = b.lv === 1 ? 1 : b.lv, id = slug(b.text);
        cur = { id: id, heading: plain(b.text), text: '' }; sections.push(cur);
        if (lv <= 2 || (h2count < 3 && lv === 3)) toc.push({ id: id, text: plain(b.text).replace(/^\d+\.\s+/, ''), level: lv });
        var anchor = h('a', { href: '#' + route + '?s=' + id, 'aria-label': 'Link to this section', title: 'Copy link to this section', onClick: function () { if (ctx.onCopy) ctx.onCopy(id); }, style: { marginLeft: '10px', color: C.slate, textDecoration: 'none', fontFamily: MONO, fontSize: '14px', fontWeight: 400, verticalAlign: 'middle' } }, '#');
        var clause = lv === 3 && b.text.match(/^([A-Z]-\d{2})[:\s—]+(.*)$/);
        if (lv === 1) push(h('h2', { key: key, id: id, style: { fontFamily: SERIF, fontWeight: 500, fontSize: '40px', lineHeight: 1.15, color: C.bone, margin: '72px 0 12px', paddingTop: '28px', borderTop: '1px solid ' + C.line, scrollMarginTop: '96px', textWrap: 'balance' } }, inline(b.text, h, ctx, key), anchor));
        else if (lv === 2) push(h('h2', { key: key, id: id, style: { fontFamily: SERIF, fontWeight: 500, fontSize: '29px', lineHeight: 1.2, color: C.bone, margin: '52px 0 14px', scrollMarginTop: '96px', textWrap: 'balance' } }, inline(b.text, h, ctx, key), anchor));
        else if (clause) push(h('h3', { key: key, id: id, style: { fontFamily: SERIF, fontWeight: 500, fontSize: '22px', lineHeight: 1.3, color: C.bone, margin: '38px 0 10px', scrollMarginTop: '96px', display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' } },
          h('span', { style: { fontFamily: MONO, fontSize: '13px', color: C.copper, border: '1px solid rgba(194,160,90,0.5)', padding: '2px 7px', borderRadius: '3px', letterSpacing: '0.04em' } }, clause[1]), h('span', null, inline(clause[2], h, ctx, key)), anchor));
        else push(h(lv === 3 ? 'h3' : 'h4', { key: key, id: id, style: { fontFamily: SERIF, fontWeight: 500, fontSize: lv === 3 ? '22px' : '19px', lineHeight: 1.3, color: C.bone, margin: '36px 0 10px', scrollMarginTop: '96px' } }, inline(b.text, h, ctx, key), anchor));
        return;
      }
      cur.text += ' ' + blockText(b);
      if (b.t === 'alert') { alertBuf = []; return; }
      if (b.t === 'hr') { push(h('hr', { key: key, style: { border: 0, borderTop: '1px solid ' + C.line, margin: '40px 0' } })); return; }
      if (b.t === 'p') { push(h('p', { key: key, style: { margin: '0 0 18px', textWrap: 'pretty' } }, inline(b.text, h, ctx, key))); return; }
      if (b.t === 'quote') { push(h('aside', { key: key, style: { margin: '8px 0 28px', padding: '16px 20px', background: C.panel, border: '1px solid ' + C.line, borderRadius: '6px', fontSize: '16px', color: C.muted } }, h('div', { style: { fontFamily: MONO, fontSize: '12px', letterSpacing: '0.06em', color: C.copper, marginBottom: '6px' } }, 'MARGINAL NOTE'), inline(b.text, h, ctx, key))); return; }
      if (b.t === 'ul' || b.t === 'ol') {
        push(h(b.t, { key: key, style: { margin: '0 0 22px', paddingLeft: b.t === 'ol' ? '26px' : '20px', display: 'flex', flexDirection: 'column', gap: '10px' } },
          b.items.map(function (it, j) { return h('li', { key: j, style: { paddingLeft: '4px', textWrap: 'pretty' } }, inline(it, h, ctx, key + j)); }))); return;
      }
      if (b.t === 'check') {
        push(h('ul', { key: key, style: { listStyle: 'none', margin: '0 0 24px', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' } },
          b.items.map(function (it, j) {
            var ck = route + ':' + j, on = !!(ctx.checked && ctx.checked[ck]);
            return h('li', { key: j }, h('label', { style: { display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '12px 16px', background: on ? 'rgba(120,145,121,0.12)' : C.panel, border: '1px solid ' + (on ? 'rgba(120,145,121,0.5)' : C.line), borderRadius: '6px', cursor: 'pointer', minHeight: '44px', boxSizing: 'border-box' } },
              h('input', { type: 'checkbox', checked: on, onChange: function () { ctx.toggle && ctx.toggle(ck); }, style: { width: '18px', height: '18px', marginTop: '3px', accentColor: C.moss, flexShrink: 0 } }),
              h('span', { style: { color: on ? C.muted : C.bone, textDecoration: on ? 'line-through' : 'none', textDecorationColor: 'rgba(237,237,237,0.35)' } }, inline(it, h, ctx, key + j))));
          }))); return;
      }
      if (b.t === 'table') {
        var cellBase = { padding: '11px 14px', borderBottom: '1px solid ' + C.line, verticalAlign: 'top', fontSize: '15.5px', lineHeight: 1.5 };
        push(h('div', { key: key, style: { margin: '6px 0 30px', overflowX: 'auto', border: '1px solid ' + C.line, borderRadius: '6px', WebkitOverflowScrolling: 'touch' } },
          h('table', { style: { borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: b.head.length > 4 ? '720px' : '480px' } },
            h('thead', null, h('tr', null, b.head.map(function (c, j) { return h('th', { key: j, scope: 'col', style: Object.assign({}, cellBase, { textAlign: b.align[j], fontFamily: MONO, fontSize: '12.5px', letterSpacing: '0.03em', fontWeight: 500, color: C.muted, background: C.panel2, position: j === 0 ? 'sticky' : 'static', left: 0, zIndex: j === 0 ? 1 : 0 }) }, inline(c, h, ctx, key + 'h' + j)); }))),
            h('tbody', null, b.rows.map(function (r, ri) {
              return h('tr', { key: ri }, r.map(function (c, j) { return h(j === 0 ? 'th' : 'td', { key: j, scope: j === 0 ? 'row' : undefined, style: Object.assign({}, cellBase, { textAlign: b.align[j] || 'left', fontWeight: j === 0 ? 500 : 400, color: C.bone, background: j === 0 ? C.panel : 'transparent', position: j === 0 ? 'sticky' : 'static', left: 0, fontVariantNumeric: 'tabular-nums', borderBottom: ri === r.length && false ? 0 : cellBase.borderBottom }) }, inline(c, h, ctx, key + ri + '-' + j)); }));
            }))))); return;
      }
    });
    closeAlert();
    return { title: title, subtitle: subtitle, toc: toc, sections: sections, body: h('div', null, els) };
  }

  window.SolaceMD = { render: render, inline: inline, parse: parse, slug: slug, plain: plain, toHref: toHref, C: C };
})();
