/* =========================================================
   OPINION — interactions, live feeds, sign-in, personalization
   ========================================================= */

(() => {
  /* ============================================================
     CONFIG — paste your Google OAuth Client ID here to enable
     Google Sign-In. Get one at:
       https://console.cloud.google.com/apis/credentials
     (create an OAuth 2.0 Client ID of type "Web application",
     and add your origin — e.g. http://localhost:8000 — to
     "Authorized JavaScript origins")
     ============================================================ */
  const GOOGLE_CLIENT_ID = ''; // e.g. 'xxxxxxxxxxxx-yyyyyyyyyy.apps.googleusercontent.com'

  /* ---------- Today's date: update ticker / hero ---------- */
  const updateTodayDate = () => {
    const now = new Date();
    const Y = now.getFullYear();
    const M = String(now.getMonth() + 1).padStart(2, '0');
    const D = String(now.getDate()).padStart(2, '0');
    const dotted = `${Y}.${M}.${D}`;
    const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
    const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
    const longDate = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${Y}`;
    document.querySelectorAll('[data-today-dot]').forEach(el => { el.textContent = dotted; });
    document.querySelectorAll('[data-today-long]').forEach(el => { el.textContent = longDate; });
  };
  updateTodayDate();

  /* ---------- Shared utilities ---------- */
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /* ---------- Outlet → homepage map ---------- */
  const SOURCE_URLS = [
    { match: ['朝日新聞', '朝日', 'Asahi'], url: 'https://www.asahi.com/' },
    { match: ['読売新聞', '読売', 'Yomiuri'], url: 'https://www.yomiuri.co.jp/' },
    { match: ['毎日新聞', '毎日', 'Mainichi'], url: 'https://mainichi.jp/' },
    { match: ['日本経済新聞', '日経', 'Nikkei'], url: 'https://www.nikkei.com/' },
    { match: ['産経新聞', '産経', 'Sankei'], url: 'https://www.sankei.com/' },
    { match: ['共同通信', '共同', 'Kyodo'], url: 'https://www.kyodonews.jp/' },
    { match: ['時事通信', '時事', 'Jiji'], url: 'https://www.jiji.com/' },
    { match: ['NHK'], url: 'https://www3.nhk.or.jp/news/' },
    { match: ['ロイター', 'Reuters'], url: 'https://jp.reuters.com/' },
    { match: ['AP通信', 'Associated Press', 'AP News', 'apnews'], url: 'https://apnews.com/' },
    { match: ['AFP'], url: 'https://www.afpbb.com/' },
    { match: ['Bloomberg'], url: 'https://www.bloomberg.co.jp/' },
    { match: ['BBC'], url: 'https://www.bbc.com/japanese' },
    { match: ['CNN'], url: 'https://www.cnn.co.jp/' },
    { match: ['ITmedia'], url: 'https://www.itmedia.co.jp/' },
    { match: ['東洋経済'], url: 'https://toyokeizai.net/' },
    { match: ['ダイヤモンド'], url: 'https://diamond.jp/' },
    { match: ['プレジデント'], url: 'https://president.jp/' },
    { match: ['Yahoo'], url: 'https://news.yahoo.co.jp/' },
    { match: ['TBS'], url: 'https://newsdig.tbs.co.jp/' },
    { match: ['日テレ', '日本テレビ'], url: 'https://news.ntv.co.jp/' },
    { match: ['テレ朝', 'テレビ朝日'], url: 'https://news.tv-asahi.co.jp/' },
    { match: ['フジ', 'FNN'], url: 'https://www.fnn.jp/' },
  ];

  const sourceLink = (name) => {
    const n = String(name || '').trim();
    if (!n) return '';
    const hit = SOURCE_URLS.find(e => e.match.some(m => n.includes(m)));
    if (!hit) return escapeHtml(n);
    return `<a class="src-link" href="${hit.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(n)}</a>`;
  };

  /* ============================================================
     IDENTITY + PROFILE + LEARNING STATE
     ============================================================ */
  const USER_KEY    = 'opinion_user_v1';
  const PROFILE_KEY = 'opinion_profile_v1';
  const PREFS_KEY   = 'opinion_prefs_v1';
  const CATS = ['nation', 'world', 'business', 'tech', 'ent'];
  const CAT_LABEL = { nation: 'POLITICS', world: 'WORLD', business: 'ECONOMY', tech: 'TECH', ent: 'CULTURE' };

  const loadJson = (key) => {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  };
  const saveJson = (key, v) => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  const removeKey = (key) => { try { localStorage.removeItem(key); } catch {} };

  const loadUser    = () => loadJson(USER_KEY);
  const saveUser    = (u) => saveJson(USER_KEY, u);
  const clearUser   = () => removeKey(USER_KEY);
  const loadProfile = () => loadJson(PROFILE_KEY);
  const saveProfile = (p) => saveJson(PROFILE_KEY, p);
  const clearProfile = () => removeKey(PROFILE_KEY);

  const defaultPrefs = () => ({ total: 0, cats: {}, sources: {}, keywords: {}, updatedAt: null });
  const loadPrefs = () => {
    const raw = loadJson(PREFS_KEY);
    if (!raw) return defaultPrefs();
    return {
      total: raw.total || 0,
      cats: raw.cats || {},
      sources: raw.sources || {},
      keywords: raw.keywords || {},
      updatedAt: raw.updatedAt || null,
    };
  };
  const capCounts = (obj, n) => {
    const entries = Object.entries(obj || {});
    if (entries.length <= n) return obj;
    entries.sort((a, b) => b[1] - a[1]);
    return Object.fromEntries(entries.slice(0, n));
  };
  const savePrefs = (p) => {
    p.updatedAt = new Date().toISOString();
    p.sources = capCounts(p.sources, 50);
    p.keywords = capCounts(p.keywords, 80);
    saveJson(PREFS_KEY, p);
  };
  const clearPrefs = () => removeKey(PREFS_KEY);

  const STOPWORDS = new Set([
    'the','a','an','of','to','in','on','at','and','or','for','is','are','be','was','were',
    'this','that','it','as','by','with','about','from','one','will','can','has','have',
    'について','による','として','という','です','ます','する','れる','られる','など','こと','もの',
  ]);

  const tokenize = (text) => {
    if (!text) return [];
    const cleaned = String(text).replace(
      /[\s\.,、。!?！？「」『』【】\(\)\[\]<>:;~＝=\/\\\-—–·"'，　]/g,
      ' '
    );
    return cleaned
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length >= 2 && t.length <= 15 && !STOPWORDS.has(t.toLowerCase()));
  };

  const recordClick = ({ cat, source, title }) => {
    if (!CATS.includes(cat)) return;
    const p = loadPrefs();
    p.cats[cat] = (p.cats[cat] || 0) + 1;
    p.total = (p.total || 0) + 1;
    if (source) p.sources[source] = (p.sources[source] || 0) + 1;
    tokenize(title).forEach(t => { p.keywords[t] = (p.keywords[t] || 0) + 1; });
    savePrefs(p);
  };

  /* ---------- TODAY slot distribution (cat-weighted) ---------- */
  const getCatWeights = () => {
    const p = loadPrefs();
    const sum = CATS.reduce((s, c) => s + (p.cats[c] || 0), 0);
    if (!sum) return Object.fromEntries(CATS.map(c => [c, 1 / CATS.length]));
    return Object.fromEntries(CATS.map(c => [c, ((p.cats[c] || 0) + 1) / (sum + CATS.length)]));
  };
  const distributeSlots = (weights, totalSlots = 8) => {
    const raw = Object.fromEntries(CATS.map(c => [c, Math.max(1, Math.round(weights[c] * totalSlots))]));
    const sorted = CATS.slice().sort((a, b) => weights[b] - weights[a]);
    let diff = totalSlots - Object.values(raw).reduce((a, b) => a + b, 0);
    let i = 0;
    while (diff !== 0 && i < 50) {
      const k = sorted[i % sorted.length];
      if (diff > 0) { raw[k] += 1; }
      else if (raw[k] > 1) { raw[k] -= 1; }
      diff = totalSlots - Object.values(raw).reduce((a, b) => a + b, 0);
      i++;
    }
    return raw;
  };

  /* ---------- Personalization scoring ---------- */
  const scoreItem = (item, ctx) => {
    const { prefs, profile, catOfFeed } = ctx;
    let s = 0;
    // recency boost (24h window)
    if (item.date) {
      const hours = (Date.now() - item.date.getTime()) / 3600000;
      s += Math.max(0, 24 - hours) * 0.02;
    }
    const tokens = tokenize(item.title);
    // explicit profile signals
    if (profile?.interests?.includes(CAT_LABEL[catOfFeed])) s += 1.0;
    if (profile?.keywords?.length) {
      const hit = profile.keywords.filter(k =>
        tokens.some(t => t === k || t.includes(k) || k.includes(t))
      ).length;
      s += hit * 0.8;
    }
    // implicit click history
    if (prefs?.cats?.[catOfFeed]) {
      const sum = Object.values(prefs.cats).reduce((a, b) => a + b, 0) || 1;
      s += (prefs.cats[catOfFeed] / sum) * 0.6;
    }
    if (prefs?.sources?.[item.source]) {
      s += Math.log1p(prefs.sources[item.source]) * 0.2;
    }
    tokens.forEach(t => {
      if (prefs?.keywords?.[t]) s += Math.log1p(prefs.keywords[t]) * 0.15;
    });
    return s;
  };

  const rankFeed = (feed, catKey) => {
    if (!feed || !feed.length) return feed || [];
    const prefs = loadPrefs();
    const profile = loadProfile() || {};
    const hasSignal =
      (prefs.total > 0) ||
      (profile.interests?.length > 0) ||
      (profile.keywords?.length > 0);
    if (!hasSignal) return feed;
    return feed.slice().sort((a, b) =>
      scoreItem(b, { prefs, profile, catOfFeed: catKey }) -
      scoreItem(a, { prefs, profile, catOfFeed: catKey })
    );
  };

  /* ============================================================
     FEEDS
     ============================================================ */
  const RSS_BASE = 'https://news.google.com/rss';
  const PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';
  const FEEDS = {
    top:      `${RSS_BASE}?hl=ja&gl=JP&ceid=JP:ja`,
    nation:   `${RSS_BASE}/headlines/section/topic/NATION?hl=ja&gl=JP&ceid=JP:ja`,
    world:    `${RSS_BASE}/headlines/section/topic/WORLD?hl=ja&gl=JP&ceid=JP:ja`,
    business: `${RSS_BASE}/headlines/section/topic/BUSINESS?hl=ja&gl=JP&ceid=JP:ja`,
    tech:     `${RSS_BASE}/headlines/section/topic/TECHNOLOGY?hl=ja&gl=JP&ceid=JP:ja`,
    ent:      `${RSS_BASE}/headlines/section/topic/ENTERTAINMENT?hl=ja&gl=JP&ceid=JP:ja`,
  };

  const parseItem = (item) => {
    const raw = item.title || '';
    const m = raw.match(/^(.+)\s+-\s+([^-]+)$/);
    const title = (m ? m[1] : raw).trim();
    const source = ((m ? m[2] : (item.author || 'NEWS'))).trim();
    const link = item.link || '#';
    const date = item.pubDate ? new Date(item.pubDate) : null;
    return { title, source, link, date };
  };

  const fetchFeed = async (url) => {
    const res = await fetch(PROXY + encodeURIComponent(url));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return (data.items || []).map(parseItem);
  };

  const timeAgo = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    const diff = Date.now() - date.getTime();
    if (diff < 0) return '';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  /* Link with data-cat (for click learning) and data-source (for source attribution) */
  const linkA = (it, cat) => {
    const dc  = cat ? ` data-cat="${escapeHtml(cat)}"` : '';
    const dsrc = it.source ? ` data-source="${escapeHtml(it.source)}"` : '';
    return `<a href="${escapeHtml(it.link)}" target="_blank" rel="noopener noreferrer"${dc}${dsrc}>${escapeHtml(it.title)}</a>`;
  };

  /* ============================================================
     RENDERERS
     ============================================================ */

  const renderToday = (feeds) => {
    const list = document.getElementById('todayNewsList');
    const updated = document.getElementById('todayUpdatedAt');
    const label = document.getElementById('todayLabel');
    const clicksLabel = document.getElementById('todayClicks');
    if (!list) return;

    const prefs = loadPrefs();
    const profile = loadProfile() || {};
    const personalized =
      (prefs.total > 0) ||
      (profile.interests?.length > 0) ||
      (profile.keywords?.length > 0);

    const weights = getCatWeights();
    const slots = distributeSlots(weights, 8);

    // Pick from each category's ranked feed
    let picked = [];
    CATS.forEach(c => {
      const n = slots[c] || 0;
      const arr = (feeds[c] || []).slice(0, n).map(it => ({ ...it, _cat: c }));
      picked = picked.concat(arr);
    });
    if (!picked.length && feeds.top && feeds.top.length) {
      picked = feeds.top.slice(0, 8).map(it => ({ ...it, _cat: 'nation' }));
    }
    // Final sort by score so the top of the list is the strongest match
    picked.sort((a, b) =>
      scoreItem(b, { prefs, profile, catOfFeed: b._cat }) -
      scoreItem(a, { prefs, profile, catOfFeed: a._cat })
    );
    picked = picked.slice(0, 8);

    if (label) label.textContent = personalized ? 'FOR YOU' : 'TODAY';
    if (clicksLabel) clicksLabel.textContent = personalized
      ? `learning: ${prefs.total || 0} clicks`
      : 'learning: idle';

    if (!picked.length) {
      list.innerHTML = '<li class="today-loading">Could not load today\'s news.</li>';
      return;
    }
    list.innerHTML = picked.map((it, i) => {
      const t = it.date
        ? `${String(it.date.getHours()).padStart(2, '0')}:${String(it.date.getMinutes()).padStart(2, '0')}`
        : '';
      return `
        <li class="today-item">
          <span class="t-num">${String(i + 1).padStart(2, '0')}</span>
          <div class="t-body">
            <span class="t-source">${sourceLink(it.source)}</span>
            <a class="t-headline" href="${escapeHtml(it.link)}" target="_blank" rel="noopener noreferrer" data-cat="${escapeHtml(it._cat)}" data-source="${escapeHtml(it.source)}">${escapeHtml(it.title)}</a>
          </div>
          <span class="t-time">${t}</span>
        </li>
      `;
    }).join('');
    if (updated) {
      const now = new Date();
      updated.textContent = `UPDATED: ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  };

  const renderTopStory = (items) => {
    const ts = document.querySelector('.top-story .ts-text');
    if (!ts || !items.length) return;
    const top = items[0];
    const h2 = ts.querySelector('h2');
    if (h2) h2.innerHTML = linkA(top, 'nation');
    const lede = ts.querySelector('.lede');
    if (lede) lede.textContent = `${top.source} · ${timeAgo(top.date)}. National headlines from major outlets, side by side.`;
    const voices = ts.querySelector('.voices');
    if (!voices) return;
    const cls = ['positive', 'neutral', 'critical', 'global'];
    const cards = items.slice(1, 11).map((it, i) => `
      <article class="voice ${cls[i % 4]}">
        <header>
          <span class="badge">${String(i + 1).padStart(2, '0')}</span>
          <span class="source">${sourceLink(it.source)}</span>
        </header>
        <h4>${linkA(it, 'nation')}</h4>
        <p>posted ${escapeHtml(timeAgo(it.date))}</p>
      </article>
    `).join('');
    voices.innerHTML = `<h3 class="voices-title">TEN HEADLINES, ONE MOMENT</h3>${cards}`;
  };

  const renderThreeCol = (selector, items, baseNum, cat) => {
    const cols = document.querySelector(selector);
    if (!cols || !items.length) return;
    const groups = [];
    for (let i = 0; i < 3; i++) {
      const g = items.slice(i * 5, i * 5 + 5);
      if (g.length) groups.push(g);
    }
    cols.innerHTML = groups.map((g, i) => {
      const main = g[0];
      const alts = g.slice(1, 5);
      const altsHtml = alts.length ? `
        <ul class="col-also">
          ${alts.map(a => `
            <li><span class="cv-src">${sourceLink(a.source)}</span>${linkA(a, cat)}</li>
          `).join('')}
        </ul>
      ` : '';
      return `
        <article class="col">
          <span class="num">${String(baseNum + i).padStart(2, '0')}</span>
          <span class="src">${sourceLink(main.source)}</span>
          <h3>${linkA(main, cat)}</h3>
          <p>posted ${escapeHtml(timeAgo(main.date))}</p>
          ${altsHtml}
        </article>
      `;
    }).join('');
  };

  const renderCulture = (items) => {
    if (!items.length) return;
    const ul = document.querySelector('.wf-list');
    if (ul) {
      ul.innerHTML = items.slice(0, 5).map((it) => `
        <li><span>${sourceLink(it.source)}</span>${linkA(it, 'ent')}</li>
      `).join('');
    }
    const h2 = document.querySelector('.wf-text h2');
    if (h2) h2.innerHTML = linkA(items[0], 'ent');
    const p = document.querySelector('.wf-text > p.reveal');
    if (p) p.textContent = `${items[0].source} · ${timeAgo(items[0].date)}. Five outlets' takes on today's culture & entertainment beat.`;
  };

  const renderWorld = (items) => {
    const list = document.querySelector('.world-list');
    if (!list || !items.length) return;
    const groups = [];
    for (let i = 0; i < 3; i++) {
      const g = items.slice(i * 5, i * 5 + 5);
      if (!g.length) break;
      groups.push(g);
    }
    list.innerHTML = groups.map((g, i) => {
      const main = g[0];
      const subs = g.slice(1, 5).map((s) => `
        <div><span class="src">${sourceLink(s.source)}</span><p>${linkA(s, 'world')}</p></div>
      `).join('');
      return `
        <article class="world-item">
          <span class="w-num">${String(9 + i).padStart(2, '0')}</span>
          <div class="w-body">
            <h3>${linkA(main, 'world')}</h3>
            <div class="w-sources">${subs}</div>
          </div>
        </article>
      `;
    }).join('');
  };

  const renderCompare = (feeds) => {
    const map = {
      t1: { label: 'POLITICS', items: feeds.nation,   cat: 'nation' },
      t2: { label: 'ECONOMY',  items: feeds.business, cat: 'business' },
      t3: { label: 'TECH',     items: feeds.tech,     cat: 'tech' },
      t4: { label: 'WORLD',    items: feeds.world,    cat: 'world' },
    };
    Object.entries(map).forEach(([key, { label, items, cat }]) => {
      const tab = document.querySelector(`.tab[data-tab="${key}"]`);
      if (tab) tab.textContent = label;
      const panel = document.querySelector(`.panel[data-panel="${key}"]`);
      if (!panel || !items || !items.length) return;
      panel.innerHTML = items.slice(0, 5).map((it) => `
        <div class="panel-col">
          <span class="src">${sourceLink(it.source)}</span>
          <h4>${linkA(it, cat)}</h4>
          <p>posted ${escapeHtml(timeAgo(it.date))}</p>
        </div>
      `).join('');
    });
  };

  const renderArchive = (feeds) => {
    const ul = document.querySelector('.timeline');
    if (!ul) return;
    const order = [
      { items: feeds.nation,   cat: 'POLITICS', tag: 'nation' },
      { items: feeds.business, cat: 'ECONOMY',  tag: 'business' },
      { items: feeds.tech,     cat: 'TECH',     tag: 'tech' },
      { items: feeds.ent,      cat: 'CULTURE',  tag: 'ent' },
      { items: feeds.world,    cat: 'WORLD',    tag: 'world' },
      { items: feeds.top,      cat: 'TODAY',    tag: 'nation' },
    ];
    const rows = order
      .map(o => o.items && o.items[0]
        ? { ...o.items[0], _cat: o.cat, _tag: o.tag, _feed: o.items }
        : null)
      .filter(Boolean);
    if (!rows.length) return;
    ul.innerHTML = rows.map((it) => {
      const d = it.date
        ? `${String(it.date.getMonth() + 1).padStart(2, '0')}.${String(it.date.getDate()).padStart(2, '0')}`
        : '—';
      const seen = new Set([it.source]);
      const alts = [];
      for (const f of (it._feed || [])) {
        if (alts.length >= 4) break;
        if (f.link === it.link) continue;
        if (seen.has(f.source)) continue;
        seen.add(f.source);
        alts.push(f);
      }
      const altsHtml = alts.length ? `
        <div class="t-alts">also covered by: ${alts.map(a => `<a href="${escapeHtml(a.link)}" target="_blank" rel="noopener noreferrer" data-cat="${escapeHtml(it._tag)}" data-source="${escapeHtml(a.source)}">${escapeHtml(a.source)}</a>`).join(' · ')}</div>
      ` : '';
      return `
        <li>
          <span class="t-date">${d}</span>
          <span class="t-cat">${escapeHtml(it._cat)}</span>
          <span class="t-text">${linkA(it, it._tag)}</span>
          <span class="t-src">${sourceLink(it.source)}</span>
          ${altsHtml}
        </li>
      `;
    }).join('');
  };

  /* ============================================================
     CLICK DELEGATION — record cat + source + title
     ============================================================ */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-cat]');
    if (!a) return;
    const cat = a.getAttribute('data-cat');
    const source = a.getAttribute('data-source') || '';
    const title = a.textContent.trim();
    recordClick({ cat, source, title });
  });

  /* ============================================================
     GOOGLE SIGN-IN (Google Identity Services)
     ============================================================ */
  let gisReady = false;

  const decodeJwtPayload = (jwt) => {
    try {
      const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      return JSON.parse(json);
    } catch { return null; }
  };

  const onCredential = (resp) => {
    if (!resp?.credential) return;
    const payload = decodeJwtPayload(resp.credential);
    if (!payload) return;
    saveUser({
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    });
    renderProfileUI();
    // If profile not set yet, prompt onboarding
    if (!loadProfile()?.savedAt) openOnboarding(true);
  };

  const initSignIn = () => {
    if (!GOOGLE_CLIENT_ID) return;
    const start = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(start, 300);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: onCredential,
        auto_select: false,
      });
      gisReady = true;
    };
    start();
  };

  const triggerSignIn = () => {
    if (!GOOGLE_CLIENT_ID) {
      alert('Google Sign-In is not configured.\nSet GOOGLE_CLIENT_ID in script.js (see README).');
      return;
    }
    if (!gisReady) {
      setTimeout(triggerSignIn, 300);
      return;
    }
    window.google.accounts.id.prompt((n) => {
      if (n.isNotDisplayed() || n.isSkippedMoment()) {
        // Render a fallback button container
        const wrap = document.getElementById('profileWrap');
        if (wrap && !wrap.querySelector('.gis-fallback')) {
          const host = document.createElement('div');
          host.className = 'gis-fallback';
          wrap.appendChild(host);
          window.google.accounts.id.renderButton(host, { type: 'standard', theme: 'outline', size: 'small' });
        }
      }
    });
  };

  const triggerSignOut = () => {
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
    clearUser();
    renderProfileUI();
  };

  /* ============================================================
     UI rendering: profile button + dropdown
     ============================================================ */
  const renderProfileUI = () => {
    const wrap = document.getElementById('profileWrap');
    if (!wrap) return;
    const user = loadUser();
    if (!user) {
      wrap.innerHTML = `<button class="profile-btn signin-btn" id="signInBtn" type="button">SIGN IN</button>`;
      document.getElementById('signInBtn')?.addEventListener('click', triggerSignIn);
    } else {
      const initials = (user.name || user.email || '?').slice(0, 1).toUpperCase();
      wrap.innerHTML = `
        <div class="profile-menu">
          <button class="profile-btn" id="profileBtn" type="button" aria-haspopup="true">
            ${user.picture
              ? `<img class="profile-avatar" src="${escapeHtml(user.picture)}" alt="" referrerpolicy="no-referrer">`
              : `<span class="profile-avatar fallback">${escapeHtml(initials)}</span>`}
            <span class="profile-name">${escapeHtml(user.name || user.email || '')}</span>
          </button>
          <div class="profile-drop" id="profileDrop" hidden>
            <button type="button" id="editProfileBtn">Edit profile</button>
            <button type="button" id="signOutBtn">Sign out</button>
          </div>
        </div>
      `;
      const pb = document.getElementById('profileBtn');
      const pd = document.getElementById('profileDrop');
      pb?.addEventListener('click', (e) => { e.stopPropagation(); pd.hidden = !pd.hidden; });
      document.addEventListener('click', () => { if (pd) pd.hidden = true; });
      document.getElementById('signOutBtn')?.addEventListener('click', triggerSignOut);
      document.getElementById('editProfileBtn')?.addEventListener('click', () => openOnboarding(true));
    }
    refreshProfileBadge();
  };

  const refreshProfileBadge = () => {
    const badge = document.getElementById('todayProfile');
    if (!badge) return;
    const profile = loadProfile();
    if (profile && (profile.interests?.length || profile.keywords?.length)) {
      badge.textContent = `profile: ${profile.interests?.length || 0} cats / ${profile.keywords?.length || 0} kw`;
    } else if (profile?.savedAt) {
      badge.textContent = 'profile: skipped';
    } else {
      badge.textContent = 'profile: —';
    }
  };

  /* ============================================================
     ONBOARDING MODAL
     ============================================================ */
  const openOnboarding = (force = false) => {
    const modal = document.getElementById('onbModal');
    if (!modal) return;
    const profile = loadProfile();
    if (!force && profile?.savedAt) return;
    const form = modal.querySelector('#onbForm');
    form.querySelectorAll('input[name="interests"]').forEach(cb => {
      cb.checked = (profile?.interests || []).includes(cb.value);
    });
    form.querySelector('input[name="keywords"]').value = (profile?.keywords || []).join(', ');
    const setRadio = (name, value) => {
      form.querySelectorAll(`input[name="${name}"]`).forEach(r => { r.checked = (r.value === (value || '')); });
    };
    setRadio('generation', profile?.generation);
    setRadio('profession', profile?.profession);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const closeOnboarding = () => {
    const modal = document.getElementById('onbModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  };
  const onOnboardingSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const interests = Array.from(form.querySelectorAll('input[name="interests"]:checked')).map(cb => cb.value);
    const keywords = form.querySelector('input[name="keywords"]').value
      .split(/[,、，、]/).map(k => k.trim()).filter(Boolean);
    const generation = form.querySelector('input[name="generation"]:checked')?.value || '';
    const profession = form.querySelector('input[name="profession"]:checked')?.value || '';
    saveProfile({ interests, keywords, generation, profession, savedAt: new Date().toISOString() });
    closeOnboarding();
    refreshProfileBadge();
    location.reload();
  };
  const onOnboardingSkip = () => {
    saveProfile({ interests: [], keywords: [], generation: '', profession: '', savedAt: new Date().toISOString(), skipped: true });
    closeOnboarding();
    refreshProfileBadge();
  };

  document.getElementById('onbForm')?.addEventListener('submit', onOnboardingSubmit);
  document.getElementById('onbSkip')?.addEventListener('click', onOnboardingSkip);
  document.getElementById('onbClose')?.addEventListener('click', closeOnboarding);

  /* ============================================================
     TODAY meta-bar: reset preferences / reset profile / edit profile
     ============================================================ */
  document.getElementById('resetPrefs')?.addEventListener('click', () => {
    if (!confirm('Reset click learning?')) return;
    clearPrefs();
    location.reload();
  });
  document.getElementById('resetProfile')?.addEventListener('click', () => {
    if (!confirm('Reset onboarding profile? You will be asked again.')) return;
    clearProfile();
    openOnboarding(true);
  });
  document.getElementById('editProfile')?.addEventListener('click', () => openOnboarding(true));

  /* ============================================================
     INIT + MASTER LOADER
     ============================================================ */
  initSignIn();
  renderProfileUI();
  refreshProfileBadge();
  if (!loadProfile()?.savedAt) {
    setTimeout(() => openOnboarding(false), 800);
  }

  (async () => {
    try {
      const [top, nation, world, business, tech, ent] = await Promise.all([
        fetchFeed(FEEDS.top).catch(() => []),
        fetchFeed(FEEDS.nation).catch(() => []),
        fetchFeed(FEEDS.world).catch(() => []),
        fetchFeed(FEEDS.business).catch(() => []),
        fetchFeed(FEEDS.tech).catch(() => []),
        fetchFeed(FEEDS.ent).catch(() => []),
      ]);
      const feeds = {
        top:      rankFeed(top, 'nation'),
        nation:   rankFeed(nation, 'nation'),
        world:    rankFeed(world, 'world'),
        business: rankFeed(business, 'business'),
        tech:     rankFeed(tech, 'tech'),
        ent:      rankFeed(ent, 'ent'),
      };
      renderToday(feeds);
      renderTopStory(feeds.nation);
      renderThreeCol('#economy .three-col', feeds.business, 2, 'business');
      renderThreeCol('#tech .three-col', feeds.tech, 6, 'tech');
      renderCulture(feeds.ent);
      renderWorld(feeds.world);
      renderCompare({ nation: feeds.nation, business: feeds.business, tech: feeds.tech, world: feeds.world });
      renderArchive(feeds);
    } catch (err) {
      const list = document.getElementById('todayNewsList');
      if (list) list.innerHTML =
        `<li class="today-loading">News failed to load.<small>${escapeHtml(err.message || err)}</small></li>`;
    }
  })();

  /* ============================================================
     EXISTING SCROLL / NAV / TAB BEHAVIORS
     ============================================================ */
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.dataset.delay
          ? Number(el.dataset.delay)
          : Math.min(i * 60, 240);
        setTimeout(() => el.classList.add('in'), delay);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  revealEls.forEach((el) => io.observe(el));

  const header = document.getElementById('siteHeader');
  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (window.scrollY > 8) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
        ticking = false;
      });
      ticking = true;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const menuBtn = document.getElementById('menuBtn');
  const mobileNav = document.getElementById('mobileNav');
  if (menuBtn && mobileNav) {
    const toggle = () => {
      menuBtn.classList.toggle('active');
      mobileNav.classList.toggle('active');
      document.body.style.overflow =
        mobileNav.classList.contains('active') ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', toggle);
    mobileNav.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', toggle)
    );
  }

  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => t.classList.toggle('active', t === tab));
      panels.forEach((p) =>
        p.classList.toggle('active', p.dataset.panel === target)
      );
    });
  });

  const heroLines = document.querySelectorAll('.hero-title .line');
  let parallaxTicking = false;
  window.addEventListener('scroll', () => {
    if (parallaxTicking) return;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      heroLines.forEach((l, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        l.style.transform = `translateX(${(y * 0.04 * dir).toFixed(2)}px)`;
      });
      parallaxTicking = false;
    });
    parallaxTicking = true;
  }, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  const compareSection = document.getElementById('compare');
  if (compareSection && tabs.length) {
    let rotateTimer = null;
    let idx = 0;
    const startRotate = () => {
      stopRotate();
      rotateTimer = setInterval(() => {
        idx = (idx + 1) % tabs.length;
        tabs[idx].click();
      }, 5000);
    };
    const stopRotate = () => {
      if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; }
    };
    const visIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) startRotate();
        else stopRotate();
      });
    }, { threshold: 0.3 });
    visIO.observe(compareSection);
    tabs.forEach((t) => t.addEventListener('click', () => {
      stopRotate();
      idx = Array.from(tabs).indexOf(t);
    }));
  }
})();
