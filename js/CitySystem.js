(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;

  // ── NPC 紋理 ────────────────────────────────────────────────────────────────
  var _npcTexCache = {};
  function _npcTex(type) {
    if (_npcTexCache[type]) return _npcTexCache[type];
    var PALS = {
      chief:      { body:'#1a3a8c', hair:'#888880', skin:'#e8c48a', acc:'#FFD700' },
      merchant:   { body:'#5a3010', hair:'#3a2808', skin:'#e0b870', acc:'#CC4400' },
      blacksmith: { body:'#2a2a2a', hair:'#111118', skin:'#c8903c', acc:'#886622' },
      alchemist:  { body:'#1a4a1a', hair:'#2a5a1a', skin:'#d8c880', acc:'#44AA66' },
    };
    var cv  = document.createElement('canvas'); cv.width=16; cv.height=24;
    var c   = cv.getContext('2d');
    var pal = PALS[type] || PALS.chief;
    c.fillStyle='#333';      c.fillRect(4,17,3,7); c.fillRect(9,17,3,7);
    c.fillStyle=pal.body;    c.fillRect(3,9,10,9);
    c.fillStyle=pal.skin;    c.fillRect(4,3,8,8);
    c.fillStyle=pal.hair;    c.fillRect(3,2,10,3); c.fillRect(3,3,2,6); c.fillRect(11,3,2,5);
    c.fillStyle='#111';      c.fillRect(6,6,1,1);  c.fillRect(9,6,1,1);
    c.fillStyle=pal.body;    c.fillRect(1,9,2,7);  c.fillRect(13,9,2,7);
    if (type==='merchant')   { c.fillStyle=pal.acc; c.fillRect(2,1,12,3); c.fillRect(4,-1,8,3); }
    if (type==='blacksmith') { c.fillStyle=pal.acc; c.fillRect(3,12,10,7); }
    if (type==='alchemist')  { c.fillStyle=pal.acc; c.fillRect(5,0,6,4);  c.fillRect(3,3,10,2); }
    if (type==='chief')      { c.fillStyle=pal.acc; c.fillRect(5,0,6,3);  c.fillRect(4,2,8,2); }
    var tex = PIXI.Texture.from(cv);
    tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    _npcTexCache[type] = tex;
    return tex;
  }

  // ── 任務可用性 ──────────────────────────────────────────────────────────────
  function _questAvail(qid) {
    if (!G.quests || !G.QuestDatabase) return false;
    if (G.quests._completed && G.quests._completed[qid]) return false;
    if (G.quests._active    && G.quests._active[qid])    return false;
    var all = G.QuestDatabase.all();
    for (var i = 0; i < all.length; i++) {
      if (all[i].next === qid) return !!(G.quests._completed && G.quests._completed[all[i].id]);
    }
    return true;
  }

  // ── 建築繪製（大型、按風格） ───────────────────────────────────────────────
  function _drawBuilding(g, w, h, wallClr, style) {
    // 陰影
    g.beginFill(0x000000, 0.22).drawEllipse(0, 6, w*0.50, h*0.16).endFill();
    // 主牆
    g.beginFill(wallClr).drawRect(-w/2, -h, w, h).endFill();
    // 右側陰影（立體感）
    g.beginFill(0x000000, 0.12).drawRect(w/5, -h, w*0.30, h).endFill();
    // 底座線
    g.lineStyle(2, Math.max(0, wallClr - 0x181818), 0.5);
    g.moveTo(-w/2, 0); g.lineTo(w/2, 0);
    g.lineStyle(0);

    // 視窗（依寬度決定數量）
    var winClr = style==='snow'   ? 0xAADDFF :
                 style==='lava'   ? 0xFF9900 :
                 style==='void'   ? 0xCC44FF :
                 style==='desert' ? 0xFFDD88 : 0xFFDD88;
    if (w >= 100) {
      var wx1=-w*0.26, wx2=w*0.26, wy=-h*0.62;
      var ww=Math.max(10,Math.floor(w*0.14)), wh=Math.max(12,Math.floor(h*0.18));
      // 左窗
      g.beginFill(0x000000,0.50).drawRect(wx1-ww/2-1,wy-1,ww+2,wh+2).endFill();
      g.beginFill(winClr,0.80).drawRect(wx1-ww/2,wy,ww,wh).endFill();
      g.beginFill(0xFFFFFF,0.22).drawRect(wx1-ww/2,wy,2,wh).endFill();
      // 右窗
      g.beginFill(0x000000,0.50).drawRect(wx2-ww/2-1,wy-1,ww+2,wh+2).endFill();
      g.beginFill(winClr,0.80).drawRect(wx2-ww/2,wy,ww,wh).endFill();
      g.beginFill(0xFFFFFF,0.22).drawRect(wx2-ww/2,wy,2,wh).endFill();
    }
    if (w >= 155) {
      // 大型建築加中央圓窗
      var cwx=-h*0.38, cww=Math.floor(w*0.12);
      g.beginFill(winClr,0.55).drawEllipse(0,-h*0.38,cww,cww*0.75).endFill();
      g.lineStyle(2,winClr,0.4).drawEllipse(0,-h*0.38,cww,cww*0.75); g.lineStyle(0);
    }

    // 門洞
    var dw=Math.max(16,Math.floor(w*0.14)), dh=Math.max(20,Math.floor(h*0.30));
    g.beginFill(0x000000,0.70).drawRect(-dw/2,-dh,dw,dh).endFill();
    g.beginFill(0x000000,0.30).drawEllipse(0,-dh,dw*0.55,dh*0.35).endFill();
    // 門框
    g.lineStyle(2,Math.min(0xFFFFFF,wallClr+0x404040),0.55);
    g.drawRect(-dw/2,-dh,dw,dh); g.lineStyle(0);

    // 屋頂（依風格）
    var roofClr=Math.min(0xFFFFFF,wallClr+0x404040);
    var rh=Math.floor(h*0.42);

    if (style==='snow') {
      g.beginFill(roofClr).drawPolygon([0,-h-rh,-w/2-5,-h+3,w/2+5,-h+3]).endFill();
      g.beginFill(0xDDEEFF,0.75).drawPolygon([0,-h-rh,-w/3,-h-rh*0.38,w/3,-h-rh*0.38]).endFill();
      // 冰柱
      for (var ii=0;ii<Math.floor(w/14);ii++) {
        var ix=-w/2+8+ii*14;
        g.beginFill(0xBBDDFF,0.65).drawPolygon([ix,-h+4,ix-3,-h+16,ix+3,-h+16,ix,-h+22]).endFill();
      }
    } else if (style==='lava') {
      g.beginFill(roofClr).drawPolygon([0,-h-rh,-w/2-5,-h+3,w/2+5,-h+3]).endFill();
      g.lineStyle(2,0xFF4400,0.65);
      g.moveTo(-w/3,-h-rh*0.3); g.lineTo(-w/2-5,-h+3);
      g.moveTo(w/3,-h-rh*0.3);  g.lineTo(w/2+5,-h+3);
      g.lineStyle(0);
      g.beginFill(0xFF4400,0.20).drawEllipse(0,-h-rh*0.5,w*0.5,rh*0.45).endFill();
    } else if (style==='void') {
      g.beginFill(roofClr).drawRect(-w/2-3,-h-8,w+6,10).endFill();
      // 中央水晶尖塔
      g.beginFill(0x7711CC).drawPolygon([0,-h-rh,-8,-h-8,8,-h-8]).endFill();
      g.beginFill(0xCC44FF,0.55).drawPolygon([0,-h-rh-4,-4,-h-rh+8,4,-h-rh+8]).endFill();
      if (w>=140) {
        g.beginFill(0x5511AA).drawPolygon([-w/3.2,-h-rh*0.55,-w/3.2-5,-h-8,-w/3.2+5,-h-8]).endFill();
        g.beginFill(0x5511AA).drawPolygon([w/3.2,-h-rh*0.55,w/3.2-5,-h-8,w/3.2+5,-h-8]).endFill();
      }
      g.beginFill(0x8833FF,0.13).drawEllipse(0,-h-rh*0.5,w*0.7,rh*0.6).endFill();
    } else if (style==='desert') {
      g.beginFill(roofClr).drawRect(-w/2-3,-h-10,w+6,12).endFill();
      var nb2=Math.floor(w/18); var bsX=-w/2+4;
      for (var di=0;di<nb2;di++) {
        if (di%2===0) g.beginFill(roofClr).drawRect(bsX+di*(w/nb2),-h-18,w/nb2-4,10).endFill();
      }
    } else {
      // forest / grass — 標準尖頂
      g.beginFill(roofClr).drawPolygon([0,-h-rh,-w/2-5,-h+3,w/2+5,-h+3]).endFill();
      g.lineStyle(2,Math.max(0,roofClr-0x202020),0.55);
      g.moveTo(-w/2-5,-h+3); g.lineTo(0,-h-rh); g.lineTo(w/2+5,-h+3);
      g.lineStyle(0);
    }
  }

  // ── 角塔 ────────────────────────────────────────────────────────────────────
  function _drawTower(g, cx, cy, ts, fillClr, outClr) {
    g.beginFill(fillClr,0.95).drawRect(cx-ts,cy-ts,ts*2,ts*2).endFill();
    g.lineStyle(2,outClr,0.6).drawRect(cx-ts,cy-ts,ts*2,ts*2); g.lineStyle(0);
    // 塔垛
    for (var tp=0;tp<4;tp++) {
      if (tp%2===0) g.beginFill(fillClr,0.9).drawRect(cx-ts+tp*(ts/2),cy-ts-8,ts/2-2,8).endFill();
    }
  }

  // ── 城牆 ────────────────────────────────────────────────────────────────────
  function _drawWalls(g, R, wallClr, style) {
    var rx=R*SCALE, ry=R*SCALE*ISO_Z, wt=7;
    var dimClr=Math.max(0,wallClr-0x101010);

    // 極淡內部填充
    g.beginFill(wallClr,0.05).drawRect(-rx,-ry,rx*2,ry*2).endFill();

    // 四段牆壁
    g.beginFill(wallClr,0.88).drawRect(-rx,-ry-wt,rx*2,wt).endFill();       // 北
    g.beginFill(wallClr,0.88).drawRect(-rx,ry,rx-44,wt).endFill();           // 南左
    g.beginFill(wallClr,0.88).drawRect(44,ry,rx-44,wt).endFill();            // 南右
    g.beginFill(wallClr,0.88).drawRect(-rx-wt,-ry,wt,ry*2+wt).endFill();    // 西
    g.beginFill(wallClr,0.88).drawRect(rx,-ry,wt,ry*2+wt).endFill();        // 東

    // 北側塔垛
    var bw=12,bh=9,bgap=18;
    var nb=Math.floor(rx*2/(bw+bgap));
    var bsx=-Math.floor(nb/2)*(bw+bgap);
    for (var bi=0;bi<nb;bi++) {
      g.beginFill(wallClr,0.9).drawRect(bsx+bi*(bw+bgap)-bw/2,-ry-wt-bh,bw,bh).endFill();
    }
    // 南側塔垛（跳過城門）
    for (var bj=0;bj<nb;bj++) {
      var bxj=bsx+bj*(bw+bgap);
      if (Math.abs(bxj)<48) continue;
      g.beginFill(wallClr,0.9).drawRect(bxj-bw/2,ry+wt,bw,bh).endFill();
    }
    // 東西側塔垛
    var nbSide=Math.floor(ry*2/(bw+bgap));
    var bsyS=-Math.floor(nbSide/2)*(bw+bgap);
    for (var bk=0;bk<nbSide;bk++) {
      var byk=bsyS+bk*(bw+bgap);
      g.beginFill(wallClr,0.9).drawRect(-rx-wt-bh,byk-bw/2,bh,bw).endFill();
      g.beginFill(wallClr,0.9).drawRect(rx+wt,byk-bw/2,bh,bw).endFill();
    }

    // 四角塔
    var ts=17, tClr=Math.min(0xFFFFFF,wallClr+0x181818);
    _drawTower(g,-rx,-ry,ts,tClr,wallClr);
    _drawTower(g, rx,-ry,ts,tClr,wallClr);
    _drawTower(g, rx, ry,ts,tClr,wallClr);
    _drawTower(g,-rx, ry,ts,tClr,wallClr);

    // 城門柱
    var pClr=Math.max(0,wallClr-0x282828);
    g.beginFill(pClr).drawRect(-48,ry-22,11,26+wt).endFill();
    g.beginFill(pClr).drawRect(37,ry-22,11,26+wt).endFill();
    // 城門拱
    g.lineStyle(4,pClr,0.9);
    g.moveTo(-48,ry); g.lineTo(-48,ry-22); g.bezierCurveTo(-48,ry-36,48,ry-36,48,ry-22); g.lineTo(48,ry);
    g.lineStyle(0);

    // 風格特殊裝飾
    if (style==='void') {
      g.lineStyle(3,0x8822CC,0.25).drawRect(-rx,-ry,rx*2,ry*2); g.lineStyle(0);
    }
    if (style==='lava') {
      g.lineStyle(2,0xFF3300,0.20);
      g.moveTo(-rx,-ry); g.lineTo(-rx+rx*0.4,ry);
      g.moveTo(rx*0.2,-ry); g.lineTo(0,ry);
      g.lineStyle(0);
    }
  }

  // ── 路道 ────────────────────────────────────────────────────────────────────
  function _drawPaths(g, style, R) {
    var sc=R*SCALE, sy=R*SCALE*ISO_Z;
    var pc=style==='snow'   ? 0x8899AA :
           style==='desert' ? 0xBB9944 :
           style==='lava'   ? 0x442211 :
           style==='void'   ? 0x221133 : 0x7A7060;
    g.beginFill(pc,0.42).drawRect(-22,-sy,44,sy*2).endFill();
    g.beginFill(pc,0.42).drawRect(-sc,-14,sc*2,28).endFill();
    g.lineStyle(1,pc,0.50);
    g.drawRect(-22,-sy,44,sy*2);
    g.drawRect(-sc,-14,sc*2,28);
    g.lineStyle(0);
  }

  // ── 裝飾物 ──────────────────────────────────────────────────────────────────
  function _drawDecos(g, style, R) {
    var lc=style==='snow'   ? 0xAADDFF :
           style==='lava'   ? 0xFF6600 :
           style==='void'   ? 0xAA44FF :
           style==='desert' ? 0xFFBB44 : 0xFFDD88;
    var pts=[[-7,-8],[7,-8],[-14,0],[14,0],[-7,6],[7,6]];
    for (var i=0;i<pts.length;i++) {
      var sx=pts[i][0]*SCALE, sy=pts[i][1]*SCALE*ISO_Z;
      _oneDeco(g,sx,sy,style,lc,i);
    }
  }

  function _oneDeco(g,sx,sy,style,lc,idx) {
    var isEven=(idx%2===0);
    if (style==='forest'||style==='grass') {
      if (isEven) {
        g.beginFill(0x2A1508).drawRect(sx-3,sy-5,6,20).endFill();
        g.beginFill(0x1A6010,0.95).drawEllipse(sx,sy-16,17,12).endFill();
        g.beginFill(0x22801A,0.70).drawEllipse(sx,sy-26,11,8).endFill();
      } else {
        g.beginFill(0x302820).drawRect(sx-2,sy-24,4,24).endFill();
        g.beginFill(0x101008,0.75).drawRect(sx-7,sy-28,14,7).endFill();
        g.beginFill(lc,0.90).drawRect(sx-6,sy-27,12,6).endFill();
        g.beginFill(lc,0.18).drawEllipse(sx,sy-24,18,13).endFill();
      }
    } else if (style==='snow') {
      if (isEven) {
        g.beginFill(0x2A1508).drawRect(sx-2,sy-4,4,18).endFill();
        g.beginFill(0x1A5010,0.65).drawPolygon([sx,sy-28,sx-10,sy-4,sx+10,sy-4]).endFill();
        g.beginFill(0xDDEEFF,0.70).drawPolygon([sx,sy-28,sx-6,sy-14,sx+6,sy-14]).endFill();
      } else {
        g.beginFill(0x506070).drawRect(sx-2,sy-24,4,24).endFill();
        g.beginFill(0x8899AA,0.85).drawRect(sx-6,sy-28,12,7).endFill();
        g.beginFill(0xAADDFF,0.95).drawRect(sx-5,sy-27,10,6).endFill();
        g.beginFill(0xCCEEFF,0.20).drawEllipse(sx,sy-24,18,13).endFill();
      }
    } else if (style==='desert') {
      if (isEven) {
        g.beginFill(0x2A6010).drawRect(sx-3,sy-26,6,28).endFill();
        g.beginFill(0x2A6010).drawRect(sx-13,sy-16,12,5).endFill();
        g.beginFill(0x2A6010).drawRect(sx+1,sy-19,12,5).endFill();
      } else {
        g.beginFill(0xAA7744).drawEllipse(sx,sy-8,11,9).endFill();
        g.beginFill(0xCC9955).drawRect(sx-9,sy-13,18,5).endFill();
      }
    } else if (style==='lava') {
      if (isEven) {
        g.beginFill(0x221108).drawRect(sx-4,sy-10,8,14).endFill();
        g.beginFill(0xFF4400,0.75).drawEllipse(sx,sy-12,8,10).endFill();
        g.beginFill(0xFF8800,0.55).drawEllipse(sx,sy-16,5,7).endFill();
        g.beginFill(0xFFCC00,0.35).drawEllipse(sx,sy-20,3,5).endFill();
      } else {
        g.beginFill(0x221108).drawRect(sx-2,sy-24,4,24).endFill();
        g.beginFill(0x441100,0.85).drawRect(sx-7,sy-28,14,7).endFill();
        g.beginFill(0xFF6600,0.95).drawRect(sx-6,sy-27,12,6).endFill();
        g.beginFill(0xFF4400,0.20).drawEllipse(sx,sy-24,18,13).endFill();
      }
    } else { // void
      if (isEven) {
        g.beginFill(0x440088,0.90).drawPolygon([sx,sy-26,sx-8,sy-5,sx+8,sy-5]).endFill();
        g.beginFill(0x8822CC,0.65).drawPolygon([sx,sy-30,sx-4,sy-10,sx+4,sy-10]).endFill();
        g.lineStyle(1,0xCC44FF,0.50).drawEllipse(sx,sy-17,10,7); g.lineStyle(0);
      } else {
        g.beginFill(0x220033).drawRect(sx-2,sy-24,4,20).endFill();
        g.beginFill(0x330055,0.80).drawRect(sx-7,sy-30,14,8).endFill();
        g.beginFill(0xAA44FF,0.90).drawRect(sx-6,sy-29,12,7).endFill();
        g.beginFill(0x8833FF,0.22).drawEllipse(sx,sy-25,20,14).endFill();
      }
    }
  }

  // ── 城市 NPC ────────────────────────────────────────────────────────────────
  function CityNPC(cfg, wx, wz) {
    this.id     = cfg.id;
    this.name   = cfg.name;
    this.type   = cfg.type || 'chief';
    this.x      = wx; this.z = wz;
    this.shopId = cfg.shopId    || null;
    this.quests = cfg.quests    || [];
    this.inn    = cfg.inn       || false;
    this.craftable=cfg.craftable|| false;
    this.dialog = cfg.dialog    || '你好，冒險者！';
    this._t     = Math.random() * Math.PI * 2;

    var spr=new PIXI.Sprite(_npcTex(this.type));
    spr.anchor.set(0.5,1.0); spr.scale.set(3,3);
    this._spr=spr;

    var nm=new PIXI.Text(this.name,{
      fontSize:10,fill:0xFFEEBB,
      dropShadow:true,dropShadowDistance:1,dropShadowColor:0x000000,
    });
    nm.anchor.set(0.5,1); nm.y=-spr.height-2; this._nm=nm;

    this._mk=null;
    if (this.quests.length>0) {
      var mk=new PIXI.Text('❗',{fontSize:14});
      mk.anchor.set(0.5,1); this._mk=mk;
    }
    this.cont=new PIXI.Container();
    if (this._mk) this.cont.addChild(this._mk);
    this.cont.addChild(spr); this.cont.addChild(nm);
  }

  CityNPC.prototype.update=function(dt,cam){
    this._t+=dt*1.2;
    this._spr.y=Math.sin(this._t)*2;
    if (this._mk) {
      var hasQ=false;
      for (var i=0;i<this.quests.length;i++) { if (_questAvail(this.quests[i])){hasQ=true;break;} }
      this._mk.visible=hasQ;
      this._mk.y=-this._spr.height-18+Math.sin(this._t*2.2)*2;
    }
    this.cont.x=W/2+(this.x-cam.x)*SCALE;
    this.cont.y=H/2+(this.z-cam.z)*SCALE*ISO_Z;
  };

  CityNPC.prototype.isNear=function(px,pz){
    var dx=this.x-px,dz=this.z-pz; return dx*dx+dz*dz<3.5*3.5;
  };

  CityNPC.prototype.interact=function(tutorial){
    var opts=[],self=this;
    if (G.quests&&G.QuestDatabase) {
      for (var i=0;i<this.quests.length;i++) {
        var qid=this.quests[i], q=G.QuestDatabase.get(qid);
        if (!q) continue;
        if (G.quests._completed&&G.quests._completed[qid]) opts.push({label:'✅ '+q.title+'（已完成）',action:'noop'});
        else if (G.quests._active&&G.quests._active[qid])  opts.push({label:'📋 '+q.title+'（進行中）',action:'quests'});
        else if (_questAvail(qid)) opts.push({label:'❗ 接受委託：'+q.title,action:'offer:'+qid});
      }
    }
    if (this.shopId)    opts.push({label:'🛒 瀏覽商品',          action:'shop'});
    if (this.craftable) opts.push({label:'⚒ 製作工坊',          action:'craft'});
    if (this.inn)       opts.push({label:'🛏 休息（恢復HP/MP）', action:'inn'});
    opts.push({label:'告辭',action:'close'});

    var box=document.getElementById('dialog-box');
    var nameEl=document.getElementById('dialog-name');
    var textEl=document.getElementById('dialog-text');
    var optsEl=document.getElementById('dialog-opts');
    if (!box) return;
    nameEl.textContent=this.name; textEl.textContent=this.dialog; optsEl.innerHTML='';
    opts.forEach(function(opt){
      var btn=document.createElement('button'); btn.className='dlg-btn'; btn.textContent=opt.label;
      btn.addEventListener('click',function(){
        if (opt.action==='noop') return;
        if (opt.action==='close'){box.style.display='none';G._checkUiOpen();return;}
        if (opt.action==='shop'){box.style.display='none';G._checkUiOpen();if(G.shop)G.shop.open(self.shopId);return;}
        if (opt.action==='craft'){box.style.display='none';G._checkUiOpen();if(G.craft)G.craft.show();return;}
        if (opt.action==='quests'){box.style.display='none';G._checkUiOpen();if(G.quests)G.quests.showPanel();return;}
        if (opt.action==='inn'){
          var pl=G._player; if(pl){pl.hp=pl.maxHp;pl.mp=pl.maxMp;}
          G.Events.emit('showNotif',{msg:'🛏 休息完畢！HP/MP 已完全恢復',clr:'#88FF88'});
          box.style.display='none'; G._checkUiOpen(); return;
        }
        if (opt.action.indexOf('offer:')===0){
          var qid2=opt.action.slice(6); box.style.display='none'; G._checkUiOpen();
          if (G.quests) G.quests.offerQuest(qid2,self.name); return;
        }
      });
      optsEl.appendChild(btn);
    });
    box.style.display='flex'; G._uiOpen=true;
    if (tutorial) tutorial.markNPC();
  };

  // ── 城市定義（大型建築 + 明確生態風格） ──────────────────────────────────
  var CITY_DEFS = [
    {
      id:'jade_city', name:'翡翠城', biome:'F', style:'forest',
      x:0, z:-28, radius:25,
      groundClr:0x1A3A1A, wallClr:0x44AA44,
      buildings:[
        { name:'冒險公會', icon:'⚔', ox:0,  oz:-13, w:180, h:130, clr:0x1A3060,
          npc:{ id:'guild_master', name:'公會長 萊恩', type:'chief',
                dialog:'歡迎來到冒險公會！我有好幾個任務，需要你的幫忙。',
                quests:['q_slime_hunt','q_wolf_threat'] } },
        { name:'武器鋪',   icon:'🗡', ox:-9, oz:-4,  w:110, h:85,  clr:0x3A3A3A,
          npc:{ id:'weaponsmith', name:'鐵匠 格林', type:'blacksmith',
                dialog:'好武器是冒險者的命！我這有任務也有商品！',
                shopId:'weapon', craftable:true, quests:['q_iron_supply'] } },
        { name:'道具店',   icon:'🧪', ox:9,  oz:-4,  w:100, h:80,  clr:0x2A4A20,
          npc:{ id:'alchemist', name:'藥劑師 艾娃', type:'alchemist',
                dialog:'藥水、材料，我這都有！來試試任務？',
                shopId:'potion', quests:['q_gather_herbs'] } },
        { name:'旅館',     icon:'🏠', ox:-9, oz:6,   w:110, h:85,  clr:0x7A5830,
          npc:{ id:'innkeeper', name:'老闆娘 露希', type:'merchant',
                dialog:'歡迎！休息後可完全恢復 HP 和 MP！', inn:true } },
        { name:'魔法學院', icon:'✨', ox:9,  oz:6,   w:100, h:80,  clr:0x3A1060,
          npc:{ id:'mage_teacher', name:'法師 薩利亞', type:'alchemist',
                dialog:'按 K 查看技能樹，讓你的法術更上一層樓！', shopId:'general' } },
        { name:'城市大廳', icon:'🏛', ox:0,  oz:14,  w:175, h:125, clr:0x1A4050,
          npc:{ id:'mayor', name:'村長 艾爾德', type:'chief',
                dialog:'守護這片土地的重任，就交給你了！有特殊任務要委託你。',
                quests:['q_fire_boss','q_boar_menace'] } },
      ],
      respawn:{ x:0, z:-18 },
    },
    {
      id:'dawn_town', name:'晨風鎮', biome:'G', style:'grass',
      x:140, z:90, radius:20,
      groundClr:0x3A5A1A, wallClr:0x77AA33,
      buildings:[
        { name:'鎮長府',  icon:'🏡', ox:0,  oz:-10, w:165, h:118, clr:0x557733,
          npc:{ id:'dawn_elder', name:'鎮長 葛林', type:'chief',
                dialog:'歡迎來到晨風鎮！草原野獸很猖獗，你能幫個忙嗎？',
                quests:['q_boar_menace'] } },
        { name:'武器鋪',  icon:'🗡', ox:-8, oz:-2,  w:110, h:85,  clr:0x445533,
          npc:{ id:'dawn_weapons', name:'武器商 艾奧', type:'blacksmith',
                dialog:'草原武器，結實耐用，適合長途探索！', shopId:'weapon' } },
        { name:'補給站',  icon:'🧪', ox:8,  oz:-2,  w:100, h:80,  clr:0x336622,
          npc:{ id:'dawn_supply', name:'補給員 諾瓦', type:'alchemist',
                dialog:'草原探索必備物資，一應俱全！', shopId:'potion' } },
        { name:'旅館',    icon:'🏠', ox:0,  oz:8,   w:140, h:100, clr:0x6A7A3A,
          npc:{ id:'dawn_inn', name:'旅館主 布朗', type:'merchant',
                dialog:'旅途辛苦！進來休息一下吧！', inn:true } },
      ],
      respawn:{ x:140, z:100 },
    },
    {
      id:'frost_fortress', name:'冰霜堡', biome:'S', style:'snow',
      x:-165, z:-200, radius:20,
      groundClr:0x2A4A6A, wallClr:0x5599CC,
      buildings:[
        { name:'要塞司令部', icon:'🏰', ox:0,  oz:-10, w:175, h:125, clr:0x2244AA,
          npc:{ id:'commander', name:'指揮官 費沙', type:'chief',
                dialog:'冰霜堡是最後的防線！你能幫助我們研究冰晶能量嗎？',
                quests:['q_ice_crystal'] } },
        { name:'武器庫',     icon:'🗡', ox:-8, oz:-2,  w:115, h:88,  clr:0x335588,
          npc:{ id:'frost_weapons', name:'武器官 克魯', type:'blacksmith',
                dialog:'冰封之刃，讓敵人膽寒！', shopId:'weapon' } },
        { name:'魔法研究所', icon:'✨', ox:8,  oz:-2,  w:115, h:88,  clr:0x334488,
          npc:{ id:'frost_mage', name:'冰法師 賽拉', type:'alchemist',
                dialog:'冰雪魔法的奧義……你有興趣嗎？', shopId:'general', craftable:true } },
        { name:'要塞旅館',   icon:'🏠', ox:0,  oz:8,   w:130, h:96,  clr:0x4466AA,
          npc:{ id:'frost_inn', name:'旅館主 艾琳', type:'merchant',
                dialog:'外面真的很冷！進來暖和一下！', inn:true } },
      ],
      respawn:{ x:-165, z:-190 },
    },
    {
      id:'oasis_city', name:'沙漠綠洲', biome:'D', style:'desert',
      x:210, z:185, radius:20,
      groundClr:0x7A5A1A, wallClr:0xCC9933,
      buildings:[
        { name:'商隊總部', icon:'🏜', ox:0,  oz:-10, w:165, h:120, clr:0x996633,
          npc:{ id:'caravan_chief', name:'商隊長 薩赫', type:'merchant',
                dialog:'沙漠最珍貴的是情報和水！我兩樣都有！', shopId:'general' } },
        { name:'武器商鋪', icon:'🗡', ox:-8, oz:-2,  w:110, h:85,  clr:0x886622,
          npc:{ id:'oasis_weapons', name:'武器商 阿里', type:'blacksmith',
                dialog:'沙漠行者必備的利器，只為你提供！', shopId:'weapon' } },
        { name:'煉金工坊', icon:'⚗',  ox:8,  oz:-2,  w:100, h:80,  clr:0xAA8844,
          npc:{ id:'oasis_alch', name:'煉金師 拉姆', type:'alchemist',
                dialog:'沙漠草藥可以煉出最神奇的藥水！', shopId:'potion', craftable:true } },
        { name:'綠洲旅館', icon:'🏠', ox:0,  oz:8,   w:135, h:98,  clr:0xAA8833,
          npc:{ id:'oasis_inn', name:'老闆 卡里', type:'merchant',
                dialog:'椰子水配沙漠微風，絕配！', inn:true } },
      ],
      respawn:{ x:210, z:195 },
    },
    {
      id:'lava_city', name:'熔岩城', biome:'V', style:'lava',
      x:310, z:285, radius:20,
      groundClr:0x5A1A00, wallClr:0xDD3300,
      buildings:[
        { name:'鍛造大殿', icon:'⚒', ox:0,  oz:-10, w:175, h:130, clr:0x882200,
          npc:{ id:'forge_master', name:'鍛造大師 伏爾坎', type:'blacksmith',
                dialog:'火山的力量！帶來材料，我打造最強的武器！',
                quests:['q_fire_boss'], craftable:true, shopId:'weapon' } },
        { name:'精鑄鋪',   icon:'🗡', ox:-8, oz:-2,  w:115, h:88,  clr:0x772200,
          npc:{ id:'lava_weapons', name:'精鑄師 艾格尼', type:'blacksmith',
                dialog:'火焰淬煉，品質遠超凡品！', shopId:'weapon' } },
        { name:'訓練場',   icon:'⚔', ox:8,  oz:-2,  w:115, h:88,  clr:0xAA3311,
          npc:{ id:'trainer', name:'訓練官 布拉澤', type:'chief',
                dialog:'想變強？先從基礎訓練開始！', shopId:'general' } },
        { name:'火焰旅館', icon:'🏠', ox:0,  oz:8,   w:130, h:96,  clr:0x993322,
          npc:{ id:'lava_inn', name:'旅館主 艾瑪', type:'merchant',
                dialog:'熔岩旁最溫暖的地方就是這裡！', inn:true } },
      ],
      respawn:{ x:310, z:295 },
    },
    {
      id:'void_temple', name:'虛空神殿', biome:'A', style:'void',
      x:-310, z:365, radius:20,
      groundClr:0x220033, wallClr:0x6622AA,
      buildings:[
        { name:'虛空聖殿',   icon:'🌑', ox:0,  oz:-10, w:175, h:130, clr:0x330066,
          npc:{ id:'void_sage', name:'虛空聖者 塞拉弗', type:'chief',
                dialog:'你已抵達世界的盡頭……虛空的試煉，你準備好了嗎？',
                quests:['q_void_essence'] } },
        { name:'秘術武器庫', icon:'🗡', ox:-8, oz:-2,  w:115, h:88,  clr:0x4400AA,
          npc:{ id:'void_weapons', name:'秘術師 諾克斯', type:'alchemist',
                dialog:'虛空力量注入的武器，遠超凡間！', shopId:'weapon' } },
        { name:'秘術研究院', icon:'✨', ox:8,  oz:-2,  w:115, h:88,  clr:0x220044,
          npc:{ id:'void_researcher', name:'研究者 莉西亞', type:'alchemist',
                dialog:'虛空的奧秘……你也感興趣嗎？', shopId:'general', craftable:true } },
        { name:'秘境旅館',   icon:'🏠', ox:0,  oz:8,   w:130, h:96,  clr:0x440077,
          npc:{ id:'void_inn', name:'神秘旅館主 影', type:'merchant',
                dialog:'在此休息，感受虛空的寧靜……', inn:true } },
      ],
      respawn:{ x:-310, z:375 },
    },
  ];

  // ── CitySystem ─────────────────────────────────────────────────────────────
  function CitySystem(stage) {
    this._groundLyr = new PIXI.Container();
    this._bldLyr    = new PIXI.Container();
    this._npcLyr    = new PIXI.Container();
    stage.addChild(this._groundLyr);
    stage.addChild(this._bldLyr);
    stage.addChild(this._npcLyr);

    this._nearNPC   = null;
    this._curCityId = null;
    this._hintEl    = null;

    this._cities = CITY_DEFS.map(function (def) {
      var style = def.style || 'forest';

      // ── 地面 + 路道 + 裝飾 + 城牆（一個 Graphics） ──────────────────────
      var gr = new PIXI.Graphics();
      // 地面橢圓
      gr.beginFill(def.groundClr, 0.52)
        .drawEllipse(0, 0, def.radius*SCALE*1.65, def.radius*SCALE*ISO_Z*1.65)
        .endFill();
      // 路道
      _drawPaths(gr, style, def.radius * 0.86);
      // 裝飾
      _drawDecos(gr, style, def.radius);
      // 城牆
      _drawWalls(gr, def.radius * 0.87, def.wallClr, style);
      // 城市名稱標籤
      var nameT = new PIXI.Text('【 '+def.name+' 】', {
        fontSize:13, fill:0xFFEEAA, fontWeight:'bold',
        dropShadow:true, dropShadowDistance:2, dropShadowColor:0x000000,
      });
      nameT.anchor.set(0.5, 1);
      nameT.y = -(def.radius * SCALE * ISO_Z * 0.87) - 20;
      gr.addChild(nameT);
      this._groundLyr.addChild(gr);

      // ── 建築容器 ─────────────────────────────────────────────────────────
      var bldGfxs = def.buildings.map(function (bld) {
        var bc = new PIXI.Container();
        var bg = new PIXI.Graphics();
        _drawBuilding(bg, bld.w, bld.h, bld.clr, style);
        bc.addChild(bg);
        // 標籤（屋頂上方）
        var lbl = new PIXI.Text(bld.icon+' '+bld.name, {
          fontSize:9, fill:0xFFEEBB, align:'center',
          dropShadow:true, dropShadowDistance:1, dropShadowColor:0x000000,
        });
        lbl.anchor.set(0.5, 1);
        lbl.y = -(bld.h + bld.h*0.42 + 10);
        bc.addChild(lbl);
        this._bldLyr.addChild(bc);
        return bc;
      }, this);

      // ── NPC（放在建築門口前方）────────────────────────────────────────────
      var npcs = [];
      def.buildings.forEach(function (bld) {
        if (!bld.npc) return;
        // 自動計算門口前偏移（建築高度的55%對應門前距離）
        var npcOz = bld.h / (SCALE * ISO_Z) * 0.55;
        var npc   = new CityNPC(bld.npc, def.x + bld.ox, def.z + bld.oz + npcOz);
        npcs.push(npc);
        this._npcLyr.addChild(npc.cont);
      }, this);

      return { def:def, gr:gr, bldGfxs:bldGfxs, npcs:npcs };
    }, this);
  }

  CitySystem.prototype.init = function () {
    this._hintEl = document.getElementById('interact-hint');
  };

  CitySystem.prototype.isSafeZone = function (wx, wz) {
    for (var i=0;i<this._cities.length;i++) {
      var d=this._cities[i].def, dx=wx-d.x, dz=wz-d.z;
      if (dx*dx+dz*dz<(d.radius+5)*(d.radius+5)) return true;
    }
    return false;
  };

  CitySystem.prototype.getCityAt = function (wx, wz) {
    for (var i=0;i<this._cities.length;i++) {
      var d=this._cities[i].def, dx=wx-d.x, dz=wz-d.z;
      if (dx*dx+dz*dz<d.radius*d.radius) return d;
    }
    return null;
  };

  CitySystem.prototype.getNearestRespawn = function (wx, wz) {
    var best=null, bestD=Infinity;
    for (var i=0;i<this._cities.length;i++) {
      var d=this._cities[i].def, dx=wx-d.x, dz=wz-d.z, dist=dx*dx+dz*dz;
      if (dist<bestD){bestD=dist;best=d;}
    }
    return best ? best.respawn : {x:0,z:-18};
  };

  CitySystem.prototype.update = function (dt, playerX, playerZ, cam, keys, tutorial) {
    this._nearNPC = null;

    var cityNow=this.getCityAt(playerX,playerZ);
    var cityId=cityNow?cityNow.id:null;
    if (cityId!==this._curCityId) {
      if (cityNow) {
        var pl=G._player;
        if (pl&&!pl.dead){pl.hp=pl.maxHp;pl.mp=pl.maxMp;}
        G.Events.emit('showNotif',{msg:'🏙 '+cityNow.name+' — 安全區域，HP/MP 已恢復',clr:'#88FF88',duration:3000});
        if (tutorial) tutorial.markCity();
      }
      this._curCityId=cityId;
    }

    for (var ci=0;ci<this._cities.length;ci++) {
      var c=this._cities[ci], d=c.def;
      var sx=W/2+(d.x-cam.x)*SCALE, sy=H/2+(d.z-cam.z)*SCALE*ISO_Z;
      var offscreen=Math.abs(sx-W/2)>W*1.3||Math.abs(sy-H/2)>H*1.3;

      c.gr.x=sx; c.gr.y=sy; c.gr.visible=!offscreen;

      for (var bi=0;bi<d.buildings.length;bi++) {
        var bld=d.buildings[bi], bc=c.bldGfxs[bi];
        bc.x=W/2+(d.x+bld.ox-cam.x)*SCALE;
        bc.y=H/2+(d.z+bld.oz-cam.z)*SCALE*ISO_Z;
        bc.visible=!offscreen;
      }

      for (var ni=0;ni<c.npcs.length;ni++) {
        var npc=c.npcs[ni];
        npc.cont.visible=!offscreen;
        if (!offscreen) {
          npc.update(dt,cam);
          if (npc.isNear(playerX,playerZ)) this._nearNPC=npc;
        }
      }
    }

    if (this._hintEl) {
      if (this._nearNPC) {
        this._hintEl.style.display='block';
        this._hintEl.textContent='按 [T] 與「'+this._nearNPC.name+'」對話';
      } else {
        this._hintEl.style.display='none';
      }
    }

    if (this._nearNPC&&!G._uiOpen&&(keys['t']||keys['T'])) {
      keys['t']=false; keys['T']=false;
      this._nearNPC.interact(tutorial);
    }
  };

  CitySystem.isSafeZone = function (wx, wz) {
    return G._citySystem ? G._citySystem.isSafeZone(wx,wz) : false;
  };

  G.CitySystem = CitySystem;
  G.CITY_DEFS  = CITY_DEFS;
})(window.Game = window.Game || {});
