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

  // 今天 0 点的时间戳（图表把最后一根钉在“今天”）
  PA._todayTs = function(){ var d=new Date(); d.setHours(0,0,0,0); return d.getTime(); };

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

  // ---------- KLineChart 配色（沙盘与教学图共用；读 CSS 变量，深浅色/涨跌色切换后重新调用）----------
  function chartStyles(o){
    o = o||{};
    var periods = o.periods||[];
    var maColors = [cssv("--accent"), cssv("--ink-soft"), cssv("--hue-green")];
    var font = cssv("--sans") || "Inter, system-ui, sans-serif";
    return {
      grid:{ horizontal:{ color: cssv("--line-soft"), style:"dashed", dashedValue:[3,3] },
             vertical:{ show: !!o.vgrid, color: cssv("--line-soft"), style:"dashed", dashedValue:[3,3] } },
      candle:{
        bar:{ upColor: PA.upColor(), downColor: PA.downColor(), noChangeColor: cssv("--ink-soft"),
              upBorderColor: PA.upColor(), downBorderColor: PA.downColor(), noChangeBorderColor: cssv("--ink-soft"),
              upWickColor: PA.upColor(), downWickColor: PA.downColor(), noChangeWickColor: cssv("--ink-soft") },
        priceMark:{ show: o.priceMark!==false,
                    high:{ show: o.extremes!==false, color: cssv("--ink-faint") }, low:{ show: o.extremes!==false, color: cssv("--ink-faint") },
                    last:{ show: o.lastMark!==false, upColor: PA.upColor(), downColor: PA.downColor(), noChangeColor: cssv("--ink-soft"),
                           line:{ show: o.lastLine!==false, style:"dashed", dashedValue:[3,3], size:1 },
                           text:{ borderColor: PA.upColor(), backgroundColor: PA.upColor() } } },
        tooltip:{ showRule: o.tooltip===false ? "none" : "follow_cross", text:{ color: cssv("--ink-soft"), family: font } }
      },
      indicator:{ lines: (o.lineColors || periods.map(function(p,i){ return maColors[i%maColors.length]; })).map(function(c){ return { style:"solid", smooth:false, size:1.4, dashedValue:[2,2], color:c }; }),
                  bars:[{ upColor: hexA(PA.upColor(),0.45), downColor: hexA(PA.downColor(),0.45), noChangeColor: hexA(cssv("--ink-soft"),0.45) }],
                  lastValueMark:{ show:false },
                  tooltip:{ showRule: o.tooltip===false ? "none" : "follow_cross", text:{ color: cssv("--ink-soft"), family: font } } },
      xAxis:{ axisLine:{ color: cssv("--line") }, tickText:{ color: cssv("--ink-faint"), family: font }, tickLine:{ color: cssv("--line") } },
      yAxis:{ axisLine:{ color: cssv("--line") }, tickText:{ color: cssv("--ink-faint"), family: font }, tickLine:{ color: cssv("--line") } },
      separator:{ color: cssv("--line-soft") },
      crosshair:{ horizontal:{ line:{ color: cssv("--ink-faint") }, text:{ backgroundColor: cssv("--ink-soft"), borderColor: cssv("--ink-soft") } },
                  vertical:{ line:{ color: cssv("--ink-faint") }, text:{ backgroundColor: cssv("--ink-soft"), borderColor: cssv("--ink-soft") } } }
    };
  }
  PA.chartStyles = chartStyles;

  // "#RRGGBB" / "#RGB" / "rgb(...)" → 带透明度的 rgba
  function hexA(c, a){
    c = String(c||"").trim();
    var m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if(m){ var h=m[1]; if(h.length===3) h=h.replace(/(.)/g,"$1$1");
      return "rgba("+parseInt(h.slice(0,2),16)+","+parseInt(h.slice(2,4),16)+","+parseInt(h.slice(4,6),16)+","+a+")"; }
    var r = c.match(/^rgba?\(([^)]+)\)$/i);
    if(r){ var p=r[1].split(",").slice(0,3).join(","); return "rgba("+p+","+a+")"; }
    return c;
  }
  PA.hexA = hexA;

  // ---------- KLineChart：真实交易软件风格图表 ----------
  // el 需有明确高度。返回 { chart, restyle, setBars }
  PA.mountChart = function(el, bars, opts){
    opts = opts||{};
    if(!window.klinecharts){ el.innerHTML='<div style="padding:24px;color:var(--ink-soft);font-family:var(--sans)">图表库未加载（assets/vendor/klinecharts.min.js）</div>'; return null; }
    var periods = opts.ma || [7, 30];
    var day = 86400000;
    var endTs = opts.endTs || PA._todayTs();          // 最后一根 = 今天
    function tsFor(m){                                 // 往前推 m 个交易日（跳过周末），末尾=今天
      var out=[], ts=endTs;
      while(out.length<m){ var wd=new Date(ts).getDay(); if(wd!==0&&wd!==6) out.push(ts); ts-=day; }
      return out.reverse();
    }
    function toData(list){
      var m=list.length, tsArr=tsFor(m);
      return list.map(function(b,i){
        var o=b[0],h=b[1],l=b[2],c=b[3];
        var vol = Math.round((Math.abs(c-o)+(h-l))*1200 + 4000 + ((i*37)%11)*260);
        return { timestamp: tsArr[i], open:o, high:h, low:l, close:c, volume:vol };
      });
    }
    var chart = window.klinecharts.init(el, { locale: "zh-CN" });
    try{ el.setAttribute("role","img"); if(!el.getAttribute("aria-label")) el.setAttribute("aria-label", opts.ariaLabel || "K 线走势图（交互式教学图表）"); }catch(e){}
    chart.applyNewData(toData(bars));
    chart.createIndicator({ name:"MA", calcParams: periods }, false, { id:"candle_pane" });
    // 永不留白：最后一根（今天）钉在右边，且左右都禁止拖出数据范围
    try{
      chart.setOffsetRightDistance(0);
      if(chart.setMaxOffsetRightDistance) chart.setMaxOffsetRightDistance(0);  // 右侧不能拖出空白
      if(chart.setMaxOffsetLeftDistance)  chart.setMaxOffsetLeftDistance(0);   // 左侧不能拖出空白
    }catch(e){}

    function restyle(){ chart.setStyles(chartStyles({ periods:periods, tooltip:opts.tooltip })); }
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
        '<span class="ctrl-hint">日线 · 默认近半年，滚轮/双指缩放看更长区间 · 拖滑块或「换一批」换行情</span>' +
      '</div>';
    // 700 根（约 2.8 年交易日）：默认看近半年；即使缩到 klinecharts 最小格距(≈1.35px)也能填满最宽面板(≈852px 需≈634根)，故永不留白
    var st = { vol:0.9, rise:9, bars:700 };
    function gen(){ return PA.genSeries(st.bars, null, { start:42, vol:st.vol, rise:st.rise, amp:14 }); }
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

  // ---------- 拟真化：把一根“教学 K 线”拆成几根更细周期的 K 线 ----------
  // 每组子 K 线合起来的 开/高/低/收 与原来那根完全一致（高低点精确保留），
  // 所以作者写的 hline / zone / 价位数字都仍然准确；内部路径、影线和实体大小则像真实盘面一样参差。
  // 随机数按“这根 K 线的数值 + 位置”取种子：同一段前缀在不同场景里拆出来的样子完全相同。
  function seedOf(nums){ var h=2166136261>>>0; for(var i=0;i<nums.length;i++){ h^=Math.round(nums[i]*1000)&0xffffffff; h=Math.imul(h,16777619)>>>0; } return h; }
  function r2(x){ return Math.round(x*100)/100; }
  function gauss(rnd){ var u=Math.max(1e-9,rnd()), v=rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
  // keep：{序号:true}，被标注点名的 K 线保持单根（信号棒、突破棒在真实盘面里本来就比周围更显眼）
  PA.densify = function(bars, k, keep){
    var out=[], groups=[];
    bars.forEach(function(b, g){
      var o=b[0], h=b[1], l=b[2], c=b[3], R=Math.max(h-l, 1e-6), s=out.length;
      if(!(k>1) || (keep && keep[g])){ out.push([o,h,l,c]); groups.push({s:s, n:1, hi:s, lo:s}); return; }
      var rnd=mulberry32(seedOf([o,h,l,c,g,k]));
      var up=c>=o, lowFirst = up ? rnd()<0.7 : rnd()<0.3;   // 阳线多半先探低再收高
      var E1=lowFirst?l:h, E2=lowFirst?h:l;
      var pA=Math.floor(rnd()*(k-1)), pB=pA+1+Math.floor(rnd()*(k-1-pA));
      // 锚点（收盘价空间）：-1=开盘；pA 收在第一个极值附近；pB 收在第二个极值附近；k-1=收盘
      var anchors=[[-1,o],[pA,E1+(E2-E1)*(0.08+rnd()*0.3)]];
      if(pB<k-1) anchors.push([pB,E2+(E1-E2)*(0.08+rnd()*0.3)]);
      anchors.push([k-1,c]);
      var closes=new Array(k), sig=R*0.32/Math.sqrt(k), a, j;
      for(a=0;a<anchors.length-1;a++){
        var i0=anchors[a][0], v0=anchors[a][1], i1=anchors[a+1][0], v1=anchors[a+1][1], w=[0];
        for(j=i0+1;j<=i1;j++) w.push(w[w.length-1]+gauss(rnd)*sig);
        var wEnd=w[w.length-1];
        for(j=i0+1;j<=i1;j++){
          var t=(j-i0)/(i1-i0), v=v0+(v1-v0)*t+(w[j-i0]-wEnd*t);
          closes[j]=(j===i1)?v1:Math.min(h-R*0.03, Math.max(l+R*0.03, v));
        }
      }
      var prev=o;
      for(j=0;j<k;j++){
        var op=prev, cl=closes[j], top=Math.max(op,cl), bot=Math.min(op,cl);
        var wk=R*0.11;
        var hh=Math.min(h, top+Math.abs(gauss(rnd))*wk*(rnd()<0.25?0.2:1)), ll=Math.max(l, bot-Math.abs(gauss(rnd))*wk*(rnd()<0.25?0.2:1));
        if(j===pA){ if(lowFirst) ll=l; else hh=h; }
        if(j===pB){ if(lowFirst) hh=h; else ll=l; }
        out.push([r2(op), r2(hh), r2(ll), r2(cl)]); prev=cl;
      }
      groups.push({ s:s, n:k, hi:s+(lowFirst?pB:pA), lo:s+(lowFirst?pA:pB) });
    });
    return { bars:out, groups:groups };
  };

  // 成交量：与振幅、实体正相关 + 噪声（只为盘面观感，课程不据此下结论）
  function fakeVolumes(bars){
    var avg=0; bars.forEach(function(b){ avg+=b[1]-b[2]; }); avg=(avg/bars.length)||1;
    return bars.map(function(b,i){
      var rnd=mulberry32(seedOf([b[0],b[3],i]));
      var v=(0.45+(b[1]-b[2])/avg*0.75+Math.abs(b[3]-b[0])/avg*0.45)*(0.7+rnd()*0.6);
      return Math.round(v*1800);
    });
  }

  // ---------- 教学图的标注 overlay（注册一次）----------
  var _ovReady=false;
  function chipStyles(col){
    return { color:"#fff", size:11.5, weight:"bold", family: cssv("--sans")||"sans-serif",
             paddingLeft:6, paddingRight:6, paddingTop:3, paddingBottom:3,
             borderRadius:4, borderSize:0, borderColor:col, backgroundColor:col, style:"fill" };
  }
  function ensureOverlays(){
    if(_ovReady || !window.klinecharts) return; _ovReady=true;
    var K=window.klinecharts;
    // 隐形指标：让价格轴把标注价位也包进来（KLineChart 默认只按 K 线定纵轴范围，图外的目标线会看不见）
    K.registerIndicator({ name:"paRange", shortName:"", calcParams:[0,0], precision:2, shouldOhlc:false,
      figures:[{ key:"a", type:"line" },{ key:"b", type:"line" }],
      calc:function(list, ind){ var p=ind.calcParams; return list.map(function(){ return { a:p[0], b:p[1] }; }); } });
    var base={ totalStep:2, lock:true, needDefaultPointFigure:false, needDefaultXAxisFigure:false, needDefaultYAxisFigure:false };
    // 水平线（贯穿全图）+ 左侧小标签 + 右轴价位
    K.registerOverlay(Object.assign({}, base, { name:"paHLine",
      createPointFigures:function(a){
        var d=a.overlay.extendData||{}, y=a.coordinates[0].y, W=a.bounding.width;
        var f=[{ type:"line", attrs:{ coordinates:[{x:0,y:y},{x:W,y:y}] }, styles:{ style:d.dash===false?"solid":"dashed", dashedValue:[5,4], size:1.4, color:d.color }, ignoreEvent:true }];
        if(d.label) f.push({ type:"text", attrs:{ x:6, y:y, text:d.label, align:"left", baseline:"middle" }, styles:chipStyles(d.color), ignoreEvent:true });
        return f;
      },
      createYAxisFigures:function(a){
        var d=a.overlay.extendData||{}, y=a.coordinates[0].y;
        return [{ type:"text", attrs:{ x:0, y:y, text:(+a.overlay.points[0].value).toFixed(2), align:"left", baseline:"middle" }, styles:chipStyles(d.color), ignoreEvent:true }];
      } }));
    // 价格带（半透明矩形）+ 左侧标签
    K.registerOverlay(Object.assign({}, base, { name:"paZone", totalStep:3,
      createPointFigures:function(a){
        var d=a.overlay.extendData||{}, W=a.bounding.width;
        var y1=Math.min(a.coordinates[0].y, a.coordinates[1].y), y2=Math.max(a.coordinates[0].y, a.coordinates[1].y);
        var f=[{ type:"rect", attrs:{ x:0, y:y1, width:W, height:Math.max(2,y2-y1) }, styles:{ style:"fill", color:hexA(d.color,0.13) }, ignoreEvent:true },
               { type:"line", attrs:{ coordinates:[{x:0,y:y1},{x:W,y:y1}] }, styles:{ style:"dashed", dashedValue:[2,3], size:1, color:hexA(d.color,0.55) }, ignoreEvent:true },
               { type:"line", attrs:{ coordinates:[{x:0,y:y2},{x:W,y:y2}] }, styles:{ style:"dashed", dashedValue:[2,3], size:1, color:hexA(d.color,0.55) }, ignoreEvent:true }];
        if(d.label) f.push({ type:"text", attrs:{ x:6, y:(y1+y2)/2, text:d.label, align:"left", baseline:"middle" }, styles:chipStyles(d.color), ignoreEvent:true });
        return f;
      } }));
    // 线段（趋势线 / 通道线）+ 末端标签
    K.registerOverlay(Object.assign({}, base, { name:"paSeg", totalStep:3,
      createPointFigures:function(a){
        var d=a.overlay.extendData||{}, p=a.coordinates;
        var f=[{ type:"line", attrs:{ coordinates:[p[0],p[1]] }, styles:{ style:d.dash?"dashed":"solid", dashedValue:[5,4], size:1.7, color:d.color }, ignoreEvent:true }];
        if(d.label) f.push({ type:"text", attrs:{ x:p[1].x-4, y:p[1].y, text:d.label, align:"right", baseline:"middle" }, styles:chipStyles(d.color), ignoreEvent:true });
        return f;
      } }));
    // 文字标注：锚定在某根 K 线的高点（上方）或低点（下方），用细线连到标签
    K.registerOverlay(Object.assign({}, base, { name:"paLabel",
      createPointFigures:function(a){
        var d=a.overlay.extendData||{}, p=a.coordinates[0], dir=d.below?1:-1, gap=5, len=10+(d.dy||0);
        var y0=p.y+dir*gap, y1=p.y+dir*(gap+len);
        return [
          { type:"line", attrs:{ coordinates:[{x:p.x,y:y0},{x:p.x,y:y1}] }, styles:{ style:"solid", size:1, color:d.color }, ignoreEvent:true },
          { type:"circle", attrs:{ x:p.x, y:y0, r:2 }, styles:{ style:"fill", color:d.color }, ignoreEvent:true },
          { type:"text", attrs:{ x:p.x+(d.dx||0), y:y1, text:d.text, align:"center", baseline:d.below?"top":"bottom" }, styles:chipStyles(d.color), ignoreEvent:true }
        ];
      } }));
  }

  // ---------- 教学图：KLineChart 外观 + 拟真数据 + 标注 ----------
  // el 为空容器；opts: { height, volume(默认 true), tooltip }
  // 返回 { show(scene, k), redraw(), chart, priceAt(clientX, clientY), el }
  // scene: { bars:[[o,h,l,c]...], annotations:[...], ema }，annotations 的 i / points 仍按“作者写的 K 线序号”。
  var _measure=null;
  function textW(t){
    if(!_measure){ _measure=document.createElement("canvas").getContext("2d"); }
    _measure.font="bold 11.5px "+(cssv("--sans")||"sans-serif");
    return _measure.measureText(t).width+12;
  }
  PA.teachChart = function(el, opts){
    opts=opts||{};
    if(!window.klinecharts){ el.innerHTML='<div style="padding:24px;color:var(--ink-soft)">图表库未加载</div>'; return null; }
    ensureOverlays();
    el.classList.add("tchart");
    el.style.height=(opts.height||320)+"px";
    var chart=window.klinecharts.init(el, { locale:"zh-CN" });
    try{ el.setAttribute("role","img"); el.setAttribute("aria-label", opts.ariaLabel||"教学用 K 线图（数据为模拟）"); }catch(e){}
    chart.setPriceVolumePrecision(2, 0);
    chart.setZoomEnabled(false); chart.setScrollEnabled(false);
    if(opts.volume!==false) chart.createIndicator({ name:"VOL", calcParams:[] }, false, { height:52, dragEnabled:false });
    var cur=null, emaShown=false;

    function toData(list){
      var t0=new Date(); t0.setHours(9,30,0,0); var step=5*60000, vols=fakeVolumes(list);
      return list.map(function(b,i){ return { timestamp:t0.getTime()+i*step, open:b[0], high:b[1], low:b[2], close:b[3], volume:vols[i] }; });
    }
    function paneW(){
      var s=null; try{ s=chart.getSize("candle_pane","main"); }catch(e){}
      return (s&&s.width) || Math.max(200, el.clientWidth-60);
    }
    function fit(){
      if(!cur) return;
      var n=cur.dense.length, sp=Math.max(2, Math.min(40, paneW()/(n+1.2)));
      chart.setBarSpace(sp);
      chart.setOffsetRightDistance(sp*0.9);
      try{ chart.scrollToRealTime(0); }catch(e){}
    }
    function style(){
      chart.setStyles(chartStyles({ tooltip:opts.tooltip, extremes:false, lastMark:false, lastLine:false, lineColors:[cssv("--ink-soft")] }));
    }
    // 作者序号 → 细化后的序号
    function idxFor(gi, price){
      var G=cur.groups[Math.max(0, Math.min(cur.groups.length-1, gi))], b=cur.src[Math.max(0, Math.min(cur.src.length-1, gi))];
      if(price==null) return G.s+Math.floor(G.n/2);
      var dh=Math.abs(price-b[1]), dl=Math.abs(price-b[2]), tol=(b[1]-b[2])*0.35+0.15;
      if(dh<=dl && dh<=tol) return G.hi;
      if(dl<dh && dl<=tol) return G.lo;
      return G.s+Math.floor(G.n/2);
    }
    function toPx(dataIndex, value){
      try{ var p=chart.convertToPixel({ dataIndex:dataIndex, value:value }, { paneId:"candle_pane" }); return p; }catch(e){ return null; }
    }
    var rangeOn=false;
    function setRange(){
      var lo=Infinity, hi=-Infinity, blo=Infinity, bhi=-Infinity;
      cur.src.forEach(function(b){ blo=Math.min(blo,b[2]); bhi=Math.max(bhi,b[1]); });
      (cur.annotations||[]).forEach(function(a){
        var vs = a.type==="hline" ? [a.value] : a.type==="zone" ? [a.from,a.to] : a.type==="line" ? [a.points[0][1], a.points[1][1]] : [];
        vs.forEach(function(v){ if(v!=null && isFinite(v)){ lo=Math.min(lo,v); hi=Math.max(hi,v); } });
      });
      var need = lo<blo || hi>bhi;
      if(!need){ if(rangeOn){ try{ chart.removeIndicator("candle_pane","paRange"); }catch(e){} rangeOn=false; } return; }
      var pad=(Math.max(hi,bhi)-Math.min(lo,blo))*0.04;
      var p=[Math.min(lo,blo)-pad, Math.max(hi,bhi)+pad], ln={ style:"solid", smooth:false, size:1, dashedValue:[2,2], color:"rgba(0,0,0,0)" }, hidden={ lines:[ln, ln], tooltip:{ showRule:"none" }, lastValueMark:{ show:false } };
      if(rangeOn) chart.overrideIndicator({ name:"paRange", calcParams:p, styles:hidden }, "candle_pane");
      else { chart.createIndicator({ name:"paRange", calcParams:p, styles:hidden }, true, { id:"candle_pane" }); rangeOn=true; }
    }
    function draw(){
      if(!cur) return;
      chart.removeOverlay();
      var acc=cssv("--accent"), placed=[], H=(function(){ try{ return chart.getSize("candle_pane","main").height; }catch(e){ return 260; } })();
      var dense=cur.dense, boxes=[];
      dense.forEach(function(b,i){ var a=toPx(i,b[1]), z=toPx(i,b[2]); if(a&&z) boxes.push({x:a.x-3, y:a.y, w:6, h:z.y-a.y}); });
      function free(r){ return r.y>=2 && r.y+r.h<=H-2 && !boxes.concat(placed).some(function(b){ return r.x<b.x+b.w && b.x<r.x+r.w && r.y<b.y+b.h && b.y<r.y+r.h; }); }
      (cur.annotations||[]).forEach(function(a){
        var col=a.color||acc;
        if(a.type==="hline"){
          chart.createOverlay({ name:"paHLine", lock:true, points:[{ dataIndex:0, value:a.value }], extendData:{ color:col, label:a.label, dash:a.dash } });
          if(a.label){ var p=toPx(0,a.value); if(p) placed.push({ x:0, y:p.y-10, w:textW(a.label)+8, h:20 }); }
        } else if(a.type==="zone"){
          chart.createOverlay({ name:"paZone", lock:true, points:[{ dataIndex:0, value:a.from },{ dataIndex:dense.length-1, value:a.to }], extendData:{ color:col, label:a.label } });
          if(a.label){ var pz=toPx(0,(a.from+a.to)/2); if(pz) placed.push({ x:0, y:pz.y-10, w:textW(a.label)+8, h:20 }); }
        } else if(a.type==="line"){
          var q0=a.points[0], q1=a.points[1];
          chart.createOverlay({ name:"paSeg", lock:true, points:[{ dataIndex:idxFor(q0[0],q0[1]), value:q0[1] },{ dataIndex:idxFor(q1[0],q1[1]), value:q1[1] }], extendData:{ color:col, label:a.label, dash:a.dash } });
        }
      });
      (cur.annotations||[]).forEach(function(a){
        if(a.type!=="label") return;
        var col=a.color||acc, gi=Math.max(0, Math.min(cur.src.length-1, a.i)), b=cur.src[gi], G=cur.groups[gi];
        var below = a.value < (b[1]+b[2])/2;
        var di = below ? G.lo : G.hi, anchor = below ? b[2] : b[1];
        var p=toPx(di, anchor), w=textW(a.text), dy=0, dx=0;
        if(p){
          // 横向别出图：靠边的标签往里挪
          var W=paneW(); if(p.x-w/2<2) dx=2-(p.x-w/2); else if(p.x+w/2>W-2) dx=(W-2)-(p.x+w/2);
          function rect(dir,d){ var y=dir>0? p.y+5+10+d : p.y-5-10-d-20; return { x:p.x+dx-w/2, y:y, w:w, h:20 }; }
          var dir=below?1:-1, found=false;
          for(var t=0;t<=2 && !found;t++){
            for(dy=0; dy<=90; dy+=4){ if(free(rect(dir,dy))){ found=true; break; } }
            if(!found){ dir=-dir; below=!below; di=below?G.lo:G.hi; anchor=below?b[2]:b[1]; p=toPx(di,anchor)||p; }
          }
          if(!found) dy=0;
          placed.push(rect(dir,dy));
        }
        chart.createOverlay({ name:"paLabel", lock:true, points:[{ dataIndex:di, value:anchor }], extendData:{ color:col, text:a.text, below:below, dy:dy, dx:dx } });
      });
    }
    function show(scene, k, keep){
      var src=scene.bars, dn=PA.densify(src, k||1, keep);
      cur={ src:src, dense:dn.bars, groups:dn.groups, annotations:scene.annotations };
      style();
      chart.applyNewData(toData(dn.bars));
      var wantEma = scene.ema!=null;
      if(emaShown){ try{ chart.removeIndicator("candle_pane","EMA"); }catch(e){} emaShown=false; }
      if(wantEma){ chart.createIndicator({ name:"EMA", calcParams:[scene.ema] }, true, { id:"candle_pane" }); emaShown=true; }
      setRange();
      fit();
      // 等一帧让坐标系按新数据布局，再算标签避让
      requestAnimationFrame(function(){ fit(); draw(); });
    }
    function redraw(){ style(); fit(); draw(); }
    var rt=null;
    window.addEventListener("resize", function(){ clearTimeout(rt); rt=setTimeout(function(){ chart.resize(); redraw(); }, 120); });
    PA.registerRedraw(redraw);
    return {
      chart:chart, el:el, show:show, redraw:redraw,
      // 只换标注、不换数据（拖动滑块时用，避免整图重排）
      setAnnotations:function(list){ if(!cur) return; cur.annotations=list; setRange(); draw(); requestAnimationFrame(draw); },
      // 页面坐标 → 价格（drawOnChart 用）；不在 K 线区域内返回 null
      priceAt:function(clientX, clientY){
        var r=el.getBoundingClientRect();
        try{
          var v=chart.convertFromPixel([{ x:clientX-r.left, y:clientY-r.top }], { paneId:"candle_pane", absolute:true });
          v = v && (v[0]||v);
          var H=chart.getSize("candle_pane","main").height;
          if(clientY-r.top>H) return null;
          return v && v.value!=null ? v.value : null;
        }catch(e){ return null; }
      }
    };
  };

  // 一组场景统一的细化倍数：总根数约 50–70；用到 20 EMA 的场景不细化（保持“20 根”的含义）
  // 一组场景里所有 label 点名的 K 线序号（并集），细化时保持单根
  PA.keepBars = function(scenes){
    var keep={};
    scenes.forEach(function(s){ (s.annotations||[]).forEach(function(a){ if(a.type==="label" && a.i!=null) keep[a.i]=true; }); });
    return keep;
  };
  PA.denseK = function(scenes, force){
    if(force===false) return 1;
    if(typeof force==="number") return force;
    var maxN=0, ema=false;
    scenes.forEach(function(s){ maxN=Math.max(maxN, (s.bars||[]).length); if(s.ema!=null) ema=true; });
    if(ema || !maxN || maxN>26) return 1;   // 已经是长序列（多为 genSeries 生成）就不再细化
    return Math.max(1, Math.min(5, Math.round(66/maxN)));
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
