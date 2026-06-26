(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;

  // NPC 顏色設定
  var NPC_COLORS = {
    chief:     { body:'#1a3a8c', hair:'#888880', skin:'#e8c48a' },
    merchant:  { body:'#5a3010', hair:'#3a2808', skin:'#e0b870' },
    blacksmith:{ body:'#2a2a2a', hair:'#111118', skin:'#c8903c' },
    alchemist: { body:'#1a4a1a', hair:'#2a5a1a', skin:'#d8c880' },
    guard:     { body:'#4a4a5a', hair:'#222228', skin:'#e0c088' },
  };

  function drawNPCPixel(type) {
    var cv = document.createElement('canvas');
    cv.width = 16; cv.height = 24;
    var c = cv.getContext('2d');
    var col = NPC_COLORS[type] || NPC_COLORS.chief;
    // 腳
    c.fillStyle = '#333'; c.fillRect(4, 18, 3, 6); c.fillRect(9, 18, 3, 6);
    // 身體
    c.fillStyle = col.body; c.fillRect(3, 10, 10, 9);
    // 頭
    c.fillStyle = col.skin; c.fillRect(4, 3, 8, 8);
    // 頭髮
    c.fillStyle = col.hair; c.fillRect(3, 2, 10, 3); c.fillRect(3, 3, 2, 5); c.fillRect(11, 3, 2, 5);
    // 眼
    c.fillStyle = '#111'; c.fillRect(6, 6, 1, 1); c.fillRect(9, 6, 1, 1);
    // 手臂
    c.fillStyle = col.body; c.fillRect(1, 10, 2, 6); c.fillRect(13, 10, 2, 6);
    // 特徵：商人加帽子
    if (type === 'merchant') {
      c.fillStyle = '#7a2010'; c.fillRect(2, 1, 12, 3); c.fillRect(4, -1, 8, 3);
    }
    // 鐵匠加圍裙
    if (type === 'blacksmith') {
      c.fillStyle = '#5a3a20'; c.fillRect(4, 13, 8, 6);
    }
    // 藥劑師加魔法帽
    if (type === 'alchemist') {
      c.fillStyle = '#1a5a1a'; c.fillRect(5, 0, 6, 4); c.fillRect(3, 3, 10, 2);
    }
    return cv;
  }

  // NPC 材質快取
  var _texCache = {};
  function getNPCTex(type) {
    if (!_texCache[type]) {
      var tex = PIXI.Texture.from(drawNPCPixel(type));
      tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
      _texCache[type] = tex;
    }
    return _texCache[type];
  }

  // ── NPC 類別 ──────────────────────────────────────────────────────────────
  function NPC(cfg) {
    this.id      = cfg.id;
    this.name    = cfg.name;
    this.type    = cfg.type;   // chief / merchant / blacksmith / alchemist
    this.x       = cfg.x;
    this.z       = cfg.z;
    this.dialog  = cfg.dialog; // [{text, options:[{label,action}]}]
    this.shopId  = cfg.shopId || null;
    this._t      = Math.random() * Math.PI * 2;
    this._dlgIdx = 0;

    var sc = 3.0;
    this.sprite = new PIXI.Sprite(getNPCTex(this.type));
    this.sprite.anchor.set(0.5, 1.0);
    this.sprite.scale.set(sc, sc);

    // 名稱文字
    this._nameText = new PIXI.Text(this.name, {
      fontSize: 11, fill: 0xFFEEBB, dropShadow: true, dropShadowDistance: 1,
      dropShadowColor: 0x000000,
    });
    this._nameText.anchor.set(0.5, 1);
    this._nameText.y = -this.sprite.height - 4;

    this.container = new PIXI.Container();
    this.container.addChild(this.sprite);
    this.container.addChild(this._nameText);
  }

  NPC.prototype.update = function (dt, cam) {
    this._t += dt * 1.2;
    var bob = Math.sin(this._t) * 2;
    this.sprite.y = bob;
    var sx = W/2 + (this.x - cam.x) * SCALE;
    var sy = H/2 + (this.z - cam.z) * SCALE * ISO_Z;
    this.container.x = sx;
    this.container.y = sy;
  };

  NPC.prototype.isNearPlayer = function (px, pz) {
    var dx = this.x - px, dz = this.z - pz;
    return dx*dx + dz*dz < 3.5 * 3.5;
  };

  // ── Dialog 顯示（靜態方法） ───────────────────────────────────────────────
  NPC.showDialog = function (npc) {
    var box    = document.getElementById('dialog-box');
    var nameEl = document.getElementById('dialog-name');
    var textEl = document.getElementById('dialog-text');
    var optsEl = document.getElementById('dialog-opts');
    if (!box) return;

    npc._dlgIdx = 0;
    function render(page) {
      var d = npc.dialog[page];
      if (!d) { NPC.closeDialog(); return; }
      nameEl.textContent = npc.name;
      textEl.textContent = d.text;
      optsEl.innerHTML = '';
      d.options.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.className = 'dlg-btn';
        btn.textContent = opt.label;
        btn.addEventListener('click', function () {
          if (opt.action === 'close')    { NPC.closeDialog(); return; }
          if (opt.action === 'shop')     { NPC.closeDialog(); G.shop.open(npc.shopId); return; }
          if (opt.action === 'craft')    { NPC.closeDialog(); G.craft.show(); return; }
          if (opt.action === 'quest')    { NPC.closeDialog(); G.quests.showPanel(); return; }
          if (typeof opt.action === 'number') { render(opt.action); return; }
        });
        optsEl.appendChild(btn);
      });
    }

    render(0);
    box.style.display = 'flex';
    G._uiOpen = true;
  };

  NPC.closeDialog = function () {
    var box = document.getElementById('dialog-box');
    if (box) box.style.display = 'none';
    G._checkUiOpen();
  };

  G.NPC = NPC;
})(window.Game = window.Game || {});
