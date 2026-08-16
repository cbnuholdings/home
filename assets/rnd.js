/* ============================================================
   CBNU Tech Holdings — R&D 기획지원 안내 페이지 레이어 (순수 JS, 의존성 0)
   - 대상 경로: /rnd (+ 노션 UUID 경로) — data-paths 로 지정
   - 하는 일 하나: 페이지 맨 아래에 「관리자」 진입 블록을 그린다.
       접속코드 확인 → 로컬 R&D 기획 컨설팅 플랫폼(http://localhost:8030) 새 탭
   - 🔴 이 게이트는 보안 장치가 아니다. 여는 대상이 방문자 자기 PC의 localhost 이므로
     코드가 뚫려도 새는 자료가 없다. 목적은 "일반 방문자 화면에 안 보이게" 하는 것뿐이다.
   - 접속코드 변경 = 아래 CODE_SHA256 한 줄만 교체한다(sha256 16진 소문자).
       PowerShell 예:  python -c "import hashlib;print(hashlib.sha256('새코드'.encode()).hexdigest())"
   ============================================================ */
(function () {
  'use strict';
  if (window.__CBNU_RND_LOADED__) return;
  window.__CBNU_RND_LOADED__ = true;

  var script = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
  var ALLOW = ((script && script.getAttribute('data-paths')) || '/rnd').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

  var CODE_SHA256 = '953949a0f48e9ad9e83a2cd7bbc84f26ff36f3617d420881de424cf0316d0055';
  var LOCAL_URL = 'http://localhost:8030';
  var START_BAT = 'D:\\00_기타\\36_RnD기획컨설팅\\start.bat';
  var SS_KEY = 'cbnu-rnd-admin';

  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function pathAllowed() {
    var p = location.pathname.replace(/\/+$/, '') || '/';
    return ALLOW.some(function (a) { a = a.replace(/\/+$/, '') || '/'; return a === p || (a !== '/' && p.indexOf(a) === 0); });
  }
  function hydrated(node) {
    if (!node) return false;
    var ks = Object.keys(node);
    for (var i = 0; i < ks.length; i++) if (ks[i].indexOf('__reactFiber') === 0 || ks[i].indexOf('__reactInternalInstance') === 0) return true;
    return false;
  }

  function sha256Hex(str) {
    if (!(window.crypto && window.crypto.subtle && window.TextEncoder)) return Promise.resolve(null);
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      var b = new Uint8Array(buf), out = '';
      for (var i = 0; i < b.length; i++) out += ('0' + b[i].toString(16)).slice(-2);
      return out;
    });
  }

  function openedHTML() {
    return '<div class="cbrnd-open">' +
      '<a class="cbrnd-go" href="' + LOCAL_URL + '" target="_blank" rel="noopener">R&amp;D 기획 컨설팅 플랫폼 열기 <span>' + LOCAL_URL + '</span></a>' +
      '<p class="cbrnd-note">이 주소는 <strong>담당자 PC에서만</strong> 열립니다. 연결되지 않으면 서버가 꺼져 있는 것입니다 — <code>' + esc(START_BAT) + '</code> 를 먼저 실행하십시오.</p>' +
      '</div>';
  }

  function blockHTML() {
    return '<section id="cbnu-rnd-admin" class="cbrnd">' +
      '<div class="cbrnd-line"></div>' +
      '<button type="button" class="cbrnd-toggle" aria-expanded="false">· 관리자</button>' +
      '<div class="cbrnd-panel" hidden>' +
        '<p class="cbrnd-lead">운영 담당자 전용 — 로컬 R&amp;D 기획 컨설팅 플랫폼으로 이동합니다.</p>' +
        '<form class="cbrnd-form" autocomplete="off">' +
          '<input class="cbrnd-code" type="password" inputmode="text" placeholder="접속코드" aria-label="관리자 접속코드" autocomplete="off">' +
          '<button class="cbrnd-submit" type="submit">확인</button>' +
        '</form>' +
        '<p class="cbrnd-msg" role="status" aria-live="polite"></p>' +
      '</div>' +
    '</section>';
  }

  function bind(sec) {
    var toggle = sec.querySelector('.cbrnd-toggle');
    var panel = sec.querySelector('.cbrnd-panel');
    var form = sec.querySelector('.cbrnd-form');
    var input = sec.querySelector('.cbrnd-code');
    var msg = sec.querySelector('.cbrnd-msg');

    function reveal() {
      form.setAttribute('hidden', '');
      msg.innerHTML = '';
      var box = el(openedHTML());
      panel.appendChild(box);
    }

    toggle.addEventListener('click', function () {
      var open = panel.hasAttribute('hidden');
      if (open) { panel.removeAttribute('hidden'); toggle.setAttribute('aria-expanded', 'true'); if (input && !input.hasAttribute('hidden')) input.focus(); }
      else { panel.setAttribute('hidden', ''); toggle.setAttribute('aria-expanded', 'false'); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (input.value || '').trim();
      if (!v) { msg.textContent = '접속코드를 입력하십시오.'; return; }
      msg.textContent = '확인 중…';
      sha256Hex(v).then(function (h) {
        if (h === null) { msg.textContent = '이 브라우저에서는 확인할 수 없습니다. 주소창에 localhost:8030 을 직접 입력하십시오.'; return; }
        if (h === CODE_SHA256) {
          try { sessionStorage.setItem(SS_KEY, '1'); } catch (err) {}
          reveal();
        } else {
          msg.textContent = '접속코드가 맞지 않습니다.';
          input.value = '';
          input.focus();
        }
      });
    });

    // 같은 세션에서 이미 확인했으면 코드 입력을 다시 받지 않는다
    var remembered = false;
    try { remembered = sessionStorage.getItem(SS_KEY) === '1'; } catch (err) {}
    if (remembered) { panel.removeAttribute('hidden'); toggle.setAttribute('aria-expanded', 'true'); reveal(); }
  }

  var FORCE_AFTER = 40; // 300ms × 40 ≈ 12초 넘게 하이드레이션 신호가 없으면 그냥 넣는다
  function inject(force) {
    if (document.getElementById('cbnu-rnd-admin')) return true;
    var content = document.querySelector('.notion-page-content');
    if (!content) return false;
    if (!force && !hydrated(content)) return false;
    var sec = el(blockHTML());
    if (content.parentNode) content.parentNode.insertBefore(sec, content.nextSibling);
    else content.appendChild(sec);
    bind(sec);
    return true;
  }
  function remove() {
    var n = document.getElementById('cbnu-rnd-admin');
    if (n && n.parentNode) n.parentNode.removeChild(n);
  }

  function run() {
    var tries = 0;
    var tick = function () {
      if (!pathAllowed()) { remove(); return; }
      tries++;
      inject(tries > FORCE_AFTER);
    };
    tick();
    setInterval(tick, 300);
    try {
      if (window.next && window.next.router && window.next.router.events) {
        window.next.router.events.on('routeChangeComplete', function () { setTimeout(tick, 80); });
      }
    } catch (e) {}
    ['pushState', 'replaceState'].forEach(function (m) {
      var orig = history[m]; if (!orig) return;
      history[m] = function () { var r = orig.apply(this, arguments); setTimeout(tick, 50); return r; };
    });
    window.addEventListener('popstate', function () { setTimeout(tick, 50); });
    if (typeof MutationObserver === 'function') {
      var mo = new MutationObserver(function () { if (pathAllowed() && !document.getElementById('cbnu-rnd-admin')) inject(tries > FORCE_AFTER); });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
