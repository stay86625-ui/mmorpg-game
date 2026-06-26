(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;

  // ── 事件定義 ───────────────────────────────────────────────────────────────
  var EVENT_DEFS = [
    {
      id:'invasion',
      name:'怪物入侵！',
      icon:'⚔',
      desc:'大量怪物從四面八方湧來！',
      color:'#FF4422',
      minInterval: 180,
      maxInterval: 360,
      duration:    60,
      spawnMult:   3.0,  // 怪物生成速率倍數
    },
    {
      id:'treasure',
      name:'寶藏降臨！',
      icon:'💰',
      desc:'傳說中的寶藏從天而降！前去拾取！',
      color:'#FFD700',
      minInterval: 240,
      maxInterval: 480,
      duration:    45,
    },
    {
      id:'meteor',
      name:'隕石墜落！',
      icon:'☄',
      desc:'熾熱的隕石正在墜落！小心躲避！',
      color:'#FF6622',
      minInterval: 300,
      maxInterval: 600,
      duration:    30,
    },
    {
      id:'boss_rage',
      name:'Boss 狂暴！',
      icon:'💀',
      desc:'區域 Boss 進入狂暴狀態！傷害大幅提升！',
      color:'#CC22FF',
      minInterval: 420,
      maxInterval: 720,
      duration:    40,
    },
    {
      id:'merchant_caravan',
      name:'商隊護送',
      icon:'🛒',
      desc:'商人護送隊已出發！完成護送獲得豐厚報酬！',
      color:'#44AAFF',
      minInterval: 200,
      maxInterval: 400,
      duration:    90,
    },
  ];

  // ── WorldEvent 實例 ────────────────────────────────────────────────────────
  function WorldEvent(def) {
    this.def      = def;
    this.timeLeft = def.duration;
    this.active   = true;
    this._data    = {};   // 事件特定資料

    // 初始化事件
    if (def.id === 'treasure') {
      var angle = Math.random() * Math.PI * 2;
      var dist  = 20 + Math.random() * 20;
      var pl    = G._player;
      this._data.x = (pl ? pl.x : 0) + Math.cos(angle) * dist;
      this._data.z = (pl ? pl.z : 0) + Math.sin(angle) * dist;
      this._data.collected = false;
      this._data.gfx = new PIXI.Graphics();
      // 文字標籤只建立一次
      var lbl = new PIXI.Text('💰', { fontSize:18 });
      lbl.anchor.set(0.5, 0.5);
      this._data.gfx.addChild(lbl);
      this._data.lbl = lbl;
    }
    if (def.id === 'meteor') {
      // 隕石目標：玩家位置附近
      var pl2 = G._player;
      this._data.tx = (pl2 ? pl2.x : 0) + (Math.random()-0.5)*20;
      this._data.tz = (pl2 ? pl2.z : 0) + (Math.random()-0.5)*20;
      this._data.t  = 0;
      this._data.gfx = new PIXI.Graphics();
    }
  }

  WorldEvent.prototype.update = function (dt, cam, container) {
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.active = false; return; }

    var def = this.def;

    if (def.id === 'treasure' && !this._data.collected) {
      var g = this._data.gfx;
      g.clear();
      var t  = Date.now() * 0.003;
      var sx = W/2 + (this._data.x - cam.x)*SCALE;
      var sy = H/2 + (this._data.z - cam.z)*SCALE*ISO_Z;
      var glow = Math.sin(t) * 0.4 + 0.6;
      g.beginFill(0xFFD700, glow*0.35).drawCircle(0, 0, 28).endFill();
      g.beginFill(0xFFD700).drawCircle(0, 0, 10).endFill();
      g.lineStyle(2, 0xFFFFAA, 0.8).drawCircle(0, 0, 14);
      if (this._data.lbl) this._data.lbl.y = Math.sin(t)*(-4);
      g.x = sx; g.y = sy - Math.sin(t)*4;
      container.addChild(g);

      // 拾取判定
      var pl = G._player;
      if (pl) {
        var dx = this._data.x - pl.x, dz = this._data.z - pl.z;
        if (dx*dx + dz*dz < 2.5*2.5) {
          this._data.collected = true;
          var goldAmt = 200 + Math.floor(Math.random()*300);
          if (G.inventory) { G.inventory.gold += goldAmt; G.inventory._renderGold(); }
          G.Events.emit('showNotif', { msg:'💰 寶藏！獲得 🪙' + goldAmt + ' 金幣！', clr:'#FFD700' });
          G.Events.emit('achievementCheck', { type:'treasure', n:1 });
        }
      }
    }

    if (def.id === 'meteor') {
      this._data.t += dt;
      var ratio = Math.min(1, this._data.t / (def.duration * 0.6));
      var gm    = this._data.gfx;
      gm.clear();
      var sx2 = W/2 + (this._data.tx - cam.x)*SCALE;
      var sy2 = H/2 + (this._data.tz - cam.z)*SCALE*ISO_Z;
      // 警告圈
      gm.lineStyle(2, 0xFF6622, 0.6*(1-ratio*0.3)).drawCircle(0, 0, 30*(1-ratio*0.5));
      // 隕石本體（越來越大）
      if (ratio > 0.7) {
        var r2 = (ratio - 0.7) / 0.3 * 18;
        gm.beginFill(0xFF4400, 0.85).drawCircle(0, -r2*2, r2).endFill();
        gm.beginFill(0xFF9900, 0.6).drawCircle(0, -r2*2, r2*0.5).endFill();
      }
      gm.x = sx2; gm.y = sy2;
      container.addChild(gm);
      // 落地傷害
      if (ratio >= 1 && !this._data.exploded) {
        this._data.exploded = true;
        var pl3 = G._player;
        if (pl3) {
          var mdx = this._data.tx - pl3.x, mdz = this._data.tz - pl3.z;
          if (mdx*mdx + mdz*mdz < 4*4) {
            pl3.takeDamage(40);
            G.Events.emit('showNotif', { msg:'☄ 隕石擊中你！-40 HP', clr:'#FF6622' });
          }
        }
        this.active = false;
      }
    }
  };

  // ── WorldEventSystem ──────────────────────────────────────────────────────
  function WorldEventSystem(stage) {
    this._events    = [];
    this._timers    = {};  // eventId → nextTrigger 計時器
    this._container = new PIXI.Container();
    stage.addChild(this._container);

    // 初始化各事件計時器
    var self = this;
    EVENT_DEFS.forEach(function (def) {
      self._timers[def.id] = def.minInterval + Math.random() * (def.maxInterval - def.minInterval);
    });

    this._activeInvasion = false;
  }

  WorldEventSystem.prototype.update = function (dt, cam) {
    var self = this;
    this._container.removeChildren();

    // 計時器倒數
    EVENT_DEFS.forEach(function (def) {
      if (self._timers[def.id] !== undefined) {
        self._timers[def.id] -= dt;
        if (self._timers[def.id] <= 0) {
          self._trigger(def);
          self._timers[def.id] = def.minInterval + Math.random() * (def.maxInterval - def.minInterval);
        }
      }
    });

    // 更新進行中的事件
    var alive = [];
    for (var i = 0; i < this._events.length; i++) {
      var ev = this._events[i];
      ev.update(dt, cam, this._container);
      if (ev.active) alive.push(ev);
      else {
        if (ev.def.id === 'invasion') this._activeInvasion = false;
        if (ev.def.id === 'boss_rage') G.Events.emit('bossRageEnd', {});
        // 清理 gfx
        if (ev._data.gfx) ev._data.gfx.destroy({ children:true });
      }
    }
    this._events = alive;

    // 更新事件狀態 HUD
    this._updateEventHUD();
  };

  WorldEventSystem.prototype._trigger = function (def) {
    var ev = new WorldEvent(def);
    this._events.push(ev);

    if (def.id === 'invasion')  { this._activeInvasion = true; }
    if (def.id === 'boss_rage') { G.Events.emit('bossRageStart', {}); }

    // 全畫面公告
    G.Events.emit('worldEvent', { def:def });
    G.Events.emit('showNotif', { msg: def.icon + ' 世界事件：' + def.name + '（' + def.duration + '秒）', clr: def.color, duration: 5000 });
  };

  WorldEventSystem.prototype.isInvasionActive = function () { return this._activeInvasion; };

  WorldEventSystem.prototype._updateEventHUD = function () {
    var el = document.getElementById('event-bar');
    if (!el) return;
    if (this._events.length === 0) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    el.innerHTML = this._events.map(function (ev) {
      return '<span style="color:' + ev.def.color + '">' + ev.def.icon + ' ' + ev.def.name +
             ' <b>' + Math.ceil(ev.timeLeft) + 's</b></span>';
    }).join(' &nbsp;｜&nbsp; ');
  };

  G.WorldEventSystem = WorldEventSystem;
})(window.Game = window.Game || {});
