/* ============================================================
   价格行为课 · 课程外壳  PA.initLesson(cfg)
   自动注入：顶栏 + 章节导航 + 进度条 + 颜色开关 + 滚动高亮 + 出现动画
   每课只需在末尾调用一次，无需重复这些样板。
   ============================================================ */
(function(){
  "use strict";
  var PA = window.PA = window.PA || {};

  function cn(n){ var m=["零","一","二","三","四","五","六","七","八","九","十"]; return (n>=0&&n<=10)?m[n]:String(n); }

  PA.initLesson = function(cfg){
    cfg = cfg || {};
    var sections = cfg.sections || [];

    // ---- 顶栏 ----
    var steps = sections.map(function(s,i){
      return '<a href="#'+s.id+'"'+(i===0?' class="on"':'')+'>'+s.label+'</a>';
    }).join("");
    var bar = document.createElement("div");
    bar.className = "topbar";
    bar.innerHTML =
      '<div class="row">' +
        '<a class="brand" href="../index.html">← 价格行为 · <b>第'+cn(cfg.n)+'课</b></a>' +
        '<nav class="steps" id="pa-steps">'+steps+'</nav>' +
        '<div class="conv" title="切换涨跌用什么颜色显示"><span>涨用</span>' +
          '<div class="toggle" id="convToggle">' +
            '<button data-c="green" class="act up-green">绿</button>' +
            '<button data-c="red">红</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="progline" id="progline"></div>';
    document.body.insertBefore(bar, document.body.firstChild);

    // ---- 颜色开关 → 全站重绘 ----
    if(PA.wireToggle) PA.wireToggle("#convToggle", PA.redrawAll);

    // ---- 进度条 + 章节高亮 ----
    var links = Array.prototype.slice.call(bar.querySelectorAll("#pa-steps a"));
    var secs = links.map(function(a){ return document.querySelector(a.getAttribute("href")); });
    var progline = document.getElementById("progline");
    function onScroll(){
      var st = window.scrollY, dh = document.documentElement.scrollHeight - window.innerHeight;
      if(progline) progline.style.width = (dh>0 ? (st/dh*100) : 0) + "%";
      var idx = 0;
      for(var i=0;i<secs.length;i++){ if(secs[i] && secs[i].getBoundingClientRect().top<=140) idx=i; }
      links.forEach(function(a,i){ a.classList.toggle("on", i===idx); });
    }
    window.addEventListener("scroll", onScroll, {passive:true});

    // ---- 出现动画 ----
    if("IntersectionObserver" in window){
      var io = new IntersectionObserver(function(es){
        es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
      }, {threshold:.12});
      Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function(el){ io.observe(el); });
    } else {
      Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function(el){ el.classList.add("in"); });
    }

    onScroll();
  };
})();
