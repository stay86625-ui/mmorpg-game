(function (G) {
  'use strict';

  var ANIM = { IDLE: 0, WALK: 1, CAST: 2, HURT: 3, DIE: 4 };

  // ── 綠幕移除濾鏡（共享）────────────────────────────────────────────────────
  var CHROMA_FRAG = [
    'precision mediump float;',
    'varying vec2 vTextureCoord;',
    'uniform sampler2D uSampler;',
    'void main(){',
    '  vec4 c = texture2D(uSampler, vTextureCoord);',
    '  float g = c.g - max(c.r, c.b) * 0.85;',
    '  float a = c.a * (1.0 - smoothstep(0.20, 0.48, g));',
    '  gl_FragColor = vec4(c.rgb * a, a);',
    '}',
  ].join('\n');
  var _sharedFilter = null;
  function _cf() {
    if (!_sharedFilter) _sharedFilter = new PIXI.Filter(null, CHROMA_FRAG, {});
    return _sharedFilter;
  }

  // ── 設計圖各部件裁切區域（標準化 0-1，基於 5 張設計圖共用的版面配置）──────
  //   設計圖版面：
  //     左側：完整站姿參考（主要角色）
  //     頂列：3 款髮型變體（取第 3 款 = 最飄逸）
  //     右側上方：右臂+武器（上舉施法 / 下垂普通 / 左臂）
  //     底部左：披風尾段
  var SHEET = {
    body:  [0.04, 0.07, 0.42, 0.84],   // 完整站姿（主 body sprite）
    hair:  [0.28, 0.005, 0.14, 0.135], // 第 3 款髮型（最長最飄）
    armHi: [0.53, 0.12,  0.16, 0.16],  // 右臂+武器（上舉姿勢，施法用）
    cape:  [0.025, 0.745, 0.18, 0.25], // 披風/斗篷下擺
  };

  // 從 BaseTexture 建立指定部件的 PIXI.Texture
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
    // 統一縮放：設計圖 body 區段高度 → displayH
    var usc = H / (SHEET.body[3] * bt.height);
    this._usc = usc;

    var cf = _cf();

    // 輔助：建立部件 sprite
    function mkSp(key, ancX, ancY) {
      var sp = new PIXI.Sprite(_mkTex(bt, key));
      sp.anchor.set(ancX, ancY);
      sp.scale.set(usc);
      sp.filters = [cf];
      return sp;
    }

    // ── 背景特效層（在所有 sprite 後面）────────────────────────────────────
    this._aura = new PIXI.Graphics();
    this.container.addChild(this._aura);

    // ── 披風下擺（在 body 後面）─────────────────────────────────────────────
    //    錨點：(0.5, 0.05) ≈ 上端中央連接腰部
    //    位置：腰部 y ≈ -H*0.40
    this._capeSp = mkSp('cape', 0.5, 0.05);
    this._capeSp.position.set(0, -H * 0.40);
    this.container.addChild(this._capeSp);

    // ── 主 body（完整站姿參考圖）───────────────────────────────────────────
    //    錨點：(0.5, 1.0) = 底部中央（腳底）
    this.sprite = mkSp('body', 0.5, 1.0);
    this._baseScale = usc;
    this.container.addChild(this.sprite);

    // ── 上舉右臂（施法時顯示，蓋在 body 上面）──────────────────────────────
    //    錨點：(0.12, 0.05) ≈ 肩關節位置（臂部圖左上角附近）
    //    位置：右肩 x≈+H*0.15, y≈-H*0.70
    this._armSp = mkSp('armHi', 0.12, 0.05);
    this._armSp.position.set(H * 0.15, -H * 0.70);
    this._armSp.visible = false;
    this.container.addChild(this._armSp);

    // ── 頭髮覆蓋層（在最前面）─────────────────────────────────────────────
    //    錨點：(0.5, 1.0) = 底部（髮根位置對齊頭頂）
    //    位置：頭頂 y ≈ -H*0.86
    this._hairSp = mkSp('hair', 0.5, 1.0);
    this._hairSp.position.set(0, -H * 0.86);
    this.container.addChild(this._hairSp);

    // ── 前景特效層 ─────────────────────────────────────────────────────────
    this._fx = new PIXI.Graphics();
    this.container.addChild(this._fx);
  }

  Character.prototype.setState = function (state) {
    if (this.state === ANIM.DIE) return;
    if (state === ANIM.HURT && this.state !== ANIM.HURT) this.hurtTimer = 0.32;
    if (state !== this.state && this.state === ANIM.CAST) {
      this._aura.clear();
      this._fx.clear();
    }
    this.state = state;
  };

  Character.prototype.setFacing = function (f) {
    if (this.facing === f) return;
    this.facing = f;
    var usc = this._usc;
    // 翻轉 body / hair / cape（X 軸縮放取反）
    this.sprite.scale.x  = f * usc;
    this._hairSp.scale.x = f * usc;
    this._capeSp.scale.x = f * usc;
    // 翻轉手臂並移到對應肩膀
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

    // ── 每幀重置 ──────────────────────────────────────────────────────────
    sp.rotation = 0; sp.tint = 0xFFFFFF; sp.alpha = 1; sp.y = 0;
    sp.scale.set(f * usc, usc);
    this._armSp.visible    = false;
    this._hairSp.alpha     = 1;  this._capeSp.alpha = 1;
    this._hairSp.rotation  = 0;  this._capeSp.rotation = 0;
    this._hairSp.y         = -H * 0.86;
    this._aura.clear();
    this._fx.clear();

    switch (this.state) {

      // ── 待機：呼吸浮動 + 頭髮輕晃 + 披風輕飄 ────────────────────────
      case ANIM.IDLE: {
        var breath = Math.sin(t * 1.5) * 2.2;
        sp.y       = breath;
        sp.scale.y = usc * (1 + Math.sin(t * 1.5) * 0.009);
        this._hairSp.y        = -H * 0.86 + breath;
        this._hairSp.rotation = Math.sin(t * 2.0) * 0.045;
        this._capeSp.rotation = Math.sin(t * 1.7 + 0.5) * 0.06;
        break;
      }

      // ── 走路：身體上下彈跳 + 頭髮向後飄 + 披風拖拽 ──────────────────
      case ANIM.WALK: {
        var wp  = t * 7.0;
        sp.y        = Math.abs(Math.sin(wp)) * (-5);
        sp.rotation = f * Math.sin(wp) * 0.028;
        this._hairSp.y        = -H * 0.86 + sp.y;
        this._hairSp.rotation = -f * 0.13 + Math.sin(wp) * 0.05;
        this._capeSp.rotation = -f * 0.15 + Math.sin(wp * 0.7) * 0.08;
        break;
      }

      // ── 施法：舉起武器臂 + 身體後仰 + 法力光環 + 粒子效果 ───────────
      case ANIM.CAST: {
        sp.y        = -5;
        sp.rotation = -f * 0.08;
        sp.tint     = 0xDDCCFF;
        // 顯示上舉武器臂部件
        this._armSp.visible  = true;
        this._armSp.rotation = Math.sin(t * 2.5) * 0.06 - 0.18;
        // 頭髮因魔力衝擊稍微揚起
        this._hairSp.y        = -H * 0.86 + sp.y;
        this._hairSp.rotation = f * 0.09 + Math.sin(t * 3.0) * 0.04;
        // 脈衝法力光環（_aura 在 sprite 後面）
        var pulse  = (t % 0.6) / 0.6;
        var pAlpha = (1 - pulse) * 0.40;
        var pR     = 18 + pulse * 22;
        this._aura.beginFill(0x8844FF, pAlpha * 0.5).drawEllipse(0, -H*0.5, pR, pR*0.55).endFill();
        this._aura.lineStyle(2, 0xAA66FF, pAlpha).drawEllipse(0, -H*0.5, pR, pR*0.55).lineStyle(0);
        this._aura.beginFill(0x6622CC, 0.18).drawEllipse(0, -H*0.5, 14, 8).endFill();
        // 武器前端光點（_fx 在 sprite 前面）
        var tipX = f * H * 0.20, tipY = -H * 0.65;
        this._fx.beginFill(0xFFFFFF, 0.90).drawCircle(tipX, tipY, 4).endFill();
        this._fx.beginFill(0xAA88FF, 0.55).drawCircle(tipX, tipY, 8).endFill();
        this._fx.beginFill(0x6644FF, 0.22).drawCircle(tipX, tipY, 14).endFill();
        // 旋轉魔法粒子
        for (var pi = 0; pi < 5; pi++) {
          var ang = t * 3.0 + pi * 1.2566;
          var pr  = 12 + Math.sin(t * 2 + pi) * 3;
          this._fx.beginFill(0xCCAAFF, 0.6 + Math.sin(t * 4 + pi * 0.8) * 0.2)
                  .drawCircle(tipX + Math.cos(ang) * pr, tipY + Math.sin(ang) * pr * 0.55, 2.5)
                  .endFill();
        }
        break;
      }

      // ── 受傷：白閃紅閃 + 身體後仰 + 衝擊波 ─────────────────────────
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

      // ── 死亡：緩慢旋轉倒下 + 淡出 + 地面漣漪 ───────────────────────
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

  // ── 材質載入（用 new Image() 繞過 file:// CORS 限制）────────────────────
  // 回傳 { name: PIXI.BaseTexture } 供 Character 建立多個部件貼圖
  function loadTextures(basePath, onDone) {
    var names  = ['法師', '劍士', '弓箭手', '刺客', '伊格'];
    var result = {};
    var remain = names.length;
    names.forEach(function (name) {
      var img   = new Image();
      var url   = basePath + name + '.webp';
      img.onload = function () {
        // 從已載入的 HTMLImageElement 建立 BaseTexture（不觸發 XHR，無 CORS）
        var bt = PIXI.BaseTexture.from(img);
        result[name] = bt;
        if (--remain === 0) onDone(result);
      };
      img.onerror = function () {
        console.warn('[CharacterRenderer] 無法載入: ' + name);
        if (--remain === 0) onDone(result);
      };
      img.src = url;
    });
  }

  // ── 建立 Character 實例 ───────────────────────────────────────────────────
  function create(clsName, textures, displayH) {
    var bt = textures[clsName];
    if (!bt || !bt.valid) return null;
    return new Character(bt, displayH || 90);
  }

  G.CharacterRenderer = {
    ANIM        : ANIM,
    CROP        : SHEET.body,   // 向下相容（給外部參考用）
    loadTextures: loadTextures,
    create      : create,
  };
})(window.Game = window.Game || {});
