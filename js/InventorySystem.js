(function (G) {
  'use strict';

  var SLOTS_COUNT = 40;
  var EQUIP_SLOTS = ['weapon','head','chest','legs','boots','ring','necklace'];
  var EQUIP_LABEL = { weapon:'武器', head:'頭盔', chest:'胸甲', legs:'護腿', boots:'鞋子', ring:'戒指', necklace:'項鍊' };

  // ── InventorySystem ────────────────────────────────────────────────────────
  function InventorySystem() {
    this.slots    = new Array(SLOTS_COUNT).fill(null); // {itemId, qty}
    this.equipped = { weapon:null, head:null, chest:null, legs:null, boots:null, ring:null, necklace:null };
    this.gold     = 0;
    this._open    = false;
    this._selIdx  = -1;   // 選中的背包格

    this._buildUI();

    var self = this;
    G.Events.on('itemPickup', function (e) {
      if (!self.addItem(e.itemId, e.qty || 1, e.inst || null)) {
        G.Events.emit('showNotif', { msg: '🎒 背包已滿！', clr: '#FF6600', duration: 2000 });
      }
    });
  }

  // ── UI 建立 ──────────────────────────────────────────────────────────────
  InventorySystem.prototype._buildUI = function () {
    this._panel   = document.getElementById('inv-panel');
    this._goldEl  = document.getElementById('inv-gold');
    this._gridEl  = document.getElementById('inv-grid');
    this._eqEl    = document.getElementById('inv-equip');
    this._statEl  = document.getElementById('inv-stats');
    this._ttEl    = document.getElementById('item-tooltip');

    if (!this._panel) return; // HTML 未就緒
    var self = this;

    // 建立背包格
    for (var i = 0; i < SLOTS_COUNT; i++) {
      (function (idx) {
        var cell = document.createElement('div');
        cell.className = 'inv-slot';
        cell.dataset.idx = idx;
        cell.addEventListener('click', function () { self._clickSlot(idx); });
        cell.addEventListener('mouseenter', function (ev) { self._showTT(idx, ev); });
        cell.addEventListener('mouseleave', function ()   { self._hideTT(); });
        self._gridEl.appendChild(cell);
      })(i);
    }

    // 建立裝備格
    EQUIP_SLOTS.forEach(function (slot) {
      var row = document.createElement('div');
      row.className = 'eq-slot';
      row.dataset.slot = slot;
      row.innerHTML = '<span class="eq-lbl">' + EQUIP_LABEL[slot] + '</span><span class="eq-icon" id="eq-' + slot + '">—</span>';
      row.addEventListener('click', function () { self._clickEquip(slot); });
      row.addEventListener('mouseenter', function (ev) { self._showEqTT(slot, ev); });
      row.addEventListener('mouseleave', function ()   { self._hideTT(); });
      self._eqEl.appendChild(row);
    });

    document.getElementById('inv-close').addEventListener('click', function () { self.hide(); });
  };

  // ── 物品操作 ──────────────────────────────────────────────────────────────
  InventorySystem.prototype.addItem = function (itemId, qty, inst) {
    if (itemId === 'gold') { this.gold += qty; this._renderGold(); this._showPickupNotif('gold', qty); return true; }
    var def = G.ItemDatabase.get(itemId);
    if (!def) return false;

    // 嘗試堆疊（無品質實例時才堆疊）
    if (def.stackable && !inst) {
      for (var i = 0; i < this.slots.length; i++) {
        if (this.slots[i] && this.slots[i].itemId === itemId && !this.slots[i].inst) {
          this.slots[i].qty += qty;
          this._renderSlot(i);
          this._showPickupNotif(itemId, qty);
          return true;
        }
      }
    }
    // 找空格
    for (var j = 0; j < this.slots.length; j++) {
      if (!this.slots[j]) {
        this.slots[j] = { itemId: itemId, qty: qty, inst: inst || null };
        this._renderSlot(j);
        this._showPickupNotif(itemId, qty);
        return true;
      }
    }
    return false; // 背包滿
  };

  InventorySystem.prototype.removeItem = function (itemId, qty) {
    for (var i = 0; i < this.slots.length; i++) {
      var s = this.slots[i];
      if (!s || s.itemId !== itemId) continue;
      if (s.qty >= qty) {
        s.qty -= qty;
        if (s.qty <= 0) this.slots[i] = null;
        this._renderSlot(i);
        return true;
      }
    }
    return false;
  };

  InventorySystem.prototype.hasItem = function (itemId, qty) {
    qty = qty || 1;
    var total = 0;
    for (var i = 0; i < this.slots.length; i++) {
      if (this.slots[i] && this.slots[i].itemId === itemId) total += this.slots[i].qty;
    }
    return total >= qty;
  };

  InventorySystem.prototype.countItem = function (itemId) {
    var total = 0;
    for (var i = 0; i < this.slots.length; i++) {
      if (this.slots[i] && this.slots[i].itemId === itemId) total += this.slots[i].qty;
    }
    return total;
  };

  // ── 裝備操作 ──────────────────────────────────────────────────────────────
  InventorySystem.prototype._clickSlot = function (idx) {
    var s = this.slots[idx];
    if (!s) return;
    var def = G.ItemDatabase.get(s.itemId);
    if (!def) return;

    if (def.type === 'weapon' || def.type === 'armor' || def.type === 'accessory') {
      this._equipFromBag(idx, def.slot);
    } else if (def.type === 'consumable') {
      this._useConsumable(idx, def);
    }
  };

  InventorySystem.prototype._equipFromBag = function (bagIdx, eSlot) {
    var s   = this.slots[bagIdx];
    var old = this.equipped[eSlot];   // { itemId, inst } or null
    this.equipped[eSlot] = { itemId: s.itemId, inst: s.inst || null };
    this.slots[bagIdx]   = old ? { itemId: old.itemId, qty: 1, inst: old.inst || null } : null;
    this._renderSlot(bagIdx);
    this._renderEquipSlot(eSlot);
    this._renderStats();
    G.Events.emit('equipChanged', {});
  };

  InventorySystem.prototype._clickEquip = function (eSlot) {
    var cur = this.equipped[eSlot];   // { itemId, inst } or null
    if (!cur) return;
    if (this.addItem(cur.itemId, 1, cur.inst || null)) {
      this.equipped[eSlot] = null;
      this._renderEquipSlot(eSlot);
      this._renderStats();
      G.Events.emit('equipChanged', {});
    }
  };

  InventorySystem.prototype._useConsumable = function (idx, def) {
    var player = G._player;
    if (!player) return;
    if (!this.slots[idx]) return;
    if (def.effect === 'heal_hp')  player.hp = Math.min(player.maxHp, player.hp + def.amount);
    if (def.effect === 'heal_mp')  player.mp = Math.min(player.maxMp, player.mp + def.amount);
    if (def.effect === 'heal_all') { player.hp = player.maxHp; player.mp = player.maxMp; }
    this.slots[idx].qty--;
    if (this.slots[idx].qty <= 0) this.slots[idx] = null;
    this._renderSlot(idx);
    G.Events.emit('itemUsed', { def: def });
  };

  // ── 屬性計算 ──────────────────────────────────────────────────────────────
  InventorySystem.prototype.getEquippedStats = function () {
    var stats = { atk:0, def:0, hp:0, mp:0, spd:0, mag:0 };
    var self = this;
    EQUIP_SLOTS.forEach(function (slot) {
      var e = self.equipped[slot];
      if (!e) return;
      var def = G.ItemDatabase.get(e.itemId);
      if (!def) return;
      // 若有品質實例，使用 ItemQuality 計算屬性；否則用基礎屬性
      var st = (e.inst && G.ItemQuality) ? G.ItemQuality.getInstanceStats(e.itemId, e.inst) : def;
      if (st.atk) stats.atk += st.atk;
      if (st.def) stats.def += st.def;
      if (st.hp)  stats.hp  += st.hp;
      if (st.mp)  stats.mp  += st.mp;
      if (st.spd) stats.spd += st.spd;
      if (st.mag) stats.mag += st.mag;
    });
    // 套裝加成
    if (G.ItemQuality) {
      var setB = G.ItemQuality.getSetBonuses(self.equipped);
      var sb   = setB.stats;
      if (sb.atk) stats.atk += sb.atk;
      if (sb.def) stats.def += sb.def;
      if (sb.hp)  stats.hp  += sb.hp;
      if (sb.mp)  stats.mp  += sb.mp;
      if (sb.mag) stats.mag += sb.mag;
    }
    return stats;
  };

  // ── 渲染 ──────────────────────────────────────────────────────────────────
  InventorySystem.prototype._renderSlot = function (i) {
    var cells = this._gridEl ? this._gridEl.querySelectorAll('.inv-slot') : [];
    var cell  = cells[i];
    if (!cell) return;
    var s = this.slots[i];
    if (!s) {
      cell.innerHTML = '';
      cell.style.borderColor = '';
      return;
    }
    var def = G.ItemDatabase.get(s.itemId);
    var clr = s.inst && G.ItemQuality ? G.ItemQuality.getColor(s.inst) : (def ? G.ItemDatabase.rarityColor(def.rarity) : '#9E9E9E');
    cell.innerHTML =
      '<span class="inv-icon">' + (def ? def.icon : '?') + '</span>' +
      (s.qty > 1 ? '<span class="inv-qty">' + s.qty + '</span>' : '');
    cell.style.borderColor = clr;
  };

  InventorySystem.prototype._renderEquipSlot = function (slot) {
    var el = document.getElementById('eq-' + slot);
    if (!el) return;
    var e = this.equipped[slot];
    if (!e) { el.textContent = '—'; el.style.color = ''; return; }
    var def  = G.ItemDatabase.get(e.itemId);
    var name = (e.inst && G.ItemQuality) ? G.ItemQuality.getDisplayName(e.itemId, e.inst) : (def ? def.name : e.itemId);
    var clr  = (e.inst && G.ItemQuality) ? G.ItemQuality.getColor(e.inst) : (def ? G.ItemDatabase.rarityColor(def.rarity) : '');
    el.textContent = (def ? def.icon + ' ' : '') + name;
    el.style.color = clr;
  };

  InventorySystem.prototype._renderGold = function () {
    if (this._goldEl) this._goldEl.textContent = '🪙 ' + this.gold;
    var topGold = document.getElementById('hud-gold');
    if (topGold) topGold.textContent = '🪙 ' + this.gold;
  };

  InventorySystem.prototype._renderStats = function () {
    var el = this._statEl;
    if (!el) return;
    var player = G._player;
    if (!player) return;
    var eq = this.getEquippedStats();
    var rows = [
      ['ATK', player.baseAtk + eq.atk, eq.atk],
      ['DEF', player.baseDef + eq.def, eq.def],
      ['HP',  player.baseMaxHp + eq.hp, eq.hp],
      ['MP',  player.baseMaxMp + eq.mp, eq.mp],
      ['MAG', eq.mag, eq.mag],
      ['SPD', eq.spd, eq.spd],
    ];
    el.innerHTML = rows.map(function (r) {
      return '<div class="stat-row"><span class="stat-k">' + r[0] + '</span>' +
             '<span class="stat-v">' + r[1] + (r[2] > 0 ? ' <em>(+' + r[2] + ')</em>' : '') + '</span></div>';
    }).join('');
  };

  InventorySystem.prototype._renderAll = function () {
    var self = this;
    for (var i = 0; i < SLOTS_COUNT; i++) self._renderSlot(i);
    EQUIP_SLOTS.forEach(function (s) { self._renderEquipSlot(s); });
    this._renderGold();
    this._renderStats();
  };

  // ── Tooltip ───────────────────────────────────────────────────────────────
  InventorySystem.prototype._showTT = function (idx, ev) {
    var s = this.slots[idx];
    if (!s) return;
    this._renderTT(G.ItemDatabase.get(s.itemId), s.qty, ev, s.inst);
  };

  InventorySystem.prototype._showEqTT = function (slot, ev) {
    var e = this.equipped[slot];
    if (!e) return;
    this._renderTT(G.ItemDatabase.get(e.itemId), 1, ev, e.inst || null);
  };

  InventorySystem.prototype._renderTT = function (def, qty, ev, inst) {
    if (!def || !this._ttEl) return;
    var IQ = G.ItemQuality;
    var nameStr = inst && IQ ? IQ.getDisplayName(def.id, inst) : def.name;
    var clr     = inst && IQ ? IQ.getColor(inst)               : G.ItemDatabase.rarityColor(def.rarity);
    var st      = inst && IQ ? IQ.getInstanceStats(def.id, inst) : def;
    var lines = ['<b style="color:' + clr + '">' + def.icon + ' ' + nameStr + '</b>'];
    if (inst && IQ) lines.push('<span style="color:'+clr+';font-size:11px">【' + IQ.getQualityName(inst) + '】</span>');
    if (st.atk)  lines.push('⚔ 攻擊 +' + st.atk);
    if (st.def)  lines.push('🛡 防禦 +' + st.def);
    if (st.hp)   lines.push('❤ 生命 +' + st.hp);
    if (st.mp)   lines.push('💧 魔力 +' + st.mp);
    if (st.mag)  lines.push('✨ 法強 +' + st.mag);
    if (st.spd)  lines.push('💨 速度 +' + st.spd);
    if (def.desc) lines.push('<i style="opacity:.6">' + def.desc + '</i>');
    if (qty > 1)  lines.push('數量：' + qty);
    this._ttEl.innerHTML = lines.join('<br>');
    this._ttEl.style.display = 'block';
    this._ttEl.style.left = (ev.clientX + 14) + 'px';
    this._ttEl.style.top  = (ev.clientY - 10) + 'px';
  };

  InventorySystem.prototype._hideTT = function () {
    if (this._ttEl) this._ttEl.style.display = 'none';
  };

  // ── 拾取通知 ────────────────────────────────────────────────────────────
  InventorySystem.prototype._showPickupNotif = function (itemId, qty) {
    var el = document.getElementById('loot-notifs');
    if (!el) return;
    var def = G.ItemDatabase.get(itemId);
    var name = itemId === 'gold' ? '金幣' : (def ? def.icon + ' ' + def.name : itemId);
    var div = document.createElement('div');
    div.className = 'loot-notif';
    div.textContent = '+' + qty + ' ' + name;
    if (def) div.style.color = G.ItemDatabase.rarityColor(def.rarity);
    if (itemId === 'gold') div.style.color = '#FFD700';
    el.appendChild(div);
    setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 2600);
  };

  // ── 顯示 / 隱藏 ──────────────────────────────────────────────────────────
  InventorySystem.prototype.show = function () {
    if (!this._panel) return;
    this._renderAll();
    this._panel.classList.add('open');
    this._open = true;
    G._uiOpen = true;
  };

  InventorySystem.prototype.hide = function () {
    if (!this._panel) return;
    this._panel.classList.remove('open');
    this._open = false;
    this._hideTT();
    G._checkUiOpen();
  };

  InventorySystem.prototype.toggle = function () {
    this._open ? this.hide() : this.show();
  };

  // ── 存檔序列化 ────────────────────────────────────────────────────────────
  InventorySystem.prototype.serialize = function () {
    return { slots: this.slots.slice(), equipped: JSON.parse(JSON.stringify(this.equipped)), gold: this.gold };
  };

  InventorySystem.prototype.deserialize = function (data) {
    if (!data) return;
    if (data.slots)    this.slots = data.slots;
    if (data.equipped) {
      // 相容舊存檔：裝備格可能是字串，遷移為 { itemId, inst }
      var eq = data.equipped;
      var self = this;
      EQUIP_SLOTS.forEach(function(slot) {
        var v = eq[slot];
        if (typeof v === 'string') { self.equipped[slot] = { itemId: v, inst: null }; }
        else { self.equipped[slot] = v || null; }
      });
    }
    if (data.gold !== undefined) { this.gold = data.gold; this._renderGold(); }
    G.Events.emit('equipChanged', {});
  };

  G.InventorySystem = InventorySystem;
})(window.Game = window.Game || {});
