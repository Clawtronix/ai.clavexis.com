/* ai.clavexis.com shared: header/footer, API helper, auth state, small utilities. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  // Where the backend is. Empty = same address as the page (the backend serves the pages itself).
  // The GitHub Pages export sets <meta name="cx-api" content="https://api.clavexis.com">.
  const API = ((document.querySelector('meta[name="cx-api"]') || {}).content || '').replace(/\/$/, '');
  const apiUrl = (p) => API + p;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function api(path, opts = {}) {
    const init = { method: opts.method || (opts.json !== undefined ? 'POST' : 'GET'), credentials: API ? 'include' : 'same-origin',
                   headers: { 'X-Requested-With': 'clavexis' } };
    if (opts.json !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.json); }
    const r = await fetch(API + path, init).catch(() => null);
    if (API && init.method === 'GET' && (!r || r.status >= 500)) {
      // The backend can't be reached (offline, or not running yet): the GitHub Pages export keeps
      // copies of the public texts (legal pages, contact details) next to the pages.
      const copy = await fetch('/static-api' + path + '.json').catch(() => null);
      if (copy && copy.ok) return copy.json();
    }
    if (!r) throw Object.assign(new Error("Can't reach the ClavexisAI server right now. Try again in a minute."), { status: 0 });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.detail || ('Something went wrong (HTTP ' + r.status + ')')), { status: r.status });
    return d;
  }

  let meP = null;
  const me = () => (meP = meP || api('/api/auth/me').then((d) => d.user).catch(() => null));

  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); toast((label || 'Copied') + ' ✓'); } catch (e) { toast('Copy failed — select and copy manually'); }
  }
  function os() {
    const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    if (/win/i.test(p)) return 'windows';
    if (/mac/i.test(p)) return 'macos';
    if (/linux|x11/i.test(p)) return 'linux';
    return 'windows';
  }
  const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const usd = (n) => '$' + Number(n).toLocaleString('en-US');
  const date = (ts) => ts ? new Date(ts * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  // Tiny markdown for the legal pages (escape first; headings, bold, links, lists, tables, paragraphs).
  function md(src) {
    const lines = esc(src).split('\n'); const out = []; let list = null, table = null, para = [];
    const inline = (s) => s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((\/[^)\s]*|https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
    const flush = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
      if (list) { out.push('<ul>' + list.map((i) => '<li>' + inline(i) + '</li>').join('') + '</ul>'); list = null; }
      if (table) { out.push('<table>' + table.map((r, i) => '<tr>' + r.map((c) => (i ? '<td>' : '<th>') + inline(c.trim()) + (i ? '</td>' : '</th>')).join('') + '</tr>').join('') + '</table>'); table = null; } };
    for (const l of lines) {
      let m;
      if ((m = l.match(/^(#{1,3})\s+(.*)/))) { flush(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); }
      else if ((m = l.match(/^\s*(?:[-*]|[a-z]\))\s+(.*)/))) { if (para.length) { const p = para; para = []; out.push('<p>' + inline(p.join(' ')) + '</p>'); } (list = list || []).push(m[1]); }
      else if (/^\|.*\|$/.test(l.trim())) { if (/^\|[\s|:-]+\|$/.test(l.trim())) continue; (table = table || []).push(l.trim().slice(1, -1).split('|')); }
      else if (!l.trim()) flush();
      else if (list && /^\s{2,}/.test(l)) list[list.length - 1] += ' ' + l.trim();
      else para.push(l.trim());
    }
    flush(); return out.join('\n');
  }

  function header(user) {
    const h = document.createElement('header'); h.className = 'nav'; h.id = 'nav';
    h.innerHTML = `<div class="wrap nav-in">
      <a class="brand" href="/">ClavexisAI</a>
      <nav class="nav-links" aria-label="Primary">
        <a href="/#workspaces">Product</a><a href="/pricing">Pricing</a><a href="/download">Download</a>
        <a href="/download#extension">Extension</a>
      </nav>
      ${user ? `<a class="nav-user" href="/account">${esc(user.name || user.email)}</a>${user.admin ? '<a class="nav-user" href="/admin">Admin</a>' : ''}`
             : '<a class="nav-user" href="/signin">Sign in</a>'}
      <a class="btn btn-primary btn-sm nav-cta" href="/download">Download</a>
      <button class="nav-menu" type="button" aria-label="Menu" aria-expanded="false" aria-controls="nav-drawer">
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 5.5h14M3 10h14M3 14.5h14"/></svg></button></div>
      <div class="nav-drawer" id="nav-drawer" hidden><div class="wrap">
        <a href="/#workspaces">Product</a><a href="/pricing">Pricing</a><a href="/download">Download</a>
        <a href="/download#extension">Browser extension</a><a href="/contact">Contact &amp; support</a>
        ${user ? `<a href="/account">Your account (${esc(user.name || user.email)})</a>${user.admin ? '<a href="/admin">Admin</a>' : ''}` : '<a href="/signin">Sign in</a>'}
      </div></div>`;
    // phone / small screens: the links above are hidden, so the menu button opens them here
    const btn = h.querySelector('.nav-menu'), drawer = h.querySelector('.nav-drawer');
    const set = (open) => { drawer.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', () => set(drawer.hidden));
    drawer.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    return h;
  }
  let bizP = null;
  const biz = () => (bizP = bizP || api('/api/business').catch(() => ({})));

  function footer(b) {
    b = b || {};
    const name = b.legal_name || 'Clavexis', mail = b.support_email || 'contact@clavexis.com';
    const regs = [b.address, b.gstin && 'GSTIN ' + b.gstin, b.cin && 'CIN ' + b.cin, b.llpin && 'LLPIN ' + b.llpin].filter(Boolean);
    const f = document.createElement('footer');
    f.innerHTML = `<div class="wrap"><div class="foot">
      <div class="foot-brand"><a class="brand" href="/">ClavexisAI</a>
        <p>One AI workspace for chat, code, research and agents — running on your own computer.</p></div>
      <div><h4>Product</h4><ul><li><a href="/download">Download</a></li><li><a href="/download#extension">Browser extension</a></li>
        <li><a href="/pricing">Pricing</a></li><li><a href="/account">Your licences</a></li></ul></div>
      <div><h4>Company</h4><ul><li><a href="/contact">Contact &amp; support</a></li><li><a href="/contact#biz">Business details</a></li>
        <li><a href="mailto:${esc(mail)}">${esc(mail)}</a></li><li><a href="https://clavexis.com">clavexis.com</a></li></ul></div>
      <div><h4>Legal</h4><ul><li><a href="/eula">Licence agreement (EULA)</a></li><li><a href="/terms">Terms of sale</a></li>
        <li><a href="/refunds">Refunds</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/contact">Grievance officer</a></li></ul></div>
      </div><div class="foot-base"><span>&copy; ${new Date().getFullYear()} ${esc(name)}. All rights reserved.</span>
      <span>${b.card_only ? 'Prices in US dollars' : 'Prices in INR, inclusive of taxes'}</span></div>
      ${regs.length ? `<p class="foot-legal">${regs.map(esc).join(' · ')}</p>` : ''}</div>`;
    return f;
  }

  async function chrome() {
    const [user, b] = await Promise.all([me(), biz()]);
    const old = $('header.nav'); const h = header(user);
    if (old) old.replaceWith(h); else document.body.prepend(h);
    const oldF = $('body > footer'); const f = footer(b);
    if (oldF) oldF.replaceWith(f); else document.body.appendChild(f);
    addEventListener('scroll', () => h.classList.toggle('is-stuck', scrollY > 8), { passive: true });
    return user;
  }

  window.CX = { $, esc, api, apiUrl, me, biz, toast, copy, os, inr, usd, date, md, chrome };
})();
