(function (G) {
  'use strict';

  // 配方資料庫
  var RECIPES = [
    // 武器
    { id:'wooden_sword', name:'木劍', icon:'⚔',
      materials:[{id:'wood',qty:5}],
      result:{id:'wooden_sword', qty:1} },
    { id:'iron_sword', name:'鐵劍', icon:'⚔',
      materials:[{id:'iron_ingot',qty:4},{id:'wood',qty:2}],
      result:{id:'iron_sword', qty:1} },
    { id:'steel_sword', name:'鋼劍', icon:'⚔',
      materials:[{id:'steel_ingot',qty:5},{id:'wood',qty:3}],
      result:{id:'steel_sword', qty:1} },
    { id:'hunters_bow', name:'獵弓', icon:'🏹',
      materials:[{id:'wood',qty:8},{id:'wolf_fang',qty:2}],
      result:{id:'hunters_bow', qty:1} },
    { id:'magic_staff', name:'魔法杖', icon:'🔮',
      materials:[{id:'wood',qty:6},{id:'magic_crystal',qty:3}],
      result:{id:'magic_staff', qty:1} },
    { id:'shadow_dagger', name:'暗影匕首', icon:'🗡',
      materials:[{id:'iron_ingot',qty:3},{id:'bone',qty:4}],
      result:{id:'shadow_dagger', qty:1} },
    // 護甲
    { id:'leather_helm', name:'皮革頭盔', icon:'🪖',
      materials:[{id:'boar_hide',qty:3}],
      result:{id:'leather_helm', qty:1} },
    { id:'leather_chest', name:'皮革胸甲', icon:'🛡',
      materials:[{id:'boar_hide',qty:5}],
      result:{id:'leather_chest', qty:1} },
    { id:'leather_legs', name:'皮革護腿', icon:'👖',
      materials:[{id:'boar_hide',qty:4}],
      result:{id:'leather_legs', qty:1} },
    { id:'iron_helm', name:'鐵盔', icon:'🪖',
      materials:[{id:'iron_ingot',qty:5}],
      result:{id:'iron_helm', qty:1} },
    { id:'iron_chest', name:'鐵甲', icon:'🛡',
      materials:[{id:'iron_ingot',qty:10}],
      result:{id:'iron_chest', qty:1} },
    { id:'iron_legs', name:'鐵腿甲', icon:'👖',
      materials:[{id:'iron_ingot',qty:7}],
      result:{id:'iron_legs', qty:1} },
    // 消耗品
    { id:'health_potion_craft', name:'生命藥水', icon:'🧪',
      materials:[{id:'herb',qty:3}],
      result:{id:'health_potion', qty:1} },
    { id:'mp_potion_craft', name:'魔力藥水', icon:'🫙',
      materials:[{id:'herb',qty:2},{id:'magic_crystal',qty:1}],
      result:{id:'mp_potion', qty:1} },
    { id:'hi_potion_craft', name:'高級藥水', icon:'🧪',
      materials:[{id:'herb',qty:6},{id:'magic_crystal',qty:2}],
      result:{id:'hi_potion', qty:1} },
    { id:'elixir_craft', name:'萬能藥劑', icon:'✨',
      materials:[{id:'herb',qty:10},{id:'magic_crystal',qty:5},{id:'void_essence',qty:1}],
      result:{id:'elixir', qty:1} },
    // 材料加工
    { id:'iron_ingot_craft', name:'鐵錠（冶煉）', icon:'🔩',
      materials:[{id:'iron_ore',qty:3}],
      result:{id:'iron_ingot', qty:1} },
    { id:'steel_ingot_craft', name:'鋼錠（精煉）', icon:'🔩',
      materials:[{id:'iron_ingot',qty:4},{id:'fire_core',qty:1}],
      result:{id:'steel_ingot', qty:1} },
  ];

  // ── CraftSystem ───────────────────────────────────────────────────────────
  function CraftSystem() {
    this._panel  = document.getElementById('craft-panel');
    this._listEl = document.getElementById('craft-list');
    this._msgEl  = document.getElementById('craft-msg');

    if (!this._panel) return;
    var self = this;
    document.getElementById('craft-close').addEventListener('click', function () { self.hide(); });
  }

  CraftSystem.prototype.show = function () {
    this._render();
    this._panel.classList.add('open');
    G._uiOpen = true;
  };

  CraftSystem.prototype.hide = function () {
    this._panel.classList.remove('open');
    G._checkUiOpen();
  };

  CraftSystem.prototype.toggle = function () {
    if (this._panel.classList.contains('open')) this.hide();
    else this.show();
  };

  CraftSystem.prototype._render = function () {
    if (!this._listEl) return;
    var inv  = G.inventory;
    var self = this;
    this._msgEl.textContent = '';

    this._listEl.innerHTML = RECIPES.map(function (rec) {
      var canCraft = inv ? rec.materials.every(function (m) { return inv.hasItem(m.id, m.qty); }) : false;
      var matStr = rec.materials.map(function (m) {
        var def = G.ItemDatabase.get(m.id);
        var have = inv ? inv.countItem(m.id) : 0;
        var ok   = have >= m.qty;
        return '<span style="color:' + (ok ? '#88FF88' : '#FF6666') + '">' +
          (def ? def.icon : '') + (def ? def.name : m.id) + ' ' + have + '/' + m.qty +
        '</span>';
      }).join(' + ');
      var resDef = G.ItemDatabase.get(rec.result.id);
      return '<div class="craft-item">' +
        '<div class="craft-result">' + rec.icon + ' <b>' + rec.name + '</b></div>' +
        '<div class="craft-mats">需要：' + matStr + '</div>' +
        '<button class="craft-btn" ' + (canCraft ? '' : 'disabled') + ' data-id="' + rec.id + '">' +
          (canCraft ? '⚒ 製作' : '材料不足') +
        '</button>' +
      '</div>';
    }).join('');

    this._listEl.querySelectorAll('.craft-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rec = RECIPES.find(function (r) { return r.id === btn.dataset.id; });
        if (rec) self._craft(rec);
      });
    });
  };

  CraftSystem.prototype._craft = function (rec) {
    var inv = G.inventory;
    if (!inv) return;
    // 再次確認
    for (var i = 0; i < rec.materials.length; i++) {
      var m = rec.materials[i];
      if (!inv.hasItem(m.id, m.qty)) {
        this._msg('❌ 材料不足！'); return;
      }
    }
    // 消耗材料
    for (var j = 0; j < rec.materials.length; j++) {
      inv.removeItem(rec.materials[j].id, rec.materials[j].qty);
    }
    // 添加結果，若背包滿則退還材料
    if (!inv.addItem(rec.result.id, rec.result.qty)) {
      for (var j2 = 0; j2 < rec.materials.length; j2++) {
        inv.addItem(rec.materials[j2].id, rec.materials[j2].qty);
      }
      this._msg('❌ 背包已滿，製作失敗！'); return;
    }
    var def = G.ItemDatabase.get(rec.result.id);
    this._msg('✅ 製作成功：' + (def ? def.icon + ' ' + def.name : rec.name));
    G.Events.emit('achievementCheck', { type: 'craft' });
    this._render();
  };

  CraftSystem.prototype._msg = function (txt) {
    this._msgEl.textContent = txt;
    clearTimeout(this._timer);
    var self = this;
    this._timer = setTimeout(function () { self._msgEl.textContent = ''; }, 3000);
  };

  G.CraftSystem = CraftSystem;
  G.RECIPES     = RECIPES;
})(window.Game = window.Game || {});
