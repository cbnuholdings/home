/* ============================================================
   CBNU Tech Holdings — 인터랙티브 홈 레이어 (순수 JS, 의존성 0)
   - 단독 모드: index.html의 #cbnu-home-root 안에 렌더
   - oopy 모드: www.cbnuholdings.com 노션 페이지 DOM에 삽입
       · 노션 코드블록 로더가 이 파일을 로드한다 (oopy/loader.html 참조)
       · data-paths="/,/3bdf…" 로 삽입을 허용할 경로를 지정(기본 "/")
       · SPA 이동으로 다른 페이지가 되면 삽입물을 제거한다
   - 자회사 데이터: data/subsidiaries.json (GitHub Actions가 노션 공개 DB에서 동기화)
   ============================================================ */
(function () {
  'use strict';
  if (window.__CBNU_HOME_LOADED__) return;
  window.__CBNU_HOME_LOADED__ = true;

  var script = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
  var BASE = (script && script.src) ? script.src.replace(/\/assets\/home\.js.*$/, '') : '.';
  var ALLOW = ((script && script.getAttribute('data-paths')) || '/').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var STANDALONE = !!document.getElementById('cbnu-home-root');

  var HUBS = [
    { id: 'hub-portfolio', num: '01', label: 'Portfolio', ko: '자회사',
      desc: '대학 기술로 설립된 자회사를 확인하고, 편입·설립을 직접 신청할 수 있습니다.',
      items: [
        { name: '자회사 제도 소개', note: '편입 요건과 지분 구조 안내', href: 'https://www.cbnuholdings.com/subsidiary' },
        { name: '자회사 현황', note: '포트폴리오 기업 전체 보기', href: 'https://www.cbnuholdings.com/portfolio' },
        { name: '자회사 편입·설립 신청', note: '온라인 접수', href: 'https://subsidiary.cbnuholdings.com/' }
      ] },
    { id: 'hub-growth', num: '02', label: 'Growth Hub', ko: '성장지원',
      desc: '설립 이후가 진짜 시작입니다. 성장 관리와 경영 진단을 상시 운영합니다.',
      items: [
        { name: '성장관리 플랫폼', note: '지표·마일스톤 상시 관리', href: 'https://growth-platform.cbnuholdings.com' },
        { name: '창업기업 경영진단', note: '재무·경영 진단 리포트', href: 'https://fia.cbnuholdings.com' }
      ] },
    { id: 'hub-project', num: '03', label: 'Project', ko: '지원사업',
      desc: '모집 중인 지원사업과 제작 지원 프로그램을 한 곳에서 확인하세요.',
      items: [
        { name: '지원사업 공지사항', note: '모집 공고 · 접수 일정', href: 'https://www.cbnuholdings.com/fa30f3e8-43c9-4100-ba35-e6ece607e753' },
        { name: 'MVP 제작 지원', note: '시제품 제작 신청', href: 'https://mvp.cbnuholdings.com/' }
      ] }
  ];
  var CATS = [
    { key: 'all', label: '전체' }, { key: 'ict', label: 'ICT·AI' }, { key: 'bio', label: '바이오·의료' },
    { key: 'mat', label: '소재·부품·제조' }, { key: 'env', label: '에너지·환경' }, { key: 'etc', label: '기타' }
  ];
  var LINKS = {
    booking: 'https://www.cbnuholdings.com/meeting-booking',
    subsidiaryApply: 'https://subsidiary.cbnuholdings.com/',
    subsidiaryIntro: 'https://www.cbnuholdings.com/subsidiary',
    portfolio: 'https://www.cbnuholdings.com/portfolio',
    notices: 'https://www.cbnuholdings.com/fa30f3e8-43c9-4100-ba35-e6ece607e753',
    admin: 'https://www.cbnuholdings.com/admin',
    privacy: 'https://www.cbnuholdings.com/380fc8d8-805b-8012-bfc4-ce8a82439721',
    noEmail: 'https://www.cbnuholdings.com/380fc8d8-805b-809b-9bec-c89c3cffaefa'
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function safeUrl(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : ''; }

  /* ---------- 템플릿 ---------- */
  function headerHTML() {
    return '<header class="cb-header"><div class="cb-wrap">' +
      '<a href="#top" aria-label="충북대학교기술지주 홈"><img src="' + BASE + '/assets/cbnu-ci-h.png" alt="충북대학교기술지주(주)"></a>' +
      '<button class="cb-burger" aria-label="메뉴 열기" aria-expanded="false">☰</button>' +
      '<nav class="cb-nav" aria-label="주 메뉴">' +
        '<a href="#about">회사소개</a>' +
        HUBS.map(function (h) {
          return '<div class="cb-menu"><a href="#' + h.id + '">' + esc(h.label) + ' <span class="cb-caret">▾</span></a>' +
            '<div class="cb-menu-panel"><div>' + h.items.map(function (it) {
              return '<a href="' + esc(it.href) + '" target="_blank" rel="noopener">' + esc(it.name) + '<span>↗</span></a>';
            }).join('') + '</div></div></div>';
        }).join('') +
        '<a href="#news">공지사항</a>' +
        '<a class="cb-btn cb-btn-primary cb-btn-sm" href="#contact">기술이전 문의 →</a>' +
      '</nav></div></header>';
  }
  function heroHTML() {
    return '<section class="cb-hero" id="top" aria-label="소개">' +
      '<div class="cb-hero-glow1"></div><div class="cb-hero-glow2"></div><div class="cb-hero-grid"></div>' +
      '<div class="cb-wrap cb-hero-inner">' +
        '<div>' +
          '<div class="cb-badge"><span class="cb-dot"></span>충북대학교 기술사업화 전문회사</div>' +
          '<h1><span class="cb-line"><span>공공기술이전 사업화</span></span>' +
              '<span class="cb-line"><span>지역 <span class="cb-mark">기술혁신</span> 파트너</span></span></h1>' +
          '<p>연구실에 머물던 특허를 자회사·기술이전·투자로 연결합니다.<br>교내 연구자부터 지역 기업까지, 기술사업화의 모든 단계를 함께합니다.</p>' +
          '<div class="cb-hero-cta">' +
            '<a class="cb-btn cb-btn-primary" href="#contact">기술이전 문의하기 <span>→</span></a>' +
            '<a class="cb-btn cb-btn-ghost" href="' + LINKS.subsidiaryApply + '" target="_blank" rel="noopener">자회사 신청 <span style="color:var(--cb-primary)">↗</span></a>' +
            '<a class="cb-btn cb-btn-text" href="' + LINKS.subsidiaryIntro + '" target="_blank" rel="noopener">자회사 제도 소개 →</a>' +
          '</div>' +
        '</div>' +
        '<div class="cb-hero-art" aria-hidden="true">' +
          '<div class="cb-ring r1"></div><div class="cb-ring r2"></div><div class="cb-ring r3"></div>' +
          '<div class="cb-disc"><img src="' + BASE + '/assets/cbnu-shield.png" alt=""></div>' +
        '</div>' +
      '</div>' +
      '<a class="cb-scroll" href="#hub-portfolio">SCROLL<span>↓</span></a>' +
    '</section>';
  }
  function marqueeHTML() {
    var items = '<span>TECHNOLOGY TRANSFER</span><span>·</span><span>학교기업 · 자회사 설립</span><span>·</span><span>SEED INVESTMENT</span><span>·</span><span>연구자 창업 지원</span><span>·</span><span>지역 산학 협력</span><span>·</span>';
    return '<div class="cb-marquee" aria-hidden="true"><div class="cb-marquee-track"><div>' + items + '</div><div>' + items + '</div></div></div>';
  }
  function servicesHTML() {
    return '<section class="cb-services" id="services" aria-labelledby="cb-services-h"><div class="cb-wrap">' +
      '<div class="cb-head" data-reveal><div><div class="cb-eyebrow">SERVICES</div><h2 class="cb-h2" id="cb-services-h">성장지원 서비스</h2></div>' +
      '<p class="cb-lead">Portfolio · Growth Hub · Project — 운영 중인 플랫폼으로 바로 연결됩니다.</p></div>' +
      '<div class="cb-hubs" data-reveal>' + HUBS.map(function (h) {
        return '<div class="cb-hub" id="' + h.id + '">' +
          '<div class="cb-hub-top"><span class="cb-hub-num">' + h.num + '</span><div><div class="cb-hub-label">' + esc(h.label) + '</div><div class="cb-hub-ko">' + esc(h.ko) + '</div></div></div>' +
          '<p>' + esc(h.desc) + '</p>' +
          '<div class="cb-hub-links">' + h.items.map(function (it) {
            return '<a href="' + esc(it.href) + '" target="_blank" rel="noopener"><span><b>' + esc(it.name) + '</b><small>' + esc(it.note) + '</small></span><i>↗</i></a>';
          }).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="cb-guide" data-reveal><div><h3>어디로 가야 할지 모르겠다면</h3><p>미팅·상담 예약 한 번이면 담당자가 알맞은 프로그램으로 안내합니다.</p>' +
        '<a class="cb-btn cb-btn-primary" href="' + LINKS.booking + '" target="_blank" rel="noopener">미팅·상담 예약 →</a></div>' +
        '<img src="' + BASE + '/assets/character.png" alt="" loading="lazy"></div>' +
    '</div></section>';
  }
  function portfolioHTML() {
    return '<section class="cb-portfolio" id="portfolio" aria-labelledby="cb-portfolio-h"><div class="cb-wrap">' +
      '<div class="cb-head" data-reveal><div><div class="cb-eyebrow">PORTFOLIO</div><h2 class="cb-h2" id="cb-portfolio-h">자회사 포트폴리오</h2>' +
        '<a class="cb-more" href="' + LINKS.portfolio + '" target="_blank" rel="noopener">자회사 현황 전체 보기 ↗</a></div>' +
        '<div class="cb-filters" role="group" aria-label="분야 필터">' + CATS.map(function (c) {
          return '<button type="button" data-cat="' + c.key + '" aria-pressed="' + (c.key === 'all') + '">' + esc(c.label) + '</button>';
        }).join('') + '</div></div>' +
      '<div class="cb-grid" data-reveal aria-live="polite"><div class="cb-grid-empty">자회사 정보를 불러오는 중…</div></div>' +
      '<div class="cb-more-wrap"></div>' +
      '<div class="cb-count" data-reveal></div>' +
    '</div></section>';
  }
  function tailHTML(withFooter) {
    return '<div id="cbnu-home-tail">' +
      '<section class="cb-contact" id="contact" aria-labelledby="cb-contact-h"><div class="cb-contact-glow"></div><div class="cb-wrap" data-reveal>' +
        '<h2 id="cb-contact-h">공공기술이전 사업화 문의</h2>' +
        '<p class="cb-sub">대학·공공연구기관 기술의 이전과 사업화를 상담합니다. 아래 두 서비스는 오픈 준비 중입니다.</p>' +
        '<div class="cb-contact-btns"><span class="cb-soon a">기술이전 문의하기<em>준비 중</em></span><span class="cb-soon b">연구자 기술사업화<em>준비 중</em></span></div>' +
        '<p class="cb-note">오픈 전까지는 <a href="' + LINKS.booking + '" target="_blank" rel="noopener">미팅·상담 예약</a>으로 문의해 주세요.</p>' +
      '</div></section>' +
      (withFooter ? '<footer class="cb-footer"><div class="cb-wrap">' +
        '<div>충북대학교기술지주(주) · 대표자 김대일 · 사업자등록번호 579-87-00278<br>본사 충북 청주시 청원구 오창읍 양청4길 45 · TEL 043-249-1472(1489)</div>' +
        '<div class="cb-foot-links"><a href="' + LINKS.privacy + '" target="_blank" rel="noopener">개인정보처리방침</a><a href="' + LINKS.noEmail + '" target="_blank" rel="noopener">이메일무단수집거부</a><a href="' + LINKS.admin + '" target="_blank" rel="noopener">구성원 로그인</a><span>© 2026 CBNU Technology Holdings, Inc.</span></div>' +
      '</div></footer>' : '') +
    '</div>';
  }

  /* ---------- 자회사 데이터 ---------- */
  var DATA = null, FILTER = 'all', LIMIT = 8, EXPANDED = false;
  function cardHTML(c) {
    var site = safeUrl(c.site);
    var href = site || LINKS.portfolio;
    var label = site ? site.replace(/^https?:\/\//, '').replace(/\/$/, '') : '자회사 현황에서 보기';
    var logo = safeUrl(c.logo);
    var desc = c.desc && c.desc.trim() ? esc(c.desc) : '<span class="cb-empty">대학 기술 기반 자회사</span>';
    return '<a class="cb-card" href="' + esc(href) + '" target="_blank" rel="noopener">' +
      '<div class="cb-card-logo">' + (logo ? '<img src="' + esc(logo) + '" alt="' + esc(c.name) + ' 로고" loading="lazy" onerror="this.parentNode.innerHTML=\'<span class=&quot;cb-card-initial&quot;>' + esc(String(c.name).slice(0, 1)) + '</span>\'">' : '<span class="cb-card-initial">' + esc(String(c.name).slice(0, 1)) + '</span>') + '</div>' +
      '<h3>' + esc(c.name) + '</h3>' + (c.ceo ? '<div class="cb-ceo">대표 ' + esc(c.ceo) + '</div>' : '') +
      '<p' + (c.desc && c.desc.trim() ? '' : ' class="cb-empty"') + '>' + desc + '</p>' +
      (c.tags && c.tags.length ? '<div class="cb-tags">' + c.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="cb-card-foot"><span>' + esc(label) + '</span><i>↗</i></div>' +
    '</a>';
  }
  function renderGrid(root) {
    var grid = root.querySelector('.cb-grid'), count = root.querySelector('.cb-count');
    if (!grid) return;
    if (!DATA) { grid.innerHTML = '<div class="cb-grid-empty">자회사 정보를 불러오지 못했습니다. <a href="' + LINKS.portfolio + '" target="_blank" rel="noopener">자회사 현황 페이지</a>에서 확인해 주세요.</div>'; if (count) count.textContent = ''; return; }
    var items = FILTER === 'all' ? DATA.items : DATA.items.filter(function (c) { return c.cat === FILTER; });
    var shown = EXPANDED ? items : items.slice(0, LIMIT);
    grid.innerHTML = shown.length ? shown.map(cardHTML).join('') : '<div class="cb-grid-empty">해당 분야의 자회사가 아직 없습니다.</div>';
    Array.prototype.forEach.call(grid.children, function (c, i) { c.style.animationDelay = Math.min(i * 40, 400) + 'ms'; });
    var more = root.querySelector('.cb-more-wrap');
    if (more) {
      if (items.length > shown.length) {
        more.innerHTML = '<button type="button" class="cb-btn cb-btn-ghost cb-more-btn">자회사 ' + (items.length - shown.length) + '개 더 보기 <span>↓</span></button>';
        more.querySelector('button').addEventListener('click', function () { EXPANDED = true; renderGrid(root); });
      } else if (EXPANDED && items.length > LIMIT) {
        more.innerHTML = '<button type="button" class="cb-btn cb-btn-ghost cb-more-btn">접기 <span>↑</span></button>';
        more.querySelector('button').addEventListener('click', function () { EXPANDED = false; renderGrid(root); var sec = root.querySelector('#portfolio'); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      } else more.innerHTML = '';
    }
    if (count) count.innerHTML = '총 ' + DATA.items.length + '개 자회사' + (FILTER !== 'all' ? ' 중 ' + items.length + '개 표시' : '') + ' · 출처 <a href="' + LINKS.portfolio + '" target="_blank" rel="noopener">자회사 공개 DB</a>' + (DATA.synced_at ? ' <span style="color:var(--cb-faint);font-weight:500">(동기화 ' + esc(String(DATA.synced_at).slice(0, 10)) + ')</span>' : '');
  }
  function loadData(root) {
    var url = BASE + '/data/subsidiaries.json';
    var done = function (json) { DATA = json && json.items ? json : null; renderGrid(root); };
    if (window.fetch) {
      fetch(url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(done).catch(function () { done(null); });
    } else {
      var x = new XMLHttpRequest(); x.open('GET', url); x.onload = function () { try { done(JSON.parse(x.responseText)); } catch (e) { done(null); } }; x.onerror = function () { done(null); }; x.send();
    }
  }
  function bindFilters(root) {
    var box = root.querySelector('.cb-filters'); if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-cat]'); if (!b) return;
      FILTER = b.getAttribute('data-cat'); EXPANDED = false;
      Array.prototype.forEach.call(box.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      renderGrid(root);
    });
  }

  /* ---------- 리빌 ---------- */
  function bindReveal(scope) {
    var els = Array.prototype.slice.call(scope.querySelectorAll('[data-reveal]'));
    if (!els.length) return;
    var show = function (x) { x.classList.add('is-in'); };
    var sweep = function () { var h = window.innerHeight || 800; els.forEach(function (x) { if (x.classList.contains('is-in')) return; var r = x.getBoundingClientRect(); if (r.top < h * 0.94 && r.bottom > 0) show(x); }); };
    sweep();
    var t = false; var onScroll = function () { if (t) return; t = true; requestAnimationFrame(function () { t = false; sweep(); }); };
    window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll, { passive: true });
    // oopy는 .notion-scroller 안에서 스크롤될 수 있다
    var sc = document.querySelector('.notion-scroller'); if (sc) sc.addEventListener('scroll', onScroll, { passive: true });
    if (typeof IntersectionObserver === 'function') {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }); }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
      els.forEach(function (x) { io.observe(x); });
    }
    setTimeout(function () { els.forEach(show); }, 2500);
  }

  /* ---------- 단독 모드 ---------- */
  function mountStandalone() {
    var root = document.getElementById('cbnu-home-root');
    root.innerHTML = '';
    var home = el('<div id="cbnu-home"></div>');
    home.appendChild(el(headerHTML()));
    home.appendChild(el(heroHTML()));
    home.appendChild(el(marqueeHTML()));
    home.appendChild(el(servicesHTML()));
    home.appendChild(el(portfolioHTML()));
    root.appendChild(home);
    root.appendChild(el(tailHTML(true)));
    var hd = home.querySelector('.cb-header'), bg = home.querySelector('.cb-burger');
    if (bg) bg.addEventListener('click', function () { var o = hd.classList.toggle('is-open'); bg.setAttribute('aria-expanded', String(o)); });
    bindFilters(home); loadData(home); bindReveal(root);
  }

  /* ---------- oopy 모드 ---------- */
  function pathAllowed() {
    var p = location.pathname.replace(/\/+$/, '') || '/';
    return ALLOW.some(function (a) { a = a.replace(/\/+$/, '') || '/'; return a === p || (a !== '/' && p.indexOf(a) === 0); });
  }
  function removeInjected() {
    ['cbnu-home', 'cbnu-home-tail'].forEach(function (id) { var n = document.getElementById(id); if (n && n.parentNode) n.parentNode.removeChild(n); });
    document.documentElement.classList.remove('cbnu-oopy');
  }
  // React 하이드레이션이 끝났는지: DOM 노드에 __reactFiber$… 키가 붙으면 끝난 것(먼저 넣으면 #418 불일치)
  function hydrated(node) {
    if (!node) return false;
    var ks = Object.keys(node);
    for (var i = 0; i < ks.length; i++) if (ks[i].indexOf('__reactFiber') === 0 || ks[i].indexOf('__reactInternalInstance') === 0) return true;
    return false;
  }
  var FORCE_AFTER = 40; // 300ms × 40 = 12초 넘게 하이드레이션 신호가 없으면 그냥 넣는다
  function injectOopy(force) {
    if (document.getElementById('cbnu-home')) return true;
    var scroller = document.querySelector('.notion-scroller');
    var content = document.querySelector('.notion-page-content');
    if (!scroller || !content) return false;
    if (!force && !hydrated(content) && !hydrated(scroller)) return false;
    var col = scroller.firstElementChild || scroller;
    document.documentElement.classList.add('cbnu-oopy');
    var home = el('<div id="cbnu-home"></div>');
    home.appendChild(el(heroHTML()));
    home.appendChild(el(marqueeHTML()));
    home.appendChild(el(servicesHTML()));
    home.appendChild(el(portfolioHTML()));
    col.insertBefore(home, col.firstChild);
    var tail = el(tailHTML(false));
    if (content.parentNode) content.parentNode.insertBefore(tail, content.nextSibling);
    bindFilters(home); loadData(home); bindReveal(document.body);
    return true;
  }
  function runOopy() {
    var tries = 0;
    var tick = function () {
      if (!pathAllowed()) { removeInjected(); return; }
      tries++;
      injectOopy(tries > FORCE_AFTER);
    };
    tick();
    setInterval(tick, 300);
    // Next.js 라우터 이벤트(있으면) — SPA 페이지 전환 후 재판정
    try {
      if (window.next && window.next.router && window.next.router.events) {
        window.next.router.events.on('routeChangeComplete', function () { setTimeout(tick, 80); });
      }
    } catch (e) {}
    // SPA 라우팅 감지: history 패치 + popstate
    ['pushState', 'replaceState'].forEach(function (m) {
      var orig = history[m]; if (!orig) return;
      history[m] = function () { var r = orig.apply(this, arguments); setTimeout(tick, 50); return r; };
    });
    window.addEventListener('popstate', function () { setTimeout(tick, 50); });
    // oopy가 페이지를 다시 그리면(삽입물이 사라지면) 다시 넣는다
    if (typeof MutationObserver === 'function') {
      var mo = new MutationObserver(function () { if (pathAllowed() && !document.getElementById('cbnu-home')) injectOopy(tries > FORCE_AFTER); });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (STANDALONE) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountStandalone); else mountStandalone();
  } else {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runOopy); else runOopy();
  }
})();
