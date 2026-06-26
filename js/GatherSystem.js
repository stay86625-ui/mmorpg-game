(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;

  // 資源節點類型
  var NODE_DEFS = {
    tree_node:    { name:'枯樹樁', icon:'🪵', drops:[{id:'wood', min:2, max:4}],       clr:0x5A3010, r:8,  respawn:45 },
    ore_vein:     { name:'鐵礦脈', icon:'⛏',  drops:[{id:'iron_ore', min:1, max:3}],   clr:0x776666, r:7,  respawn:60 },
    herb_patch:   { name:'草藥叢', icon:'🌿', drops:[{id:'herb', min:2, max:4}],         clr:0x2A6A1A, r:6,  respawn:30 },
    crystal_node: { name:'魔法水晶', icon:'💎', drops:[{id:'magic_crystal', min:1, max:2}], clr:0x4488CC, r:7, respawn:90 },
  };

  // 固定/程序資源節點
  function GatherNode(typeId, wx, wz) {
    this.typeId    = typeId;
    this.def       = NODE_DEFS[typeId];
    this.x         = wx;
    this.z         = wz;
    this.respawnCd = 0;
    this.depleted  = false;
    this._t        = Math.random() * Math.PI * 2;
    this._gfx      = new PIXI.Graphics();
    this._label    = new PIXI.Text(this.def.icon, { fontSize: 14 });
    this._label.anchor.set(0.5, 1);
    this._label.y = -this.def.r - 4;
    this._gfx.addChild(this._label);
  }

  GatherNode.prototype.gather = function () {
    if (this.depleted) return null;
    this.depleted  = true;
    this.respawnCd = this.def.respawn;
    var results = [];
    this.def.drops.forEach(function (d) {
      var qty = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
      results.push({ id: d.id, qty: qty });
    });
    return results;
  };

  GatherNode.prototype.update = function (dt, cam) {
    if (this.depleted) {
      this.respawnCd -= dt;
      if (this.respawnCd <= 0) this.depleted = false;
    }

    this._t += dt * 1.5;
    var sx = W/2 + (this.x - cam.x) * SCALE;
    var sy = H/2 + (this.z - cam.z) * SCALE * ISO_Z;
    var g  = this._gfx;
    var r  = this.def.r;
    g.clear();
    g.alpha = this.depleted ? 0.3 : 1;
    if (!this.depleted) {
      var bob = Math.sin(this._t) * 1.5;
      g.beginFill(0x000000, 0.25).drawEllipse(0, 2, r * 1.3, r * 0.4).endFill();
      g.beginFill(this.def.clr).drawCircle(0, bob, r).endFill();
      g.lineStyle(1.5, 0xFFFFFF, 0.3).drawCircle(0, bob, r);
      this._label.y = bob - r - 2;
      this._label.alpha = 1;
    } else {
      g.beginFill(0x444444).drawCircle(0, 0, r * 0.6).endFill();
      this._label.alpha = 0.3;
    }
    g.x = sx; g.y = sy;
  };

  GatherNode.prototype.isNear = function (px, pz) {
    var dx = this.x - px, dz = this.z - pz;
    return dx*dx + dz*dz < 2.8 * 2.8;
  };

  // ── GatherSystem ──────────────────────────────────────────────────────────
  function GatherSystem(stage) {
    this._nodes     = [];
    this._container = new PIXI.Container();
    stage.addChild(this._container);
    this._hintEl   = document.getElementById('gather-hint');
    this._nearNode = null;

    // 在世界各處放置資源節點（固定種子）
    this._generateNodes();
  }

  GatherSystem.prototype._generateNodes = function () {
    var rng = G.Noise.seededRNG(12345);
    var configs = [
      // 新手村附近
      {type:'tree_node',  x:-15, z:5},   {type:'tree_node',  x:20, z:8},
      {type:'ore_vein',   x:-20, z:-5},  {type:'ore_vein',   x:25, z:-12},
      {type:'herb_patch', x:10, z:15},   {type:'herb_patch', x:-8, z:20},
      {type:'crystal_node', x:30, z:18},
    ];
    var types = ['tree_node','tree_node','ore_vein','herb_patch','crystal_node'];
    // 在整個地圖隨機生成更多節點
    for (var i = 0; i < 80; i++) {
      var wx = (rng() - 0.5) * 300;
      var wz = (rng() - 0.5) * 300;
      var t  = types[Math.floor(rng() * types.length)];
      configs.push({type:t, x:wx, z:wz});
    }
    for (var j = 0; j < configs.length; j++) {
      var c = configs[j];
      this._nodes.push(new GatherNode(c.type, c.x, c.z));
    }
  };

  GatherSystem.prototype.update = function (dt, cam, playerX, playerZ, keys) {
    this._container.removeChildren();
    this._nearNode = null;

    // 只渲染鏡頭附近的節點
    var viewR = 25;
    for (var i = 0; i < this._nodes.length; i++) {
      var n  = this._nodes[i];
      var dx = n.x - playerX, dz = n.z - playerZ;
      if (dx*dx + dz*dz > viewR * viewR) continue;

      n.update(dt, cam);
      this._container.addChild(n._gfx);

      if (!n.depleted && n.isNear(playerX, playerZ)) {
        this._nearNode = n;
      }
    }

    if (this._hintEl) {
      this._hintEl.style.display = this._nearNode ? 'block' : 'none';
      if (this._nearNode) this._hintEl.textContent = '按 [G] 採集「' + this._nearNode.def.name + '」';
    }

    if (this._nearNode && (keys['g'] || keys['G'])) {
      keys['g'] = false; keys['G'] = false;
      var results = this._nearNode.gather();
      if (results) {
        results.forEach(function (r) {
          G.Events.emit('itemPickup', { itemId: r.id, qty: r.qty });
        });
        G.Events.emit('achievementCheck', { type: 'gather' });
      }
    }
  };

  G.GatherSystem = GatherSystem;
})(window.Game = window.Game || {});
