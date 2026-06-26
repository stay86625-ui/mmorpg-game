(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;

  // ── 城鎮定義 ──────────────────────────────────────────────────────────────
  var TOWN_CENTER = { x: 0, z: -28 };
  var TOWN_RADIUS = 18;

  // 建築物定義（相對城鎮中心的偏移，screen-space y 偏移）
  var BUILDINGS = [
    { name:'旅館',       ox:-8,  oz:2,  clr:0x7A5830, w:22, h:14, icon:'🏠' },
    { name:'商店',       ox:10,  oz:2,  clr:0x5A3010, w:18, h:12, icon:'🏪' },
    { name:'鐵匠鋪',    ox:-10, oz:-6, clr:0x3A3A3A, w:18, h:12, icon:'⚒'  },
    { name:'藥鋪',      ox:10,  oz:-6, clr:0x2A4A20, w:16, h:11, icon:'⚗'  },
    { name:'城鎮大廳',  ox:0,   oz:-14,clr:0x1A3060, w:26, h:16, icon:'🏛'  },
    { name:'倉庫',      ox:6,   oz:6,  clr:0x5A4020, w:16, h:10, icon:'📦'  },
  ];

  // ── 倉庫 ─────────────────────────────────────────────────────────────────
  var WAREHOUSE_SIZE = 60;

  function Warehouse() {
    this.slots = new Array(WAREHOUSE_SIZE).fill(null);
    this._open  = false;
    this._panel = null;
    this._grid  = null;
  }

  Warehouse.prototype._init = function () {
    this._panel = document.getElementById('warehouse-panel');
    this._grid  = document.getElementById('warehouse-grid');
    if (!this._panel) return;
    var self = this;
    document.getElementById('wh-close').addEventListener('click', function () { self.hide(); });

    for (var i = 0; i < WAREHOUSE_SIZE; i++) {
      (function (idx) {
        var cell = document.createElement('div');
        cell.className = 'inv-slot';
        cell.addEventListener('click', function () { self._clickSlot(idx); });
        cell.addEventListener('mouseenter', function (ev) { self._showTT(idx, ev); });
        cell.addEventListener('mouseleave', function () {
          var tt = document.getElementById('item-tooltip'); if(tt) tt.style.display='none';
        });
        self._grid.appendChild(cell);
      })(i);
    }
  };

  Warehouse.prototype._clickSlot = function (idx) {
    var s = this.slots[idx];
    if (!s) return;
    // 轉移到背包
    var inv = G.inventory;
    if (!inv) return;
    if (inv.addItem(s.itemId, s.qty, s.inst || null)) {
      this.slots[idx] = null;
      this._render();
    }
  };

  Warehouse.prototype._showTT = function (idx, ev) {
    var s = this.slots[idx]; if(!s) return;
    var tt = document.getElementById('item-tooltip'); if(!tt) return;
    var def = G.ItemDatabase.get(s.itemId);
    var inst = s.inst;
    var name = inst ? G.ItemQuality.getDisplayName(s.itemId, inst) : (def ? def.name : s.itemId);
    var clr  = inst ? G.ItemQuality.getColor(inst) : (def ? G.ItemDatabase.rarityColor(def.rarity) : '#9E9E9E');
    var st   = inst ? G.ItemQuality.getInstanceStats(s.itemId, inst) : (def || {});
    var lines = ['<b style="color:'+clr+'">'+(def?def.icon:'')+' '+name+'</b>'];
    if(st.atk) lines.push('⚔ 攻擊 +'+st.atk);
    if(st.def) lines.push('🛡 防禦 +'+st.def);
    if(st.hp)  lines.push('❤ 生命 +'+st.hp);
    if(st.mp)  lines.push('💧 魔力 +'+st.mp);
    if(st.mag) lines.push('✨ 法強 +'+st.mag);
    if(s.qty>1) lines.push('數量：'+s.qty);
    tt.innerHTML = lines.join('<br>');
    tt.style.display='block';
    tt.style.left=(ev.clientX+14)+'px'; tt.style.top=(ev.clientY-10)+'px';
  };

  Warehouse.prototype.addItem = function (itemId, qty, inst) {
    // 嘗試堆疊
    var def = G.ItemDatabase.get(itemId);
    if (def && def.stackable && !inst) {
      for (var i = 0; i < this.slots.length; i++) {
        if (this.slots[i] && this.slots[i].itemId === itemId && !this.slots[i].inst) {
          this.slots[i].qty += qty; this._renderSlot(i); return true;
        }
      }
    }
    for (var j = 0; j < this.slots.length; j++) {
      if (!this.slots[j]) {
        this.slots[j] = { itemId:itemId, qty:qty, inst:inst||null };
        this._renderSlot(j); return true;
      }
    }
    return false;
  };

  Warehouse.prototype._renderSlot = function (i) {
    if (!this._grid) return;
    var cells = this._grid.querySelectorAll('.inv-slot');
    var cell  = cells[i]; if(!cell) return;
    var s = this.slots[i];
    if (!s) { cell.innerHTML=''; cell.style.borderColor=''; return; }
    var def = G.ItemDatabase.get(s.itemId);
    var clr = s.inst ? G.ItemQuality.getColor(s.inst) : (def?G.ItemDatabase.rarityColor(def.rarity):'#9E9E9E');
    cell.innerHTML = '<span class="inv-icon">'+(def?def.icon:'?')+'</span>'+(s.qty>1?'<span class="inv-qty">'+s.qty+'</span>':'');
    cell.style.borderColor = clr;
  };

  Warehouse.prototype._render = function () { for(var i=0;i<WAREHOUSE_SIZE;i++) this._renderSlot(i); };

  Warehouse.prototype.show = function () {
    if (!this._panel) return;
    this._render();
    this._panel.classList.add('open');
    this._open = true; G._uiOpen = true;
  };
  Warehouse.prototype.hide = function () {
    if (!this._panel) return;
    this._panel.classList.remove('open');
    this._open = false; G._checkUiOpen();
  };
  Warehouse.prototype.toggle = function () { this._open ? this.hide() : this.show(); };

  Warehouse.prototype.serialize   = function () { return this.slots.slice(); };
  Warehouse.prototype.deserialize = function (d) { if(d) this.slots = d; };

  // ── TownSystem ────────────────────────────────────────────────────────────
  function TownSystem(stage) {
    this._container = new PIXI.Container();
    stage.addChild(this._container);

    this.warehouse  = new Warehouse();
    this._inTown    = false;
    this._hintEl    = null;

    // 預建立建築物 Graphics（每幀只更新位置，不重新建立）
    this._bldGfx = BUILDINGS.map(function (b) {
      var g = new PIXI.Graphics();
      g.beginFill(0x000000, 0.25).drawEllipse(0, 3, b.w*0.6, b.h*0.25).endFill();
      g.beginFill(b.clr).drawRect(-b.w/2, -b.h, b.w, b.h).endFill();
      var roofClr = (b.clr + 0x303030 > 0xFFFFFF) ? 0xFFFFFF : b.clr + 0x303030;
      g.beginFill(roofClr);
      g.drawPolygon([0, -b.h-8, -b.w/2-2, -b.h+2, b.w/2+2, -b.h+2]).endFill();
      var label = new PIXI.Text(b.icon + '\n' + b.name, { fontSize:9, fill:0xFFFFCC, align:'center' });
      label.anchor.set(0.5, 1); label.y = -b.h - 14;
      g.addChild(label);
      return g;
    });

    var self = this;
    G.Events.on('playerDead', function () { self._onPlayerDead(); });
  }

  TownSystem.prototype.init = function () {
    this.warehouse._init();
    this._hintEl = document.getElementById('town-hint');
    this._zoneEl = document.getElementById('zone-name');
  };

  TownSystem.prototype._onPlayerDead = function () {
    var player = G._player;
    if (!player) return;
    // 失去 5% 金幣
    if (G.inventory) {
      var loss = Math.floor(G.inventory.gold * 0.05);
      G.inventory.gold = Math.max(0, G.inventory.gold - loss);
      G.inventory._renderGold();
      if (loss > 0) G.Events.emit('showNotif', { msg:'⚠ 死亡懲罰：失去 🪙' + loss + ' 金幣', clr:'#FF8844' });
    }
  };

  // 玩家重生點（由 Player.respawn() 呼叫後 main.js 設定位置）
  TownSystem.prototype.getSpawnPoint = function () { return { x: TOWN_CENTER.x, z: TOWN_CENTER.z + 3 }; };

  TownSystem.prototype.isInTown = function (px, pz) {
    var dx = px - TOWN_CENTER.x, dz = pz - TOWN_CENTER.z;
    return dx*dx + dz*dz < TOWN_RADIUS * TOWN_RADIUS;
  };

  // 安全區判斷委派給 CitySystem（涵蓋全部 6 座城市）
  TownSystem.isSafeZone = function (wx, wz) {
    if (G._citySystem) return G._citySystem.isSafeZone(wx, wz);
    var dx = wx - TOWN_CENTER.x, dz = wz - TOWN_CENTER.z;
    return dx*dx + dz*dz < (TOWN_RADIUS + 5) * (TOWN_RADIUS + 5);
  };

  TownSystem.prototype.update = function (dt, playerX, playerZ, cam, keys) {
    var inTown = this.isInTown(playerX, playerZ);
    this._inTown = inTown;
    // HP/MP 回復與城市通知由 CitySystem 統一處理

    // 城鎮提示
    if (this._hintEl) {
      this._hintEl.style.display = inTown ? 'block' : 'none';
      if (inTown) this._hintEl.textContent = '🏡 城鎮（安全區）— B：開啟倉庫';
    }

    // 倉庫開關：用 B 鍵避免與 WASD 移動衝突
    if (inTown && (keys['b'] || keys['B'])) {
      keys['b'] = false; keys['B'] = false;
      this.warehouse.toggle();
    }

    // 建築渲染已由 CitySystem 接管，此處不再重複繪製
  };

  G.TownSystem   = TownSystem;
  G.TOWN_CENTER  = TOWN_CENTER;
  G.TOWN_RADIUS  = TOWN_RADIUS;
})(window.Game = window.Game || {});
