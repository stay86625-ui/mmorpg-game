(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;

  // 每種怪物的掉落表 [{id, weight, minQty, maxQty}]
  var DROP_TABLES = {
    slime:      [ {id:'slime_gel',     w:70, min:1, max:2},
                  {id:'health_potion', w:15, min:1, max:1},
                  {id:'iron_ore',      w:10, min:1, max:1},
                  {id:'leather_chest', w:3,  min:1, max:1},
                  {id:'gold',          w:80, min:2, max:8}  ],
    wolf:       [ {id:'wolf_fang',     w:60, min:1, max:2},
                  {id:'bone',          w:50, min:1, max:2},
                  {id:'leather_helm',  w:8,  min:1, max:1},
                  {id:'hunters_bow',   w:4,  min:1, max:1},
                  {id:'gold',          w:80, min:5, max:18} ],
    rabbit:     [ {id:'bone',          w:60, min:1, max:1},
                  {id:'health_potion', w:20, min:1, max:1},
                  {id:'gold',          w:80, min:1, max:5}  ],
    boar:       [ {id:'boar_hide',     w:65, min:1, max:2},
                  {id:'bone',          w:40, min:1, max:2},
                  {id:'iron_ore',      w:20, min:1, max:2},
                  {id:'leather_legs',  w:6,  min:1, max:1},
                  {id:'gold',          w:80, min:8, max:25} ],
    snowWolf:   [ {id:'wolf_fang',     w:55, min:1, max:3},
                  {id:'ice_shard',     w:40, min:1, max:2},
                  {id:'iron_helm',     w:8,  min:1, max:1},
                  {id:'gold',          w:80, min:12, max:35}],
    iceElem:    [ {id:'ice_shard',     w:70, min:2, max:4},
                  {id:'magic_crystal', w:25, min:1, max:2},
                  {id:'magic_hood',    w:6,  min:1, max:1},
                  {id:'mp_potion',     w:30, min:1, max:2},
                  {id:'gold',          w:80, min:15, max:45}],
    scorpion:   [ {id:'scorpion_claw', w:65, min:1, max:2},
                  {id:'bone',          w:30, min:1, max:2},
                  {id:'leather_boots', w:8,  min:1, max:1},
                  {id:'gold',          w:80, min:10, max:30}],
    sandworm:   [ {id:'bone',          w:50, min:2, max:4},
                  {id:'iron_ingot',    w:20, min:1, max:2},
                  {id:'iron_chest',    w:5,  min:1, max:1},
                  {id:'gold',          w:80, min:20, max:55}],
    fireElem:   [ {id:'fire_core',     w:65, min:1, max:3},
                  {id:'lava_stone',    w:40, min:1, max:2},
                  {id:'magic_crystal', w:15, min:1, max:2},
                  {id:'gold',          w:80, min:22, max:65}],
    lavaDemon:  [ {id:'fire_core',     w:60, min:2, max:4},
                  {id:'lava_stone',    w:50, min:2, max:3},
                  {id:'steel_ingot',   w:18, min:1, max:2},
                  {id:'flame_blade',   w:3,  min:1, max:1},
                  {id:'gold',          w:80, min:35, max:90}],
    voidSpirit: [ {id:'void_essence',  w:60, min:1, max:2},
                  {id:'magic_crystal', w:40, min:2, max:4},
                  {id:'mage_pendant',  w:4,  min:1, max:1},
                  {id:'gold',          w:80, min:40, max:100}],
    abyssLord:  [ {id:'void_essence',  w:80, min:3, max:6},
                  {id:'void_blade',    w:8,  min:1, max:1},
                  {id:'elixir',        w:25, min:1, max:2},
                  {id:'steel_plate',   w:10, min:1, max:1},
                  {id:'gold',          w:80, min:100, max:250}],
  };

  // 顏色 by 稀有度
  var RARITY_CLR = {
    common:0xAAAAAA, uncommon:0x44BB44, rare:0x4488FF, epic:0xCC44FF, legendary:0xFFAA00, currency:0xFFDD22
  };

  // 世界中掉落的物品實體
  function DropItem(itemId, qty, wx, wz, inst) {
    this.itemId = itemId;
    this.qty    = qty;
    this.inst   = inst || null;
    this.x      = wx + (Math.random() - 0.5) * 1.2;
    this.z      = wz + (Math.random() - 0.5) * 1.2;
    this.life   = 60;   // 60秒後消失
    this.t      = Math.random() * Math.PI * 2;
    this.dead   = false;

    var def = G.ItemDatabase.get(itemId);
    var clr = def ? RARITY_CLR[def.rarity] || 0xAAAAAA : 0xFFDD22;
    if (itemId === 'gold') clr = 0xFFDD22;

    this._gfx  = new PIXI.Graphics();
    this._label = new PIXI.Text(def ? def.icon : '?', {
      fontSize: 11, fill: 0xFFFFFF,
    });
    this._label.anchor.set(0.5, 0.5);
    this._label.y = -14;
    this._gfx.addChild(this._label);
    this._clr = clr;
  }

  DropItem.prototype.update = function (dt, cam) {
    this.t    += dt * 2.5;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    var sx = W/2 + (this.x - cam.x) * SCALE;
    var sy = H/2 + (this.z - cam.z) * SCALE * ISO_Z;
    var bob = Math.sin(this.t) * 3;
    var alpha = this.life < 5 ? this.life / 5 : 1;
    var r = 6;

    var g = this._gfx;
    g.clear();
    g.alpha = alpha;
    g.beginFill(0x000000, 0.35).drawEllipse(0, 2, r * 1.2, r * 0.4).endFill();
    g.beginFill(this._clr).drawCircle(0, bob, r).endFill();
    g.lineStyle(1.5, 0xFFFFFF, 0.5).drawCircle(0, bob, r);
    this._label.y = bob - 14;
    g.x = sx; g.y = sy;
  };

  // ── DropManager ────────────────────────────────────────────────────────────
  function DropManager(stage) {
    this._drops    = [];
    this._container = new PIXI.Container();
    this._bagFullCd = 0;
    stage.addChild(this._container);

    var self = this;
    G.Events.on('monsterDead', function (e) {
      self.spawnDrops(e.monster);
    });
  }

  DropManager.prototype.spawnDrops = function (monster) {
    var table = DROP_TABLES[monster.type.id];
    if (!table) return;
    var x = monster.x, z = monster.z;
    var eliteBonus = (monster._elite ? monster._elite.dropBonus : 1);

    for (var i = 0; i < table.length; i++) {
      var entry = table[i];
      if (Math.random() * 100 > entry.w * eliteBonus) continue;
      var qty  = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
      var inst = null;
      // 裝備類物品生成品質實例
      var def = G.ItemDatabase.get(entry.id);
      if (def && (def.type === 'weapon' || def.type === 'armor') && G.ItemQuality) {
        inst = G.ItemQuality.generateInstance(entry.id, monster.type.exp || 10);
      }
      this._drops.push(new DropItem(entry.id, qty, x, z, inst));
    }
  };

  DropManager.prototype.update = function (dt, cam, playerX, playerZ) {
    this._container.removeChildren();
    if (this._bagFullCd > 0) this._bagFullCd -= dt;
    var alive = [];

    for (var i = 0; i < this._drops.length; i++) {
      var d = this._drops[i];
      d.update(dt, cam);
      if (d.dead) continue;

      // 自動拾取（2 單位內）
      var dx = d.x - playerX, dz = d.z - playerZ;
      if (dx*dx + dz*dz < 2.0 * 2.0) {
        var inv = G.inventory;
        if (inv) {
          // 預先確認背包空間（避免物品消失）
          var def = G.ItemDatabase ? G.ItemDatabase.get(d.itemId) : null;
          var canStack = def && def.stackable && !d.inst;
          var hasSpace = false;
          for (var si = 0; si < inv.slots.length; si++) {
            var ss = inv.slots[si];
            if (!ss) { hasSpace = true; break; }
            if (canStack && ss.itemId === d.itemId && !ss.inst) { hasSpace = true; break; }
          }
          if (!hasSpace) {
            if (this._bagFullCd <= 0) {
              G.Events.emit('showNotif', { msg: '🎒 背包已滿！無法撿取物品', clr: '#FF6600', duration: 2000 });
              this._bagFullCd = 3;
            }
            this._container.addChild(d._gfx);
            alive.push(d);
            continue;
          }
        }
        G.Events.emit('itemPickup', { itemId: d.itemId, qty: d.qty, inst: d.inst });
        d._gfx.destroy({ children: true });
        continue;
      }

      this._container.addChild(d._gfx);
      alive.push(d);
    }
    this._drops = alive;
  };

  G.DropManager = DropManager;
})(window.Game = window.Game || {});
