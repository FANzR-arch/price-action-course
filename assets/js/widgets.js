/* ============================================================
   价格行为课 · 交互组件库  PA.widgets.*
   每个组件 = 一个工厂：传入容器元素 + 配置，自建 DOM、自绘、自动登记重绘。
   依赖 candles.js（PA.drawCandle / PA.cssv / PA.upColor / PA.registerRedraw）。
   ============================================================ */
(function(){
  "use strict";
  var PA = window.PA = window.PA || {};
  var W = PA.widgets = PA.widgets || {};

  function chip(k,v){ return '<span class="chip">'+k+' '+v+'</span>'; }
  function rr(n){ return Math.round(n*10)/10; }

  // 选项乱序：避免正确答案固定落在某一位（作者按“先写正确答案”的习惯排版，
  // 不打乱的话学员只要一直选 A 就能全对）。个别需要固定顺序的题可传 shuffle:false。
  function shuffled(arr){
    var a = arr.slice();
    for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; }
    return a;
  }

  // 在一个 <svg> 里画一小段 K 线序列（形态图鉴 / 缩略图用）
  // 实体宽度封顶 + 影线细且封顶 + 整组居中，保证任何根数/尺寸下比例都精致。
  function miniSeries(svg, bars, opts){
    opts = opts||{};
    var vb=svg.viewBox.baseVal, WD=vb.width, HT=vb.height;
    var padY=opts.padY!=null?opts.padY:14;
    var n=bars.length, lo=Infinity, hi=-Infinity;
    bars.forEach(function(b){ lo=Math.min(lo,b[2]); hi=Math.max(hi,b[1]); });
    var span=(hi-lo)||1; lo-=span*0.14; hi+=span*0.14;
    function y(p){ return padY+(hi-p)/(hi-lo)*(HT-padY*2); }
    // 实体宽度：受最大值与可用宽度双重约束；蜡烛之间留约 0.8 个实体的空隙
    var bw = Math.min(opts.maxBw||28, (WD*0.92)/(n*1.8));
    bw = Math.max(4, bw);
    var step = bw*1.8;                                  // 中心间距
    var x0 = WD/2 - step*(n-1)/2;                       // 整组水平居中
    var ww = Math.max(1.4, Math.min(bw*0.14, 2.6));     // 影线细、封顶
    var rx = Math.min(1.8, bw*0.12);
    var frag="";
    bars.forEach(function(b,i){
      var o=b[0],h=b[1],l=b[2],c=b[3], cx=x0+i*step, col=(c>=o)?PA.upColor():PA.downColor();
      var bt=y(Math.max(o,c)), bb=y(Math.min(o,c)), bh=Math.max(1.8,bb-bt);
      frag+='<line x1="'+rr(cx)+'" y1="'+rr(y(h))+'" x2="'+rr(cx)+'" y2="'+rr(y(l))+'" stroke="'+col+'" stroke-width="'+ww+'" stroke-linecap="round"/>';
      frag+='<rect x="'+rr(cx-bw/2)+'" y="'+rr(bt)+'" width="'+rr(bw)+'" height="'+rr(bh)+'" rx="'+rr(rx)+'" fill="'+col+'"/>';
    });
    svg.innerHTML=frag;
  }
  PA.miniSeries = miniSeries;

  // ---------- 带标注的完整图表（自绘 SVG，供 annotatedChart / drawOnChart 用）----------
  function annoChip(x,y,txt,col){
    var w=txt.length*13+10;
    return '<g><rect x="'+rr(x)+'" y="'+rr(y-9)+'" width="'+w+'" height="18" rx="5" fill="'+col+'"/><text x="'+rr(x+w/2)+'" y="'+rr(y+4)+'" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff">'+txt+'</text></g>';
  }
  // bars: [[o,h,l,c]...]；opts.annotations: [{type:'hline'|'zone'|'line'|'label', ...}]
  function drawChartSVG(svg, bars, opts){
    opts = opts||{};
    var vb=svg.viewBox.baseVal, W=vb.width, H=vb.height;
    var pL=opts.padL!=null?opts.padL:12, pR=opts.padR!=null?opts.padR:46, pT=14, pB=16;
    var n=bars.length, lo=Infinity, hi=-Infinity;
    bars.forEach(function(b){ lo=Math.min(lo,b[2]); hi=Math.max(hi,b[1]); });
    (opts.annotations||[]).forEach(function(a){
      if(a.type==='hline'&&a.value!=null){ lo=Math.min(lo,a.value); hi=Math.max(hi,a.value); }
      else if(a.type==='zone'){ lo=Math.min(lo,a.from,a.to); hi=Math.max(hi,a.from,a.to); }
      else if(a.type==='line'){ a.points.forEach(function(p){ lo=Math.min(lo,p[1]); hi=Math.max(hi,p[1]); }); }
    });
    var span=(hi-lo)||1; lo-=span*0.08; hi+=span*0.10;
    var plotR=W-pR, plotH=H-pT-pB;
    function x(i){ return pL + (plotR-pL)*(i+0.5)/n; }
    function y(p){ return pT + (hi-p)/(hi-lo)*plotH; }
    svg.__scale = { hi:hi, lo:lo, pT:pT, pB:pB, H:H, plotL:pL, plotR:plotR };
    var slot=(plotR-pL)/n, bw=Math.max(2,Math.min(slot*0.62,13)), ww=Math.max(1,Math.min(bw*0.16,2.4)), frag="";
    var ticks=opts.ticks||4;
    for(var t=0;t<=ticks;t++){
      var py=pT+plotH*t/ticks, pval=hi-(hi-lo)*t/ticks;
      frag+='<line x1="'+pL+'" y1="'+rr(py)+'" x2="'+rr(plotR)+'" y2="'+rr(py)+'" stroke="'+PA.cssv('--line-soft')+'" stroke-width="1" opacity=".6"/>';
      frag+='<text x="'+rr(plotR+6)+'" y="'+rr(py+3.5)+'" font-size="11" fill="'+PA.cssv('--ink-faint')+'">'+Math.round(pval)+'</text>';
    }
    bars.forEach(function(b,i){
      var o=b[0],h=b[1],l=b[2],c=b[3], cx=x(i), col=(c>=o)?PA.upColor():PA.downColor();
      var bt=y(Math.max(o,c)), bb=y(Math.min(o,c)), bh=Math.max(1.2,bb-bt);
      frag+='<line x1="'+rr(cx)+'" y1="'+rr(y(h))+'" x2="'+rr(cx)+'" y2="'+rr(y(l))+'" stroke="'+col+'" stroke-width="'+ww+'" stroke-linecap="round"/>';
      frag+='<rect x="'+rr(cx-bw/2)+'" y="'+rr(bt)+'" width="'+rr(bw)+'" height="'+rr(bh)+'" rx="1.4" fill="'+col+'"/>';
    });
    // 均线（EMA）—— 第 8 课 Always In 用
    if(opts.ema){
      var kk=2/(opts.ema+1), e=null, epts=[];
      bars.forEach(function(b,i){ e=(e==null)?b[3]:b[3]*kk+e*(1-kk); epts.push(rr(x(i))+','+rr(y(e))); });
      if(epts.length>1) frag+='<polyline points="'+epts.join(' ')+'" fill="none" stroke="'+PA.cssv('--ink-soft')+'" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>';
    }
    // 已占用的矩形（K 线 + 已画的标注），label 落点据此避让
    var boxes=bars.map(function(b,i){ return {x:x(i)-bw/2-1, y:y(b[1])-1, w:bw+2, h:y(b[2])-y(b[1])+2}; });
    function hits(r){ return boxes.some(function(b){ return r.x<b.x+b.w && b.x<r.x+r.w && r.y<b.y+b.h && b.y<r.y+r.h; }); }
    function chipAt(cx,cy,txt,col){ boxes.push({x:cx, y:cy-9, w:txt.length*13+10, h:18}); return annoChip(cx,cy,txt,col); }
    (opts.annotations||[]).forEach(function(a){
      var col=a.color||PA.cssv('--accent');
      if(a.type==='zone'){
        var yt=y(Math.max(a.from,a.to)), yb=y(Math.min(a.from,a.to));
        frag+='<rect x="'+pL+'" y="'+rr(yt)+'" width="'+rr(plotR-pL)+'" height="'+rr(Math.max(2,yb-yt))+'" fill="'+col+'" opacity="0.14"/>';
        if(a.label) frag+=chipAt(pL+5, (yt+yb)/2, a.label, col);
      } else if(a.type==='hline'){
        var yy=y(a.value);
        frag+='<line x1="'+pL+'" y1="'+rr(yy)+'" x2="'+rr(plotR)+'" y2="'+rr(yy)+'" stroke="'+col+'" stroke-width="1.6" stroke-dasharray="'+(a.dash===false?'0':'5 4')+'"/>';
        if(a.label) frag+=chipAt(pL+5, yy, a.label, col);
      } else if(a.type==='line'){
        var p1=a.points[0], p2=a.points[1];
        frag+='<line x1="'+rr(x(p1[0]))+'" y1="'+rr(y(p1[1]))+'" x2="'+rr(x(p2[0]))+'" y2="'+rr(y(p2[1]))+'" stroke="'+col+'" stroke-width="1.9" stroke-dasharray="'+(a.dash?'5 4':'0')+'" stroke-linecap="round"/>';
        if(a.label) frag+=chipAt(x(p2[0])-(a.label.length*13+10)-2, y(p2[1]), a.label, col);
      } else if(a.type==='label'){
        // 钳制在绘图区内：靠右的标注会压住价格刻度，贴顶/贴底的会被画到坐标区外。
        // 再上下微调避开 K 线和其他标注（就近找空位，找不到就保留原位）。
        var lw=a.text.length*13+10;
        var lx=Math.max(pL, Math.min(x(a.i), plotR-lw));
        var yMin=pT+9, yMax=H-pB-9;
        var ly0=Math.max(yMin, Math.min(y(a.value), yMax)), ly=ly0;
        for(var d=0; d<=90; d+=3){
          var cand=[ly0-d, ly0+d].filter(function(v){ return v>=yMin && v<=yMax && !hits({x:lx, y:v-9, w:lw, h:18}); });
          if(cand.length){ ly=cand[0]; break; }
        }
        frag+=chipAt(lx, ly, a.text, col);
      }
    });
    svg.innerHTML=frag;
  }
  PA.drawChartSVG = drawChartSVG;

  // ---------- 带标注的教学图表（可多场景切换）----------
  // opts: { scenes:[{name, bars, annotations, note}] }  或单场景 { bars, annotations, note }
  // 教学图用 KLineChart（真实盘面外观 + 拟真细化数据）；图表库缺失时退回自绘 SVG。
  // opts.dense：false = 不细化；数字 = 固定倍数；省略 = 自动（用到 20 EMA 的图不细化）。
  W.annotatedChart = function(host, opts){
    opts = opts||{};
    var scenes = opts.scenes || [{ name:opts.name||'', bars:opts.bars, annotations:opts.annotations, note:opts.note, ema:opts.ema }];
    var multi = scenes.length>1;
    host.innerHTML =
      '<div class="card pad">'+
        (multi ? '<div class="scene-tabs" data-el="tabs">'+scenes.map(function(s,i){ return '<button class="scene-tab'+(i===0?' on':'')+'" data-i="'+i+'" type="button">'+s.name+'</button>'; }).join('')+'</div>' : '')+
        '<div class="chartbox"><div data-el="tc"></div></div>'+
        '<div class="scene-note" data-el="note"></div>'+
      '</div>';
    var cur=0, noteEl=host.querySelector('[data-el="note"]');
    var k=PA.denseK(scenes, opts.dense), keep=PA.keepBars(scenes);
    var tc=PA.teachChart && PA.teachChart(host.querySelector('[data-el="tc"]'), { height:opts.height||330 });
    var svg=null;
    if(!tc){ host.querySelector('[data-el="tc"]').outerHTML='<svg data-el="svg" viewBox="0 0 640 300"></svg>'; svg=host.querySelector('[data-el="svg"]'); }
    function show(i){ cur=i; var s=scenes[i];
      var ema=(s.ema!=null?s.ema:opts.ema);
      if(tc) tc.show({ bars:s.bars, annotations:s.annotations, ema:ema }, k, keep);
      else drawChartSVG(svg, s.bars, {annotations:s.annotations, ticks:opts.ticks, ema:ema});
      noteEl.innerHTML = s.note||'';
      Array.prototype.forEach.call(host.querySelectorAll('.scene-tab'), function(b){ b.classList.toggle('on', +b.dataset.i===i); });
    }
    Array.prototype.forEach.call(host.querySelectorAll('.scene-tab'), function(b){ b.addEventListener('click', function(){ show(+b.dataset.i); }); });
    show(0);
    if(!tc) PA.registerRedraw(function(){ show(cur); });
    return { redraw:function(){ show(cur); } };
  };

  // ---------- 在图上自己画一条水平线，对照目标区给反馈 ----------
  // opts: { bars, targets:[{low, high, label, tip}], prompt, annotations?（常驻标注）, dense? }
  W.drawOnChart = function(host, opts){
    opts = opts||{};
    var bars = opts.bars, targets = opts.targets||[];
    host.innerHTML =
      '<div class="card pad">'+
        '<div class="chartbox" style="cursor:crosshair"><div data-el="tc"></div></div>'+
        '<div class="draw-foot"><span class="draw-hint">'+(opts.prompt||'在图上点一下，画出你认为的价位线')+'</span>'+
          '<button class="btn ghost mini" data-act="clear" type="button" style="display:none">清除重画</button></div>'+
        '<div class="fb" data-el="fb"></div>'+
      '</div>';
    var fb=host.querySelector('[data-el="fb"]'), clearBtn=host.querySelector('[data-act="clear"]');
    var fixed=opts.annotations||[];
    var k=PA.denseK([{bars:bars}], opts.dense), keep=PA.keepBars([{annotations:fixed}]);
    var tc=PA.teachChart && PA.teachChart(host.querySelector('[data-el="tc"]'), { height:opts.height||320, volume:false, tooltip:false });
    var svg=null;
    if(!tc){ host.querySelector('[data-el="tc"]').outerHTML='<svg data-el="svg" viewBox="0 0 640 300"></svg>'; svg=host.querySelector('[data-el="svg"]'); }
    var userVal=null, revealed=false;
    function base(){ return { annotations: fixed.concat(revealed? targets.map(function(t){ return {type:'zone', from:t.low, to:t.high, label:t.label, color:PA.cssv('--accent')}; }) : []).concat(userVal!=null? [{type:'hline', value:userVal, label:'你画的线', color:PA.cssv('--accent'), dash:false}] : []) }; }
    var shown=false;
    function render(){
      if(tc){ if(!shown){ tc.show({ bars:bars, annotations:base().annotations }, k, keep); shown=true; } else tc.setAnnotations(base().annotations); }
      else drawChartSVG(svg, bars, base());
    }
    render();
    if(!tc) PA.registerRedraw(render);
    (tc? tc.el : svg).addEventListener('click', function(ev){
      var price;
      if(tc){ price=tc.priceAt(ev.clientX, ev.clientY); if(price==null) return; }
      else {
        var sc=svg.__scale; if(!sc) return;
        var rect=svg.getBoundingClientRect();
        var vbY=(ev.clientY-rect.top)/rect.height*sc.H;
        price=sc.hi-(vbY-sc.pT)/(sc.H-sc.pT-sc.pB)*(sc.hi-sc.lo);
      }
      userVal=Math.round(price*10)/10; revealed=true; render();
      var hit=null; targets.forEach(function(t){ if(userVal>=t.low && userVal<=t.high) hit=t; });
      fb.className='fb show '+(hit?'ok':'no');
      if(hit) fb.innerHTML='✓ 不错！你画的 <b>'+userVal+'</b> 正好落在'+(hit.label||'目标区')+'里。'+(hit.tip||'');
      else {
        var t0=targets[0];
        fb.innerHTML='你画在了 <b>'+userVal+'</b>。参考答案：'+(t0?(t0.label||'目标')+'大约在 <b>'+t0.low+'–'+t0.high+'</b>（图上浅色带）':'见浅色带')+'。'+(t0&&userVal<t0.low?'再往上找找。':(t0&&userVal>t0.high?'再往下找找。':''));
      }
      clearBtn.style.display='';
    });
    clearBtn.addEventListener('click', function(){ userVal=null; revealed=false; render(); fb.className='fb'; fb.innerHTML=''; clearBtn.style.display='none'; });
    return { redraw: render };
  };

  // ---------- 盈亏比 / 仓位 / 期望值计算器 ----------
  // opts: { bars, side:'long'|'short', entry, stop, target, account, riskPct, winRate, annotations?, dense? }
  // 价格单位与图上一致；“仓位”按 单笔风险金额 ÷ 每单位止损距离 计算，未计手续费与滑点。
  W.rrCalculator = function(host, opts){
    opts = opts||{};
    var bars=opts.bars, lo=Infinity, hi=-Infinity;
    bars.forEach(function(b){ lo=Math.min(lo,b[2]); hi=Math.max(hi,b[1]); });
    var pad=(hi-lo)*0.35; lo=Math.floor((lo-pad)*10)/10; hi=Math.ceil((hi+pad)*10)/10;
    var S={ side:opts.side||'long', entry:opts.entry, stop:opts.stop, target:opts.target,
            account:opts.account||10000, riskPct:opts.riskPct!=null?opts.riskPct:1, winRate:opts.winRate!=null?opts.winRate:50 };
    function sld(k,label){ return '<div class="sld"><label for="rr-'+k+'">'+label+'</label><input id="rr-'+k+'" type="range" data-k="'+k+'" min="'+lo+'" max="'+hi+'" step="0.1" value="'+S[k]+'"><span class="v" data-v="'+k+'"></span></div>'; }
    function num(k,label,unit,min,max,step){ return '<label class="rr-num"><span>'+label+'</span><input type="number" data-n="'+k+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+S[k]+'"><em>'+unit+'</em></label>'; }
    host.innerHTML =
      '<div class="card pad">'+
        '<div class="rr-top"><div class="toggle rr-side" data-el="side"><button type="button" data-s="long">做多</button><button type="button" data-s="short">做空</button></div>'+
          '<span class="draw-hint">拖动三条价位线的滑块，或改下面的账户参数</span></div>'+
        '<div class="chartbox"><div data-el="tc"></div></div>'+
        '<div class="rr-grid">'+
          '<div class="rr-prices">'+sld('entry','入场')+sld('stop','止损')+sld('target','目标')+'</div>'+
          '<div class="rr-acct">'+num('account','账户资金','元',100,10000000,100)+num('riskPct','单笔风险','%',0.1,10,0.1)+num('winRate','估计胜率','%',1,99,1)+'</div>'+
        '</div>'+
        '<div class="readout" data-el="read" style="margin-top:14px"></div>'+
        '<div class="verdict" data-el="verdict"></div>'+
      '</div>';
    var fixed=opts.annotations||[];
    var tc=PA.teachChart && PA.teachChart(host.querySelector('[data-el="tc"]'), { height:opts.height||300, volume:false, tooltip:false });
    var k=PA.denseK([{bars:bars}], opts.dense), keep=PA.keepBars([{annotations:fixed}]), shown=false;
    function f2(n){ return (Math.round(n*100)/100).toFixed(2); }
    function money(n){ return (n<0?'-':'')+Math.abs(Math.round(n)).toLocaleString('zh-CN'); }
    function annos(){
      var up=PA.cssv('--hue-green'), dn=PA.cssv('--hue-red');
      return fixed.concat([
        {type:'zone', from:S.entry, to:S.stop, color:dn},
        {type:'zone', from:S.entry, to:S.target, color:up},
        {type:'hline', value:S.target, label:'目标', color:up, dash:false},
        {type:'hline', value:S.entry, label:'入场', color:PA.cssv('--accent'), dash:false},
        {type:'hline', value:S.stop, label:'止损', color:dn, dash:false}
      ]);
    }
    function calc(){
      var long=S.side==='long', risk=long? S.entry-S.stop : S.stop-S.entry, reward=long? S.target-S.entry : S.entry-S.target;
      var read=host.querySelector('[data-el="read"]'), verdict=host.querySelector('[data-el="verdict"]');
      ['entry','stop','target'].forEach(function(key){ host.querySelector('[data-v="'+key+'"]').textContent=f2(S[key]); });
      if(tc){ if(!shown){ tc.show({bars:bars, annotations:annos()}, k, keep); shown=true; } else tc.setAnnotations(annos()); }
      if(!(risk>0) || !(reward>0)){
        read.innerHTML='';
        verdict.innerHTML='<span class="tag" style="color:var(--hue-red)">价位顺序不对</span> · '+(long?'做多需要 <strong>止损 &lt; 入场 &lt; 目标</strong>。':'做空需要 <strong>目标 &lt; 入场 &lt; 止损</strong>。')+'先把三条线摆对，计算才有意义。';
        return;
      }
      var rr=reward/risk, W=S.winRate/100, riskAmt=S.account*S.riskPct/100, size=riskAmt/risk;
      var evR=W*rr-(1-W), be=1/(1+rr);
      read.innerHTML=
        '<span class="chip">每单位风险 <b>'+f2(risk)+'</b></span>'+
        '<span class="chip">每单位回报 <b>'+f2(reward)+'</b></span>'+
        '<span class="chip">盈亏比 <b>1 : '+f2(rr)+'</b></span>'+
        '<span class="chip">单笔计划风险 <b>'+money(riskAmt)+' 元</b></span>'+
        '<span class="chip">仓位 <b>'+(Math.floor(size*100)/100)+' 单位</b></span>'+
        '<span class="chip">保本胜率 <b>'+Math.round(be*1000)/10+'%</b></span>';
      var good=evR>0;
      verdict.innerHTML='<span class="tag" style="color:'+(good?'var(--hue-green)':'var(--hue-red)')+'">期望值 '+(evR>=0?'+':'')+f2(evR)+'R / 笔</span> · '+
        '按 '+S.winRate+'% 胜率估算，平均每笔约 <strong>'+(evR>=0?'+':'')+money(evR*riskAmt)+' 元</strong>（1R = '+money(riskAmt)+' 元）。'+
        (good? '数字为正只说明“假设成立时”值得做；胜率是估计值，样本不够时偏差很大。' : '胜率低于保本线 '+Math.round(be*1000)/10+'%，即使单笔盈亏比看着不错，长期也会亏。')+
        ' 未计手续费、滑点与跳空。';
    }
    Array.prototype.forEach.call(host.querySelectorAll('input[type=range]'), function(inp){
      inp.addEventListener('input', function(){ S[inp.dataset.k]=+inp.value; calc(); });
    });
    Array.prototype.forEach.call(host.querySelectorAll('input[type=number]'), function(inp){
      inp.addEventListener('input', function(){ var v=+inp.value; if(isFinite(v) && v>0){ S[inp.dataset.n]=Math.min(+inp.max, Math.max(+inp.min, v)); calc(); } });
    });
    var sideBtns=host.querySelectorAll('[data-el="side"] button');
    function syncSide(){ Array.prototype.forEach.call(sideBtns, function(b){ b.classList.toggle('act', b.dataset.s===S.side); b.classList.toggle('rr-on', b.dataset.s===S.side); }); }
    Array.prototype.forEach.call(sideBtns, function(b){
      b.addEventListener('click', function(){
        if(b.dataset.s===S.side) return;
        S.side=b.dataset.s;
        // 换方向：止损和目标对调到入场的另一侧，保持原来的距离
        var dS=Math.abs(S.entry-S.stop), dT=Math.abs(S.target-S.entry), long=S.side==='long';
        S.stop=Math.round((long? S.entry-dS : S.entry+dS)*10)/10; S.target=Math.round((long? S.entry+dT : S.entry-dT)*10)/10;
        host.querySelector('[data-k="stop"]').value=S.stop; host.querySelector('[data-k="target"]').value=S.target;
        syncSide(); calc();
      });
    });
    syncSide(); calc();
    if(!tc) PA.registerRedraw(calc);
    return { redraw:calc };
  };

  // ---------- 捏一根 K 线 ----------
  W.candleLab = function(host, opts){
    opts = opts||{};
    var A = { o:opts.o!=null?opts.o:38, h:opts.h!=null?opts.h:72, l:opts.l!=null?opts.l:28, c:opts.c!=null?opts.c:62 };
    function row(k,label){ return '<div class="sld"><label>'+label+'</label><input type="range" data-k="'+k+'" min="20" max="80" step="1" value="'+A[k]+'"><span class="v" data-v="'+k+'"></span></div>'; }
    host.innerHTML =
      '<div class="card pad"><div class="lab">'+
        '<div class="chartbox"><svg viewBox="0 0 300 340" role="img" aria-label="可调节 K 线"></svg></div>'+
        '<div class="controls">'+row("o","开盘")+row("h","最高")+row("l","最低")+row("c","收盘")+'<div class="readout" data-el="read"></div></div>'+
      '</div><div class="verdict" data-el="verdict"></div></div>';
    var svg=host.querySelector("svg");
    function q(k){ return host.querySelector('[data-k="'+k+'"]'); }
    function draw(){
      A.o=+q("o").value; A.h=+q("h").value; A.l=+q("l").value; A.c=+q("c").value;
      var mx=Math.max(A.o,A.c), mn=Math.min(A.o,A.c);
      if(A.h<mx){A.h=mx; q("h").value=A.h;} if(A.l>mn){A.l=mn; q("l").value=A.l;}
      ["o","h","l","c"].forEach(function(k){ host.querySelector('[data-v="'+k+'"]').textContent=A[k]; });
      PA.drawCandle(svg, A.o,A.h,A.l,A.c, {lo:15,hi:85,padY:26,bw:70});
      var body=Math.abs(A.c-A.o), up=A.c>A.o, flat=A.c===A.o, uw=A.h-Math.max(A.o,A.c), lw=Math.min(A.o,A.c)-A.l;
      host.querySelector('[data-el="read"]').innerHTML=chip("实体","<b>"+body+"</b>")+chip("上影","<b>"+uw+"</b>")+chip("下影","<b>"+lw+"</b>");
      var col=flat?PA.cssv("--ink-soft"):(up?PA.upColor():PA.downColor()), word=flat?"平（十字星）":(up?"涨":"跌"), msg;
      if(flat) msg="开盘和收盘几乎一样，买卖双方<strong>势均力敌</strong>——这叫十字星，常出现在方向不明的时候。";
      else if(up) msg="收盘（"+A.c+"）比开盘（"+A.o+"）<strong>高</strong>，这段时间是<strong>涨</strong>的，买方占上风。"+(body>=30?"实体很长，涨得很坚决。":(body<=8?"但实体很短，涨得并不坚决。":""));
      else msg="收盘（"+A.c+"）比开盘（"+A.o+"）<strong>低</strong>，这段时间是<strong>跌</strong>的，卖方占上风。"+(body>=30?"实体很长，跌得很凶。":(body<=8?"但实体很短，跌得并不坚决。":""));
      host.querySelector('[data-el="verdict"]').innerHTML='<span class="tag" style="color:'+col+'">结论：这段时间 '+word+'</span> · '+msg;
    }
    Array.prototype.forEach.call(host.querySelectorAll('input[type=range]'), function(inp){ inp.addEventListener("input", draw); });
    draw(); PA.registerRedraw(draw);
    return { redraw: draw };
  };

  // ---------- 高亮实体/影线 ----------
  W.partHighlighter = function(host, opts){
    opts = opts||{};
    var d = opts.candle || {o:35,h:78,l:22,c:60};
    var info = opts.info || {
      body:{hl:"bodyLabel", t:"实体 = 开盘到收盘之间", d:"这是价格<strong>真正净移动</strong>的部分。实体越长，赢的一方越强势；越短，双方越胶着。"},
      upper:{hl:"upper", t:"上影线 = 最高点到实体顶", d:"价格<strong>曾冲到这么高</strong>，但被卖方压了回来。上影线越长，上方抛压越明显。"},
      lower:{hl:"lower", t:"下影线 = 实体底到最低点", d:"价格<strong>曾砸到这么低</strong>，但被买方接了回来。下影线越长，下方承接越强。"}
    };
    host.innerHTML =
      '<div class="card pad"><div class="lab">'+
        '<div class="chartbox"><svg viewBox="0 0 300 340"></svg></div>'+
        '<div><div class="parts" data-el="btns"><button data-p="body" class="on">实体（开→收）</button><button data-p="upper">上影线</button><button data-p="lower">下影线</button></div>'+
        '<div class="verdict" data-el="desc" style="margin-top:16px"></div></div>'+
      '</div></div>';
    var svg=host.querySelector("svg"), cur="body";
    function draw(which){ cur=which||cur;
      PA.drawCandle(svg, d.o,d.h,d.l,d.c, {lo:15,hi:85,padY:26,bw:70, hl:info[cur].hl});
      host.querySelector('[data-el="desc"]').innerHTML='<span class="tag" style="color:var(--accent-ink)">'+info[cur].t+'</span><br>'+info[cur].d;
      Array.prototype.forEach.call(host.querySelectorAll('[data-el="btns"] button'), function(b){ b.classList.toggle("on", b.dataset.p===cur); });
    }
    Array.prototype.forEach.call(host.querySelectorAll('[data-el="btns"] button'), function(b){ b.addEventListener("click", function(){ draw(b.dataset.p); }); });
    draw("body"); PA.registerRedraw(function(){ draw(cur); });
    return { redraw: function(){ draw(cur); } };
  };

  // ---------- 单选题（任选反复点，逐项讲对错，带重做） ----------
  // opts: { q, options:[{t, ok, why?}], explain? }
  W.quizChoice = function(host, opts){
    opts = opts||{};
    var options = (opts.shuffle===false) ? opts.options : shuffled(opts.options);
    host.innerHTML =
      '<div class="card pad"><p class="qtext" style="margin-top:0">'+opts.q+'</p>'+
        '<div class="optlist" data-el="opts">'+options.map(function(o,i){ return '<button data-ok="'+(o.ok?1:0)+'" data-i="'+i+'"><span class="opt-key">'+String.fromCharCode(65+i)+'</span><span class="opt-t">'+o.t+'</span></button>'; }).join("")+'</div>'+
        '<div class="fb" data-el="fb"></div>'+
        '<div class="quiz-foot"><button class="btn ghost mini" data-act="reset" type="button" style="display:none">重做</button></div></div>';
    var btns=host.querySelectorAll('[data-el="opts"] button'), fb=host.querySelector('[data-el="fb"]'), reset=host.querySelector('[data-act="reset"]');
    function clearMarks(){ Array.prototype.forEach.call(btns, function(b){ b.classList.remove("correct","wrong"); }); }
    Array.prototype.forEach.call(btns, function(btn){
      btn.addEventListener("click", function(){
        clearMarks();
        var ok=btn.dataset.ok==="1", why=(options[+btn.dataset.i]||{}).why;
        btn.classList.add(ok?"correct":"wrong");
        fb.className="fb show "+(ok?"ok":"no");
        fb.innerHTML='<span class="fb-tag">'+(ok?"✓ 答对了":"✗ 再想想")+'</span><span class="fb-body">'+(why||opts.explain||"")+(ok?"":"（换一个选项再看看）")+'</span>';
        reset.style.display="";
      });
    });
    reset.addEventListener("click", function(){ clearMarks(); fb.className="fb"; fb.innerHTML=""; reset.style.display="none"; });
  };

  // ---------- 从几根 K 线里选（任选反复点，逐项讲对错，带重做） ----------
  // opts: { q, candles:[{ohlc:[o,h,l,c], cap, ok, why?}], explain? }
  W.quizCandleGrid = function(host, opts){
    opts = opts||{};
    var candles = (opts.shuffle===false) ? opts.candles : shuffled(opts.candles);
    host.innerHTML =
      '<div class="card pad"><p class="qtext" style="margin-top:0">'+opts.q+'</p><div class="qgrid" data-el="grid"></div>'+
        '<div class="fb" data-el="fb"></div>'+
        '<div class="quiz-foot"><button class="btn ghost mini" data-act="reset" type="button" style="display:none">重做</button></div></div>';
    var grid=host.querySelector('[data-el="grid"]'), fb=host.querySelector('[data-el="fb"]'), reset=host.querySelector('[data-act="reset"]');
    grid.innerHTML = candles.map(function(c,i){ return '<div class="qopt" data-i="'+i+'" data-ok="'+(c.ok?1:0)+'"><svg viewBox="0 0 90 150" style="height:120px"></svg><div class="cap">'+c.cap+'</div><span class="mark"></span></div>'; }).join("");
    var opsEls = grid.querySelectorAll(".qopt");
    function drawThumbs(){ Array.prototype.forEach.call(opsEls, function(opt){ var c=candles[+opt.dataset.i].ohlc; PA.drawCandle(opt.querySelector("svg"), c[0],c[1],c[2],c[3], {lo:15,hi:85,padY:16,bw:34}); }); }
    function clearMarks(){ Array.prototype.forEach.call(opsEls, function(o){ o.classList.remove("correct","wrong"); o.querySelector(".mark").textContent=""; }); }
    Array.prototype.forEach.call(opsEls, function(opt){
      opt.addEventListener("click", function(){
        clearMarks();
        var ok=opt.dataset.ok==="1", why=(candles[+opt.dataset.i]||{}).why;
        opt.classList.add(ok?"correct":"wrong");
        opt.querySelector(".mark").textContent = ok?"✓":"✕";
        fb.className="fb show "+(ok?"ok":"no");
        fb.innerHTML=(ok?"✓ 对了！":"✗ 这个不对。")+" "+(why||opts.explain||"")+(ok?"":" 换一个再看看。");
        reset.style.display="";
      });
    });
    reset.addEventListener("click", function(){ clearMarks(); fb.className="fb"; fb.innerHTML=""; reset.style.display="none"; });
    drawThumbs(); PA.registerRedraw(drawThumbs);
    return { redraw: drawThumbs };
  };

  // ---------- 填空 ----------
  // opts: { prompt?, parts:[ "文字" | {a:[可接受答案], w?} ], okText?, noText?, revealText? }
  W.fillBlank = function(host, opts){
    opts = opts||{};
    var idx=0, ans=[];
    var inner = opts.parts.map(function(p){
      if(typeof p==="string") return '<span>'+p+'</span>';
      var id="b"+(idx++); ans.push({id:id, a:p.a});
      return '<input type="text" data-b="'+id+'" aria-label="填空" placeholder="? ?"'+(p.w?(' style="width:'+p.w+'px"'):'')+'>';
    }).join(" ");
    host.innerHTML =
      '<div class="card pad">'+(opts.prompt?('<p class="qtext" style="margin-top:0">'+opts.prompt+'</p>'):'')+
        '<div class="blank">'+inner+'</div>'+
        '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-act="check">检查答案</button><button class="btn ghost" data-act="reveal">显示答案</button></div>'+
        '<div class="fb" data-el="fb"></div></div>';
    function norm(s){ return (s||"").trim().replace(/\s+/g,"").replace(/价$/,"").replace(/[。，,、]/g,""); }
    var fb=host.querySelector('[data-el="fb"]');
    function run(reveal){
      var allok=true;
      ans.forEach(function(a){
        var el=host.querySelector('[data-b="'+a.id+'"]');
        if(reveal){ el.value=a.a[0]; el.classList.remove("bad"); el.classList.add("good"); return; }
        var ok=a.a.some(function(x){ return norm(x)===norm(el.value); });
        el.classList.toggle("good",ok); el.classList.toggle("bad",!ok); if(!ok) allok=false;
      });
      if(reveal){ fb.className="fb show ok"; fb.innerHTML=opts.revealText||"答案已填入。"; return; }
      fb.className="fb show "+(allok?"ok":"no");
      fb.innerHTML=allok?(opts.okText||"✓ 全对！"):(opts.noText||"有几个还不对（标红的框），改完再点一次检查。");
    }
    host.querySelector('[data-act="check"]').addEventListener("click", function(){ run(false); });
    host.querySelector('[data-act="reveal"]').addEventListener("click", function(){ run(true); });
  };

  // ---------- 形态图鉴：点一个看一个 ----------
  // opts: { items:[ { name, tag?, bars:[[o,h,l,c],...], desc } ] }
  W.patternGallery = function(host, opts){
    opts = opts||{};
    var items = opts.items||[];
    host.innerHTML =
      '<div class="card pad"><div class="gallery">'+
        '<div class="gal-list" data-el="list">'+items.map(function(it,i){ return '<button class="gal-thumb'+(i===0?' on':'')+'" data-i="'+i+'" type="button"><svg viewBox="0 0 120 96"></svg><span>'+it.name+'</span></button>'; }).join("")+'</div>'+
        '<div class="gal-view">'+
          '<div class="chartbox"><div data-el="tc"></div></div>'+
          '<div class="gal-info"><div class="gal-name" data-el="name"></div><span class="gal-tag" data-el="tag"></span><p class="gal-desc" data-el="desc"></p></div>'+
        '</div>'+
      '</div></div>';
    var cur=0;
    // 缩略图保留示意性的“教学 K 线”；大图用真实盘面外观 + 拟真细化数据
    var k=PA.denseK(items, opts.dense), keep=PA.keepBars(items);
    var tc=PA.teachChart && PA.teachChart(host.querySelector('[data-el="tc"]'), { height:opts.height||270, volume:false });
    var big=null;
    if(!tc){ host.querySelector('[data-el="tc"]').outerHTML='<svg data-el="big" viewBox="0 0 360 250"></svg>'; big=host.querySelector('[data-el="big"]'); }
    function drawThumbs(){ Array.prototype.forEach.call(host.querySelectorAll(".gal-thumb"), function(b){ miniSeries(b.querySelector("svg"), items[+b.dataset.i].bars, {padY:10, maxBw:13}); }); }
    function show(i){ cur=i; var it=items[i];
      if(tc) tc.show({ bars:it.bars, annotations:it.annotations }, k, keep); else miniSeries(big, it.bars, {padY:24, maxBw:30});
      host.querySelector('[data-el="name"]').textContent=it.name;
      var tagEl=host.querySelector('[data-el="tag"]'); tagEl.textContent=it.tag||""; tagEl.style.display=it.tag?"inline-block":"none";
      host.querySelector('[data-el="desc"]').innerHTML=it.desc||"";
      Array.prototype.forEach.call(host.querySelectorAll(".gal-thumb"), function(b){ b.classList.toggle("on", +b.dataset.i===i); });
    }
    Array.prototype.forEach.call(host.querySelectorAll(".gal-thumb"), function(b){ b.addEventListener("click", function(){ show(+b.dataset.i); }); });
    function redraw(){ drawThumbs(); if(!tc) show(cur); }
    drawThumbs(); show(0); PA.registerRedraw(redraw);
    return { redraw: redraw };
  };
})();
