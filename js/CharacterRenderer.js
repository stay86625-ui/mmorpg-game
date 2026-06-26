(function (G) {
  'use strict';

  var ANIM = { IDLE: 0, WALK: 1, CAST: 2, HURT: 3, DIE: 4 };

  // ── GLSL 綠幕移除濾鏡（以 min(overR, overB) 判斷，適應各種深淺綠）──────
  var CHROMA_FRAG = [
    'precision mediump float;',
    'varying vec2 vTextureCoord;',
    'uniform sampler2D uSampler;',
    'void main(){',
    '  vec4 c = texture2D(uSampler, vTextureCoord);',
    '  float overR = c.g - c.r;',          // 綠超出紅的量
    '  float overB = c.g - c.b;',          // 綠超出藍的量
    '  float greenness = min(overR, overB);', // 兩者都要超過才算綠幕
    '  float t = smoothstep(0.12, 0.32, greenness);',
    '  float a = c.a * (1.0 - t);',
    '  gl_FragColor = vec4(c.rgb * a, a);',
    '}',
  ].join('\n');
  var _sharedFilter = null;
  function _cf() {
    if (!_sharedFilter) _sharedFilter = new PIXI.Filter(null, CHROMA_FRAG, {});
    return _sharedFilter;
  }

  // ── 設計圖各部件裁切區域（標準化 0-1）────────────────────────────────────
  // 版面說明：
  //   左側 (x:4%~46%, y:17%~96%): 完整站姿角色（主角色，y 要從 17% 開始避開散件頭部）
  //   頂列散件 (y:0~14%): 3 款頭髮、肩甲 → 不包含在 body crop
  //   右側 (x:53%~70%): 右臂、左臂
  //   底部左 (x:2%~20%, y:74%~99%): 披風下擺
  var SHEET = {
    body:  [0.04, 0.17, 0.38, 0.79],   // 完整站姿（從 17% 開始，跳過頂部散件）
    hair:  [0.28, 0.005, 0.14, 0.135], // 第 3 款髮型（最飄）
    armHi: [0.53, 0.12,  0.16, 0.16],  // 右臂+武器上舉（施法用）
    cape:  [0.025, 0.745, 0.18, 0.25], // 披風下擺
  };

  function _mkTex(bt, key) {
    var r  = SHEET[key];
    var iw = bt.width, ih = bt.height;
    return new PIXI.Texture(bt, new PIXI.Rectangle(
      Math.round(r[0] * iw), Math.round(r[1] * ih),
      Math.round(r[2] * iw), Math.round(r[3] * ih)
    ));
  }

  // ── Character 類別 ────────────────────────────────────────────────────────
  function Character(bt, displayH) {
    this.container = new PIXI.Container();
    this.state     = ANIM.IDLE;
    this.facing    = 1;
    this.animTime  = 0;
    this.hurtTimer = 0;
    this.dieTimer  = 0;
    this._H        = displayH || 90;

    var H   = this._H;
    var usc = H / (SHEET.body[3] * bt.height);
    this._usc = usc;

    var cf = _cf();

    function mkSp(key, ancX, ancY) {
      var sp = new PIXI.Sprite(_mkTex(bt, key));
      sp.anchor.set(ancX, ancY);
      sp.scale.set(usc);
      sp.filters = [cf];
      return sp;
    }

    this._aura = new PIXI.Graphics();
    this.container.addChild(this._aura);

    // 披風（body 後面）
    this._capeSp = mkSp('cape', 0.5, 0.05);
    this._capeSp.position.set(0, -H * 0.40);
    this.container.addChild(this._capeSp);

    // 主 body
    this.sprite = mkSp('body', 0.5, 1.0);
    this._baseScale = usc;
    this.container.addChild(this.sprite);

    // 上舉手臂（施法）
    this._armSp = mkSp('armHi', 0.12, 0.05);
    this._armSp.position.set(H * 0.15, -H * 0.70);
    this._armSp.visible = false;
    this.container.addChild(this._armSp);

    // 頭髮覆蓋層
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
    this._armSp.scale.x     = f * usc;
    this._armSp.position.x  = f * this._H * 0.15;
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
        this._aura.beginFill(0x6622CC, 0.18).drawEllipse(0, -H*0.5, 14, 8).endFill();
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
        this.dieTimer  += dt;
        var dieF        = Math.min(this.dieTimer / 1.5, 1);
        sp.rotation     = f * dieF * Math.PI * 0.45;
        sp.y           += dt * 20;
        sp.alpha        = Math.max(0, 1 - this.dieTimer * 1.1);
        this._hairSp.alpha = sp.alpha;
        this._capeSp.alpha = sp.alpha;
        if (this.dieTimer < 0.9) {
          var dr = this.dieTimer * 42;
          this._aura.lineStyle(3, 0x888888, Math.max(0, 0.5 - this.dieTimer * 0.55))
                    .drawEllipse(0, 0, dr, dr * 0.38);
          this._aura.lineStyle(0);
        }
        break;
      }
    }
  };

  // ── 材質載入：PIXI 直接從 URL 載入（GitHub Pages 同源 HTTPS，無 CORS 問題）──
  function loadTextures(basePath, onDone) {
    var names  = ['法師', '劍士', '弓箭手', '刺客', '伊格'];
    var result = {};
    var remain = names.length;
    names.forEach(function (name) {
      var bt = PIXI.BaseTexture.from(basePath + name + '.webp');
      function done() {
        result[name] = bt;
        console.log('[CR] loaded: ' + name + ' ' + bt.width + 'x' + bt.height);
        if (--remain === 0) onDone(result);
      }
      if (bt.valid) {
        done();
      } else {
        bt.on('loaded', done);
        bt.on('error', function () {
          console.warn('[CR] 無法載入: ' + name);
          if (--remain === 0) onDone(result);
        });
      }
    });
  }

  function create(clsName, textures, displayH) {
    var bt = textures[clsName];
    if (!bt) { console.warn('[CR] create: no bt for ' + clsName); return null; }
    if (!bt.valid) { console.warn('[CR] create: bt not valid for ' + clsName); return null; }
    return new Character(bt, displayH || 90);
  }

  // 職業 ID → 材質檔名（Player.js / main.js / GameFlow.js 都用到）
  G.CLS_NAMES = ['法師', '劍士', '弓箭手', '伊格', '刺客'];

  G.CharacterRenderer = {
    ANIM        : ANIM,
    CROP        : SHEET.body,
    loadTextures: loadTextures,
    create      : create,
  };
})(window.Game = window.Game || {});
