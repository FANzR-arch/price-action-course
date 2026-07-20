/* ============================================================
   价格行为课 · 深色模式
   - 尽早应用主题，避免首屏闪烁（本文件在 <head> 中同步加载）
   - 记住用户选择（localStorage）；未选择时跟随系统
   - 自动把切换按钮注入到顶栏（.topbar .row）
   ============================================================ */
(function(){
  "use strict";
  var KEY = "pa-theme";
  var root = document.documentElement;

  function stored(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } }
  function save(v){ try{ localStorage.setItem(KEY, v); }catch(e){} }
  function systemDark(){ return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme:dark)").matches); }
  function current(){ return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }

  function apply(t){
    root.setAttribute("data-theme", t);
    var m = document.querySelector('meta[name="theme-color"]');
    if(m) m.setAttribute("content", t === "dark" ? "#0E131B" : "#B0761A");
  }

  // —— 初始化：立即应用（此时仍在解析 <head>，body 尚未绘制）——
  apply(stored() || (systemDark() ? "dark" : "light"));

  function syncButtons(){
    var dark = current() === "dark";
    var bs = document.querySelectorAll("[data-theme-toggle]");
    for(var i=0;i<bs.length;i++){
      bs[i].setAttribute("aria-label", dark ? "切换到浅色模式" : "切换到深色模式");
      bs[i].setAttribute("title", dark ? "浅色模式" : "深色模式");
      bs[i].setAttribute("aria-pressed", dark ? "true" : "false");
    }
  }

  function toggle(){
    var next = current() === "dark" ? "light" : "dark";
    apply(next); save(next); syncButtons();
  }

  // 事件委托：无论按钮何时注入（含 shell.js 动态生成的顶栏）都能生效
  document.addEventListener("click", function(e){
    var t = e.target;
    if(!t || !t.closest) return;
    if(t.closest("[data-theme-toggle]")) toggle();
  });

  // 用户未手动选择时，跟随系统主题变化
  if(window.matchMedia){
    var mq = window.matchMedia("(prefers-color-scheme:dark)");
    var onSys = function(){ if(!stored()){ apply(systemDark() ? "dark" : "light"); syncButtons(); } };
    if(mq.addEventListener) mq.addEventListener("change", onSys);
    else if(mq.addListener) mq.addListener(onSys);
  }

  var BTN_HTML =
    '<button class="theme-btn" type="button" data-theme-toggle aria-label="切换深色模式">' +
      '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
      '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>' +
    '</button>';

  function mount(){
    var row = document.querySelector(".topbar .row");
    if(row && !row.querySelector("[data-theme-toggle]")){
      var span = document.createElement("span");
      span.innerHTML = BTN_HTML;
      row.appendChild(span.firstChild);
    }
    syncButtons();
  }

  window.PA = window.PA || {};
  PA.themeToggleHTML = BTN_HTML;
  PA.mountThemeToggle = mount;
  PA.syncThemeButtons = syncButtons;

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
