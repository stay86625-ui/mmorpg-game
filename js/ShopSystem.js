(function (G) {
  'use strict';

  // 各商店的商品清單
  var SHOP_INVENTORIES = {
    general: [
      'iron_sword','leather_helm','leather_chest','leather_legs','leather_boots',
      'health_potion','mp_potion','hunters_bow','power_ring','life_ring',
    ],
    weapon: [
      'wooden_sword','iron_sword','steel_sword','magic_staff','hunters_bow',
      'shadow_dagger','iron_helm','iron_chest','iron_legs','iron_boots',
    ],
    potion: [
      'health_potion','mp_potion','hi_potion','elixir',
      'herb','magic_crystal',
    ],
  };

  function ShopSystem() {
    this._open    = false;
    this._shopId  = null;
    this._tab     = 'buy';

    this._panel    = document.getElementById('shop-panel');
    this._titleEl  = document.getElementById('shop-title');
    this._listEl   = document.getElementById('shop-list');
    this._goldEl   = document.getElementById('shop-gold');
    this._msgEl    = document.getElementById('shop-msg');

    if (!this._panel) return;
    var self = this;
    document.getElementById('shop-close').addEventListener('click', function () { self.close(); });
    document.getElementById('shop-tab-buy').addEventListener('click',  function () { self._setTab('buy');  });
    document.getElementById('shop-tab-sell').addEventListener('click', function () { self._setTab('sell'); });
  }

  ShopSystem.prototype.open = function (shopId) {
    this._shopId = shopId || 'general';
    this._tab    = 'buy';
    this._render();
    this._panel.classList.add('open');
    this._open = true;
    G._uiOpen  = true;
  };

  ShopSystem.prototype.close = function () {
    this._panel.classList.remove('open');
    this._open = false;
    G._checkUiOpen();
  };

  ShopSystem.prototype._setTab = function (tab) {
    this._tab = tab;
    document.getElementById('shop-tab-buy').classList.toggle('active',  tab === 'buy');
    document.getElementById('shop-tab-sell').classList.toggle('active', tab === 'sell');
    this._render();
  };

  ShopSystem.prototype._render = function () {
    var inv     = G.inventory;
    this._goldEl.textContent = '🪙 ' + (inv ? inv.gold : 0);
    this._listEl.innerHTML = '';
    this._msgEl.textContent = '';

    if (this._tab === 'buy') {
      this._titleEl.textContent = '🏪 商店';
      var items = SHOP_INVENTORIES[this._shopId] || [];
      var self  = this;
      items.forEach(function (id) {
        var def = G.ItemDatabase.get(id);
        if (!def) return;
        var row  = document.createElement('div');
        row.className = 'shop-row';
        var canBuy = inv && inv.gold >= def.price;
        row.innerHTML =
          '<span class="shop-icon">' + def.icon + '</span>' +
          '<span class="shop-name" style="color:' + G.ItemDatabase.rarityColor(def.rarity) + '">' + def.name + '</span>' +
          '<span class="shop-price">🪙 ' + def.price + '</span>' +
          '<button class="shop-btn" ' + (canBuy ? '' : 'disabled') + '>購買</button>';
        row.querySelector('button').addEventListener('click', function () {
          self._buy(def);
        });
        self._listEl.appendChild(row);
      });
    } else {
      this._titleEl.textContent = '💰 出售物品';
      var self = this;
      if (!inv) return;
      inv.slots.forEach(function (s, idx) {
        if (!s) return;
        var def = G.ItemDatabase.get(s.itemId);
        if (!def) return;
        var sellPrice = def.sellPrice || Math.floor((def.price || 10) * 0.35);
        var row = document.createElement('div');
        row.className = 'shop-row';
        row.innerHTML =
          '<span class="shop-icon">' + def.icon + '</span>' +
          '<span class="shop-name" style="color:' + G.ItemDatabase.rarityColor(def.rarity) + '">' +
            def.name + (s.qty > 1 ? ' x' + s.qty : '') + '</span>' +
          '<span class="shop-price">🪙 ' + sellPrice + '</span>' +
          '<button class="shop-btn shop-btn-sell">出售</button>';
        row.querySelector('button').addEventListener('click', function () {
          self._sell(idx, def, sellPrice);
        });
        self._listEl.appendChild(row);
      });
    }
  };

  ShopSystem.prototype._buy = function (def) {
    var inv = G.inventory;
    if (!inv || inv.gold < def.price) {
      this._msg('💰 金幣不足！'); return;
    }
    if (!inv.addItem(def.id, 1)) {
      this._msg('🎒 背包已滿！'); return;
    }
    inv.gold -= def.price;
    this._msg('✔ 購買了 ' + def.icon + ' ' + def.name);
    this._render();
  };

  ShopSystem.prototype._sell = function (idx, def, price) {
    var inv = G.inventory;
    if (!inv || !inv.slots[idx]) return;
    var qty = inv.slots[idx].qty;
    inv.slots[idx] = null;
    inv.gold += price * qty;
    inv._renderSlot(idx);
    inv._renderGold();
    this._msg('💰 出售 ' + def.name + ' × ' + qty + '，獲得 🪙 ' + price * qty);
    this._render();
  };

  ShopSystem.prototype._msg = function (txt) {
    this._msgEl.textContent = txt;
    var self = this;
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(function () { self._msgEl.textContent = ''; }, 3000);
  };

  G.ShopSystem = ShopSystem;
})(window.Game = window.Game || {});
