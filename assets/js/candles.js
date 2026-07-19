/* ============================================================
   价格行为课 · 共享 K 线引擎  (window.PA)
   - drawCandle : 轻量 SVG 单根 K 线（教学互动：捏一根 / 高亮部位）
   - genSeries  : 生成一段“像真的”随机行情
   - mountChart : 用 KLineChart 渲染真实交易软件风格图表
   - mountPlayground : 图表 + 可拖动参数，实时随机重生成
   - wireToggle : 联动“涨用 绿/红”颜色约定开关
   改这里 = 全站生效
   ============================================================ */
(function(){
  "use strict";
  var PA = window.PA = {};

  // 颜色约定："green" = 涨用绿（欧美/币圈默认）；"red" = 涨用红（A股/国内期货）
  PA.convention = "green";

  function cssv(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  PA.cssv = cssv;
  PA.upColor   = function(){ return PA.convention==="green" ? cssv("--hue-green") : cssv("--hue-red"); };
  PA.downColor = function(){ return PA.convention==="green" ? cssv("--hue-red")   : cssv("--hue-green"); };

  // 重绘登记：任何画蜡烛的组件/图表登记自己的重绘函数，颜色约定切换时全站自动重绘
  PA._redraws = [];
  PA.registerRedraw = function(fn){ if(typeof fn==="function") PA._redraws.push(fn); };
  PA.redrawAll = function(){ PA._redraws.forEach(function(fn){ try{ fn(); }catch(e){} }); };

  // ---------- 轻量 SVG 单根 K 线（教学互动用） ----------
  function f(n){ return Math.round(n*10)/10; }
  function rect(x,y,w,h,fill,op){ return '<rect x="'+f(x)+'" y="'+f(y)+'" width="'+f(w)+'" height="'+f(h)+'" fill="'+fill+'" opacity="'+op+'"/>'; }
  function rectR(x,y,w,h,fill,op){ return '<rect x="'+f(x)+'" y="'+f(y)+'" width="'+f(w)+'" height="'+f(h)+'" rx="2.5" fill="'+fill+'" opacity="'+op+'"/>'; }
  function strokeRect(x,y,w,h,col){ return '<rect x="'+f(x)+'" y="'+f(y)+'" width="'+f(w)+'" height="'+f(h)+'" rx="4" fill="none" stroke="'+col+'" stroke-width="2" stroke-dasharray="4 3"/>'; }
  function line(x1,y1,x2,y2,col,w,op){ return '<line x1="'+f(x1)+'" y1="'+f(y1)+'" x2="'+f(x2)+'" y2="'+f(y2)+'" stroke="'+col+'" stroke-width="'+w+'" opacity="'+(op==null?1:op)+'" stroke-linecap="round"/>'; }
  function labelBubble(x,y,txt){
    var w = txt.length*13+14;
    return '<g><rect x="'+f(x)+'" y="'+f(y-13)+'" width="'+w+'" height="26" rx="7" fill="'+cssv("--accent")+'"/><text x="'+f(x+w/2)+'" y="'+f(y+4)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">'+txt+'</text></g>';
  }

  // 画一根 K 线到 <svg>。OHLC 为“价格单位”，数值越大越靠上。
  PA.drawCandle = function(svg, o,h,l,c, opts){
    opts = opts||{};
    var vb = svg.viewBox.baseVal, W = vb.width, H = vb.height;
    var padY = opts.padY!=null?opts.padY:24;
    var cx = W/2;
    var bw = opts.bw!=null?opts.bw: Math.min(64, W*0.42);
    var lo = opts.lo!=null?opts.lo:15, hi = opts.hi!=null?opts.hi:85;
    function y(p){ return padY + (hi - p)/(hi-lo) * (H - padY*2); }
    var up = c>=o, col = up ? PA.upColor() : PA.downColor();
    var bodyTop = y(Math.max(o,c)), bodyBot = y(Math.min(o,c));
    var bh = Math.max(2, bodyBot-bodyTop);
    var frag = "";
    if(opts.grid!==false){ frag += rect(cx-bw/2-8, y(o), bw+16, 1, cssv("--line-soft"), 1); }
    frag += line(cx, y(h), cx, y(l), col, 2.4, 1);
    frag += rectR(cx-bw/2, bodyTop, bw, bh, col, 1);
    if(opts.hl==="body"){
      frag += strokeRect(cx-bw/2-3, bodyTop-3, bw+6, bh+6, cssv("--accent"));
    }else if(opts.hl==="upper"){
      var t=y(h), b=y(Math.max(o,c));
      frag += line(cx, t, cx, b, cssv("--accent"), 6, .35);
      frag += labelBubble(cx+bw/2+6, (t+b)/2, "上影线");
    }else if(opts.hl==="lower"){
      var t2=y(Math.min(o,c)), b2=y(l);
      frag += line(cx, t2, cx, b2, cssv("--accent"), 6, .35);
      frag += labelBubble(cx+bw/2+6, (t2+b2)/2, "下影线");
    }else if(opts.hl==="bodyLabel"){
      frag += strokeRect(cx-bw/2-3, bodyTop-3, bw+6, bh+6, cssv("--accent"));
      frag += labelBubble(cx+bw/2+9, (bodyTop+bodyBot)/2, "实体");
    }
    svg.setAttribute("role","img");
    if(!svg.getAttribute("aria-label")){
      svg.setAttribute("aria-label", (up?"阳线（收盘高于开盘）":"阴线（收盘低于开盘）")+" K 线示意图");
    }
    svg.innerHTML = frag;
  };

  // ---------- 生成一段“像真的”随机行情 ----------
  // 向缓慢起伏的趋势线做均值回归 + 噪声。seed 省略/null → 每次随机。
  function mulberry32(a){
    return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  }
  function r1(x){ return Math.round(x*10)/10; }
  PA.genSeries = function(n, seed, opts){
    opts = opts||{};
    var rnd = mulberry32(seed==null ? Math.floor(Math.random()*4294967296) : seed);
    var start = opts.start!=null?opts.start:42;
    var vol   = opts.vol!=null?opts.vol:0.9;
    var amp   = opts.amp!=null?opts.amp:6;    // 大波段起伏
    var rise  = opts.rise!=null?opts.rise:9;  // 全程整体涨跌幅（负=下跌）
    var price = start, bars = [];
    for(var i=0;i<n;i++){
      var ph = i/(n-1);
      var trend = start + rise*ph + amp*Math.sin(ph*Math.PI*1.8);
      var o = price;
      var c = o + 0.16*(trend - o) + (rnd()-0.5)*vol*2.2;
      var hi = Math.max(o,c) + rnd()*vol*1.4;
      var lo = Math.min(o,c) - rnd()*vol*1.4;
      bars.push([r1(o), r1(hi), r1(lo), r1(c)]);
      price = c;
    }
    return bars;
  };

  // ---------- 数据小工具（各课标注用）----------
  PA.swingLow  = function(bs, a, b){ var idx=a, v=bs[a][2]; for(var i=a;i<b;i++){ if(bs[i][2]<v){ v=bs[i][2]; idx=i; } } return [idx, v]; };
  PA.swingHigh = function(bs, a, b){ var idx=a, v=bs[a][1]; for(var i=a;i<b;i++){ if(bs[i][1]>v){ v=bs[i][1]; idx=i; } } return [idx, v]; };
  PA.nth = function(arr, k, desc){ var s=arr.slice().sort(function(a,b){ return desc?b-a:a-b; }); return s[Math.min(k, s.length-1)]; };
  PA.ema = function(bs, period){ var k=2/(period+1), e=null, out=[]; bs.forEach(function(b){ e=(e==null)?b[3]:b[3]*k+e*(1-k); out.push(e); }); return out; };
  // 局部波段高/低点（左右各 w 根都不超过它）
  PA.pivots = function(bs, w){
    w=w||2; var highs=[], lows=[];
    for(var i=w;i<bs.length-w;i++){
      var isH=true, isL=true;
      for(var j=i-w;j<=i+w;j++){ if(j===i) continue; if(bs[j][1]>=bs[i][1]) isH=false; if(bs[j][2]<=bs[i][2]) isL=false; }
      if(isH) highs.push(i); if(isL) lows.push(i);
    }
    return { highs:highs, lows:lows };
  };

  // ---------- KLineChart：真实交易软件风格图表 ----------
  // el 需有明确高度。返回 { chart, restyle, setBars }
  PA.mountChart = function(el, bars, opts){
    opts = opts||{};
    if(!window.klinecharts){ el.innerHTML='<div style="padding:24px;color:var(--ink-soft);font-family:var(--sans)">图表库未加载（assets/vendor/klinecharts.min.js）</div>'; return null; }
    var periods = opts.ma || [7, 30];
    var base = opts.baseTs || 1704067200000, day = 86400000; // 2024-01-01 起，日线
    function toData(list){
      return list.map(function(b,i){
        var o=b[0],h=b[1],l=b[2],c=b[3];
        var vol = Math.round((Math.abs(c-o)+(h-l))*1200 + 4000 + ((i*37)%11)*260);
        return { timestamp: base + i*day, open:o, high:h, low:l, close:c, volume:vol };
      });
    }
    var chart = window.klinecharts.init(el, { locale: "zh-CN" });
    try{ el.setAttribute("role","img"); if(!el.getAttribute("aria-label")) el.setAttribute("aria-label", opts.ariaLabel || "K 线走势图（交互式教学图表）"); }catch(e){}
    chart.applyNewData(toData(bars));
    chart.createIndicator({ name:"MA", calcParams: periods }, false, { id:"candle_pane" });

    function styleObj(){
      var maColors = [cssv("--accent"), cssv("--ink-soft"), cssv("--hue-green")];
      return {
        grid:{ horizontal:{ color: cssv("--line-soft"), style:"dashed" }, vertical:{ show:false } },
        candle:{
          bar:{ upColor: PA.upColor(), downColor: PA.downColor(), noChangeColor: cssv("--ink-soft"),
                upBorderColor: PA.upColor(), downBorderColor: PA.downColor(),
                upWickColor: PA.upColor(), downWickColor: PA.downColor() },
          priceMark:{ high:{ color: cssv("--ink-faint") }, low:{ color: cssv("--ink-faint") },
                      last:{ upColor: PA.upColor(), downColor: PA.downColor(),
                             text:{ borderColor: PA.upColor(), backgroundColor: PA.upColor() } } },
          tooltip:{ showRule: opts.tooltip===false ? "none" : "follow_cross", text:{ color: cssv("--ink") } }
        },
        indicator:{ lines: periods.map(function(p,i){ return { color: maColors[i%maColors.length] }; }),
                    tooltip:{ text:{ color: cssv("--ink-soft") } } },
        xAxis:{ axisLine:{ color: cssv("--line") }, tickText:{ color: cssv("--ink-faint") }, tickLine:{ color: cssv("--line") } },
        yAxis:{ axisLine:{ color: cssv("--line") }, tickText:{ color: cssv("--ink-faint") }, tickLine:{ color: cssv("--line") } },
        crosshair:{ horizontal:{ line:{ color: cssv("--ink-soft") }, text:{ backgroundColor: cssv("--accent") } },
                    vertical:{ line:{ color: cssv("--ink-soft") }, text:{ backgroundColor: cssv("--accent") } } }
      };
    }
    function restyle(){ chart.setStyles(styleObj()); }
    restyle();

    window.addEventListener("resize", function(){ if(chart.resize) chart.resize(); });
    if(window.matchMedia){
      try{ window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function(){ setTimeout(restyle, 30); }); }catch(e){}
    }
    return { chart: chart, restyle: restyle, setBars: function(list){ chart.applyNewData(toData(list)); } };
  };

  // ---------- 沙盘：图表 + 可拖动参数，实时随机重生成 ----------
  PA.mountPlayground = function(host, opts){
    opts = opts||{};
    host.classList.add("chartframe");
    host.style.height = "auto";
    var h = opts.height || 300;
    host.innerHTML =
      '<div class="klchart" style="width:100%;height:'+h+'px"></div>' +
      '<div class="chart-ctrls">' +
        '<button class="btn ghost mini" type="button" data-act="shuffle">🎲 换一批</button>' +
        '<span class="mini-sld"><label>波动</label><input type="range" data-p="vol" min="4" max="22" value="9" aria-label="波动"></span>' +
        '<span class="mini-sld"><label>趋势</label><input type="range" data-p="rise" min="-16" max="16" value="9" aria-label="趋势"></span>' +
        '<span class="mini-sld"><label>根数</label><input type="range" data-p="bars" min="40" max="120" value="80" aria-label="根数"></span>' +
        '<span class="ctrl-hint">拖动滑块或点「换一批」→ 随机生成新行情</span>' +
      '</div>';
    var st = { vol:0.9, rise:9, bars:80 };
    function gen(){ return PA.genSeries(st.bars, null, { start:42, vol:st.vol, rise:st.rise, amp:6 }); }
    var m = PA.mountChart(host.querySelector(".klchart"), gen(), { ma: opts.ma||[7,30], tooltip: opts.tooltip });
    if(!m) return null;
    Array.prototype.forEach.call(host.querySelectorAll("input[type=range]"), function(inp){
      inp.addEventListener("input", function(){
        var v=+inp.value;
        if(inp.dataset.p==="vol") st.vol=v/10;
        else if(inp.dataset.p==="rise") st.rise=v;
        else if(inp.dataset.p==="bars") st.bars=v;
        m.setBars(gen());
      });
    });
    var sh = host.querySelector('[data-act="shuffle"]');
    if(sh) sh.addEventListener("click", function(){ m.setBars(gen()); });
    PA.registerRedraw(m.restyle);   // 颜色约定切换时自动重新配色
    return { chart: m.chart, restyle: m.restyle };
  };

  // ---------- “涨用 绿/红”颜色约定开关 ----------
  PA.wireToggle = function(containerSel, onChange){
    var btns = Array.prototype.slice.call(document.querySelectorAll(containerSel+" button"));
    function updateBtns(){
      btns.forEach(function(b){
        var on = b.dataset.c===PA.convention;
        b.classList.toggle("act", on);
        b.classList.remove("up-green","up-red");
        if(on) b.classList.add(b.dataset.c==="green" ? "up-green" : "up-red");
      });
    }
    btns.forEach(function(b){
      b.addEventListener("click", function(){ PA.convention = b.dataset.c; updateBtns(); if(onChange) onChange(); });
    });
    updateBtns();
  };
})();
