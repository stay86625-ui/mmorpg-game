(function (G) {
  'use strict';

  var ANIM = { IDLE: 0, WALK: 1, CAST: 2, HURT: 3, DIE: 4 };

  // ── 設計圖各部件裁切（標準化 0-1）────────────────────────────────────────
  // y 從 17% 開始，跳過設計圖頂部散件（頭髮/肩甲區 y: 0~14%）
  var SHEET = {
    body:  [0.04, 0.17, 0.38, 0.79],
    hair:  [0.28, 0.005, 0.14, 0.135],
    armHi: [0.53, 0.12,  0.16, 0.16],
    cape:  [0.025, 0.745, 0.18, 0.25],
  };

  function _mkTex(bt, key) {
    var r  = SHEET[key];
    var iw = bt.width, ih = bt.height;
    return new PIXI.Texture(bt, new PIXI.Rectangle(
      Math.round(r[0] * iw), Math.round(r[1] * ih),
      Math.round(r[2] * iw), Math.round(r[3] * ih)
    ));
  }

  // ── GLSL 備援濾鏡（僅在 canvas 去背失敗時使用）──────────────────────────
  var CHROMA_FRAG = [
    'precision mediump float;',
    'varying vec2 vTextureCoord;',
    'uniform sampler2D uSampler;',
    'void main(){',
    '  vec4 c = texture2D(uSampler, vTextureCoord);',
    '  float overR = c.g - c.r;',
    '  float overB = c.g - c.b;',
    '  float gn = min(overR, overB);',
    '  float t = smoothstep(0.10, 0.28, gn);',
    '  float a = c.a * (1.0 - t);',
    '  gl_FragColor = vec4(c.rgb * a, a);',
    '}',
  ].join('\n');
  var _sharedFilter = null;
  function _cf() {
    if (!_sharedFilter) _sharedFilter = new PIXI.Filter(null, CHROMA_FRAG, {});
    return _sharedFilter;
  }

  // ── Canvas CPU 去背（自動偵測四角背景色，適用各種深淺綠幕）──────────────
  function _chromaKeyCanvas(img) {
    var w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) throw new Error('image not ready');
    var cv  = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    var d  = ctx.getImageData(0, 0, w, h);   // 同源 HTTPS → 不 throw
    var px = d.data;

    // 從四個角落採樣背景色（自動偵測每個角色的綠幕顏色）
    var c0 = 0, c1 = (w - 1) * 4,
        c2 = (h - 1) * w * 4,
        c3 = ((h - 1) * w + w - 1) * 4;
    var bgR = (px[c0]   + px[c1]   + px[c2]   + px[c3])   / 4;
    var bgG = (px[c0+1] + px[c1+1] + px[c2+1] + px[c3+1]) / 4;
    var bgB = (px[c0+2] + px[c1+2] + px[c2+2] + px[c3+2]) / 4;

    for (var i = 0; i < px.length; i += 4) {
      var dr = px[i]   - bgR;
      var dg = px[i+1] - bgG;
      var db = px[i+2] - bgB;
      var dist = Math.sqrt(dr*dr + dg*dg + db*db);   // 0~441
      // 近背景色 → 透明；遠 → 不動
      var t = dist < 55 ? 1 : dist > 130 ? 0 : (130 - dist) / 75;
      px[i+3] = Math.round(px[i+3] * (1 - t));
    }
    ctx.putImageData(d, 0, 0);
    return cv;
  }

  // ── Character 類別 ────────────────────────────────────────────────────────
  function Character(bt, displayH, needsFilter) {
    this.container = new PIXI.Container();
    this.state     = ANIM.IDLE;
    this.facing    = 1;
    this.animTime  = 0;
    this.hurtTimer = 0;
    this.dieTimer  = 0;
    this._H        = displayH || 160;

    var H   = this._H;
    var usc = H / (SHEET.body[3] * bt.height);
    this._usc = usc;

    var cf = needsFilter ? _cf() : null;

    function mkSp(key, ancX, ancY) {
      var sp = new PIXI.Sprite(_mkTex(bt, key));
      sp.anchor.set(ancX, ancY);
      sp.scale.set(usc);
      if (cf) sp.filters = [cf];   // canvas 去背失敗才掛 GLSL
      return sp;
    }

    this._aura = new PIXI.Graphics();
    this.container.addChild(this._aura);

    this._capeSp = mkSp('cape', 0.5, 0.05);
    this._capeSp.position.set(0, -H * 0.40);
    this.container.addChild(this._capeSp);

    this.sprite = mkSp('body', 0.5, 1.0);
    this._baseScale = usc;
    this.container.addChild(this.sprite);

    this._armSp = mkSp('armHi', 0.12, 0.05);
    this._armSp.position.set(H * 0.15, -H * 0.70);
    this._armSp.visible = false;
    this.container.addChild(this._armSp);

    this._hairSp = mkSp('hair', 0.5, 1.0);
    this._hairSp.position.set(0, -H * 0.86);
    this.container.addChild(this._hairSp);

    this._fx = new PIXI.Graphics();
    this.container.addChild(this._fx);
  }

  Character.prototype.setState = function (state) {
    if (this.state === ANIM.DIE) return;
    if (state === ANIM.HURT && this.state !== ANIM.HURT) this.hurtTimer = 0.32;
    if (state !== this.state && this.state === ANIM.CAST) {
      this._aura.clear(); this._fx.clear();
    }
    this.state = state;
  };

  Character.prototype.setFacing = function (f) {
    if (this.facing === f) return;
    this.facing = f;
    var usc = this._usc;
    this.sprite.scale.x  = f * usc;
    this._hairSp.scale.x = f * usc;
    this._capeSp.scale.x = f * usc;
    this._armSp.scale.x    = f * usc;
    this._armSp.position.x = f * this._H * 0.15;
  };

  Character.prototype.update = function (dt) {
    this.animTime += dt;
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      if (this.hurtTimer <= 0 && this.state === ANIM.HURT) this.state = ANIM.IDLE;
    }

    var sp  = this.sprite;
    var t   = this.animTime;
    var f   = this.facing;
    var H   = this._H;
    var usc = this._usc;

    sp.rotation = 0; sp.tint = 0xFFFFFF; sp.alpha = 1; sp.y = 0;
    sp.scale.set(f * usc, usc);
    this._armSp.visible   = false;
    this._hairSp.alpha    = 1; this._capeSp.alpha = 1;
    this._hairSp.rotation = 0; this._capeSp.rotation = 0;
    this._hairSp.y = -H * 0.86;
    this._aura.clear(); this._fx.clear();

    switch (this.state) {

      case ANIM.IDLE: {
        var breath = Math.sin(t * 1.5) * 2.2;
        sp.y = breath;
        sp.scale.y = usc * (1 + Math.sin(t * 1.5) * 0.009);
        this._hairSp.y        = -H * 0.86 + breath;
        this._hairSp.rotation = Math.sin(t * 2.0) * 0.045;
        this._capeSp.rotation = Math.sin(t * 1.7 + 0.5) * 0.06;
        break;
      }

      case ANIM.WALK: {
        var wp = t * 7.0;
        sp.y        = Math.abs(Math.sin(wp)) * (-5);
        sp.rotation = f * Math.sin(wp) * 0.028;
        this._hairSp.y        = -H * 0.86 + sp.y;
        this._hairSp.rotation = -f * 0.13 + Math.sin(wp) * 0.05;
        this._capeSp.rotation = -f * 0.15 + Math.sin(wp * 0.7) * 0.08;
        break;
      }

      case ANIM.CAST: {
        sp.y        = -5;
        sp.rotation = -f * 0.08;
        sp.tint     = 0xDDCCFF;
        this._armSp.visible  = true;
        this._armSp.rotation = Math.sin(t * 2.5) * 0.06 - 0.18;
        this._hairSp.y        = -H * 0.86 + sp.y;
        this._hairSp.rotation = f * 0.09 + Math.sin(t * 3.0) * 0.04;
        var pulse  = (t % 0.6) / 0.6;
        var pAlpha = (1 - pulse) * 0.40;
        var pR     = 18 + pulse * 22;
        this._aura.beginFill(0x8844FF, pAlpha * 0.5).drawEllipse(0, -H*0.5, pR, pR*0.55).endFill();
        this._aura.lineStyle(2, 0xAA66FF, pAlpha).drawEllipse(0, -H*0.5, pR, pR*0.55).lineStyle(0);
        var tipX = f * H * 0.20, tipY = -H * 0.65;
        this._fx.beginFill(0xFFFFFF, 0.90).drawCircle(tipX, tipY, 4).endFill();
        this._fx.beginFill(0xAA88FF, 0.55).drawCircle(tipX, tipY, 8).endFill();
        this._fx.beginFill(0x6644FF, 0.22).drawCircle(tipX, tipY, 14).endFill();
        for (var pi = 0; pi < 5; pi++) {
          var ang = t * 3.0 + pi * 1.2566;
          var pr  = 12 + Math.sin(t * 2 + pi) * 3;
          this._fx.beginFill(0xCCAAFF, 0.6 + Math.sin(t * 4 + pi * 0.8) * 0.2)
                  .drawCircle(tipX + Math.cos(ang) * pr, tipY + Math.sin(ang) * pr * 0.55, 2.5)
                  .endFill();
        }
        break;
      }

      case ANIM.HURT: {
        sp.tint     = Math.floor(this.hurtTimer * 18) % 2 ? 0xFFFFFF : 0xFF6666;
        sp.y        = -8;
        sp.rotation = f * 0.14;
        this._hairSp.y        = -H * 0.86 + sp.y;
        this._hairSp.rotation = f * 0.10;
        if (this.hurtTimer > 0.20) {
          var spr = (0.32 - this.hurtTimer) / 0.12 * 28;
          this._aura.lineStyle(3, 0xFF4444, (1 - spr / 28) * 0.6)
                    .drawEllipse(0, -H * 0.45, spr, spr * 0.5);
          this._aura.lineStyle(0);
        }
        break;
      }

      case ANIM.DIE: {
        this.dieTimer += dt;
        var dieF  = Math.min(this.dieTimer / 1.5, 1);
        sp.rotation = f * dieF * Math.PI * 0.45;
        sp.y       += dt * 20;
        sp.alpha    = Math.max(0, 1 - this.dieTimer * 1.1);
        this._hairSp.alpha = sp.alpha;
        this._capeSp.alpha = sp.alpha;
        if (this.dieTimer < 0.9) {
          var dr2 = this.dieTimer * 42;
          this._aura.lineStyle(3, 0x888888, Math.max(0, 0.5 - this.dieTimer * 0.55))
                    .drawEllipse(0, 0, dr2, dr2 * 0.38);
          this._aura.lineStyle(0);
        }
        break;
      }
    }
  };

  // ── 材質載入 ──────────────────────────────────────────────────────────────
  function loadTextures(basePath, onDone) {
    var names  = ['法師', '劍士', '弓箭手', '刺客', '伊格'];
    var result = {};
    var remain = names.length;

    names.forEach(function (name) {
      var img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = function () {
        var bt, needsFilter = false;
        try {
          // Canvas 去背（CPU 預處理，sprites 直接有透明背景，不需要 runtime filter）
          var canvas = _chromaKeyCanvas(img);
          bt = PIXI.BaseTexture.from(canvas);
          console.log('[CR] canvas OK: ' + name + ' ' + bt.width + 'x' + bt.height);
        } catch (e) {
          // 備援：直接用圖片，Character 會掛 GLSL filter
          console.warn('[CR] canvas fail → GLSL: ' + name + ' | ' + e.message);
          bt = PIXI.BaseTexture.from(img);
          needsFilter = true;
        }
        bt._needsFilter = needsFilter;
        result[name] = bt;
        if (--remain === 0) onDone(result);
      };

      img.onerror = function () {
        console.warn('[CR] 無法載入: ' + name);
        if (--remain === 0) onDone(result);
      };

      img.src = basePath + name + '.webp';
    });
  }

  function create(clsName, textures, displayH) {
    var bt = textures[clsName];
    if (!bt) { console.warn('[CR] no bt for ' + clsName); return null; }
    if (!bt.valid) { console.warn('[CR] bt not valid for ' + clsName); return null; }
    return new Character(bt, displayH || 160, !!bt._needsFilter);
  }

  // 職業 ID → 材質檔名（Player.js / main.js / GameFlow.js 共用）
  G.CLS_NAMES = ['法師', '劍士', '弓箭手', '伊格', '刺客'];

  G.CharacterRenderer = {
    ANIM        : ANIM,
    CROP        : SHEET.body,
    loadTextures: loadTextures,
    create      : create,
  };
})(window.Game = window.Game || {});
