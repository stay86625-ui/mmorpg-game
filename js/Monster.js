(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;

  var STATE = { IDLE:0, CHASE:1, ATTACK:2, HURT:3, DEAD:4 };

  // ── 每種怪物的像素顏色設定 ──────────────────────────────────────────────
  var MONSTER_DEFS = {
    slime:      { r:0x44,g:0xCC,b:0x44, w:14, h:10, shape:'blob'   },
    wolf:       { r:0x88,g:0x88,b:0x99, w:18, h:14, shape:'quad'   },
    rabbit:     { r:0xDD,g:0xCC,b:0xBB, w:10, h:12, shape:'slim'   },
    boar:       { r:0x55,g:0x33,b:0x22, w:20, h:14, shape:'quad'   },
    snowWolf:   { r:0xCC,g:0xDD,b:0xEE, w:18, h:14, shape:'quad'   },
    iceElem:    { r:0x88,g:0xCC,b:0xFF, w:14, h:18, shape:'spike'  },
    scorpion:   { r:0xAA,g:0x77,b:0x22, w:18, h:12, shape:'wide'   },
    sandworm:   { r:0xCC,g:0xAA,b:0x55, w:22, h:14, shape:'quad'   },
    fireElem:   { r:0xFF,g:0x55,b:0x11, w:14, h:18, shape:'spike'  },
    lavaDemon:  { r:0xAA,g:0x22,b:0x00, w:20, h:22, shape:'tall'   },
    voidSpirit: { r:0x99,g:0x44,b:0xCC, w:16, h:20, shape:'spike'  },
    abyssLord:  { r:0x22,g:0x00,b:0x33, w:28, h:28, shape:'tall'   },
  };

  // ── 繪製像素怪物到 canvas ─────────────────────────────────────────────────
  function drawMonster(def, scale) {
    scale = scale || 2;
    var W = def.w * scale, H = def.h * scale;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    var r = def.r, g = def.g, b = def.b;
    var col  = 'rgb('+r+','+g+','+b+')';
    var dark = 'rgb('+Math.floor(r*.4)+','+Math.floor(g*.4)+','+Math.floor(b*.4)+')';
    var lite = 'rgb('+Math.min(255,r+60)+','+Math.min(255,g+60)+','+Math.min(255,b+60)+')';
    var S = scale;

    c.fillStyle = dark;

    if (def.shape === 'blob') {
      // 圓形 blob（史萊姆）
      c.fillStyle = dark;
      c.fillRect(S*2, S*3, def.w*S-S*4, def.h*S-S*3);
      c.fillStyle = col;
      c.fillRect(S*1, S*2, def.w*S-S*2, def.h*S-S*4);
      c.fillStyle = lite;
      c.fillRect(S*2, S*2, S*3, S*2);
      // 眼睛
      c.fillStyle = '#000';
      c.fillRect(S*3, S*4, S, S*2);
      c.fillRect(def.w*S-S*4, S*4, S, S*2);
    } else if (def.shape === 'spike') {
      // 尖刺形（元素）
      c.fillStyle = col;
      c.fillRect(S*3, S*6, def.w*S-S*6, def.h*S-S*8);
      c.fillRect(S*4, S*2, def.w*S-S*8, S*5);
      c.fillRect(S*5, 0, def.w*S-S*10, S*3);
      c.fillStyle = lite;
      c.fillRect(S*5, S*2, S*2, S*4);
    } else if (def.shape === 'tall') {
      // 高大（惡魔）
      c.fillStyle = col;
      c.fillRect(S*4, S*8, def.w*S-S*8, def.h*S-S*10);
      c.fillRect(S*3, S*2, def.w*S-S*6, S*7);
      c.fillStyle = dark;
      c.fillRect(S*5, S*4, S*2, S*2);
      c.fillRect(def.w*S-S*7, S*4, S*2, S*2);
      // 角
      c.fillStyle = col;
      c.fillRect(S*2, 0, S*2, S*3);
      c.fillRect(def.w*S-S*4, 0, S*2, S*3);
    } else if (def.shape === 'wide') {
      // 寬扁（蠍子、豬）
      c.fillStyle = col;
      c.fillRect(S*2, S*3, def.w*S-S*4, def.h*S-S*5);
      c.fillRect(0, S*4, S*3, S*4);
      c.fillRect(def.w*S-S*3, S*4, S*3, S*4);
      c.fillStyle = dark;
      c.fillRect(S*3, S*5, S*2, S*2);
      c.fillRect(def.w*S-S*5, S*5, S*2, S*2);
    } else {
      // 四腳獸：狼、豬
      c.fillStyle = col;
      c.fillRect(S*2, S*2, def.w*S-S*4, def.h*S-S*6);
      c.fillRect(S*3, S*8, S*3, S*5);
      c.fillRect(def.w*S-S*6, S*8, S*3, S*5);
      c.fillRect(S*2, S*4, S*3, S*5);
      c.fillRect(def.w*S-S*5, S*4, S*3, S*5);
      c.fillStyle = lite;
      c.fillRect(S*3, S*2, S*2, S*2);
      // 眼
      c.fillStyle = '#FF4';
      c.fillRect(S*4, S*3, S, S);
    }
    return cv;
  }

  // 材質快取（同種怪物共用）
  var _texCache = {};
  function getMonsterTex(id, def) {
    if (!_texCache[id]) {
      var scale = def.shape === 'tall' || id === 'abyssLord' ? 3 : 2;
      var tex = PIXI.Texture.from(drawMonster(def, scale));
      tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
      _texCache[id] = tex;
    }
    return _texCache[id];
  }

  // ── Monster 類別 ──────────────────────────────────────────────────────────
  function Monster(typeData, wx, wz) {
    this.type    = typeData;
    this.x       = wx;
    this.z       = wz;
    this.vx      = 0;
    this.vz      = 0;
    this.hp      = typeData.maxHp;
    this.maxHp   = typeData.maxHp;
    this.atk     = typeData.atk;
    this.spd     = typeData.spd;
    this.state   = STATE.IDLE;
    this.facing  = 1;
    this.animT   = 0;
    this.hurtT   = 0;
    this.atkCd   = 0;
    this.idleT   = Math.random() * 2;
    this.dead    = false;

    var def = MONSTER_DEFS[typeData.id] || MONSTER_DEFS['slime'];
    this._def = def;
    var sc = typeData.scale || 1.0;
    this.sprite = new PIXI.Sprite(getMonsterTex(typeData.id, def));
    this.sprite.anchor.set(0.5, 1.0);
    this.sprite.scale.set(sc, sc);

    // HP 條（PIXI.Graphics）
    this._hpBar = new PIXI.Graphics();
    this.container = new PIXI.Container();
    this.container.addChild(this.sprite);
    this.container.addChild(this._hpBar);
  }

  Monster.AGGRO_RANGE  = 9.0;
  Monster.DEAGGRO_RANGE = 14.0;
  Monster.ATK_RANGE    = 1.2;

  Monster.prototype.update = function (dt, playerX, playerZ) {
    if (this.dead) return;
    this.animT += dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.atkCd > 0) this.atkCd -= dt;

    var dx = playerX - this.x, dz = playerZ - this.z;
    var dist = Math.sqrt(dx*dx + dz*dz);

    switch (this.state) {
      case STATE.IDLE:
        this.idleT -= dt;
        if (this.idleT <= 0) {
          this.idleT = 1.5 + Math.random() * 2;
          // 小幅隨機漫步
          this.vx = (Math.random()-0.5) * 0.8;
          this.vz = (Math.random()-0.5) * 0.8;
        }
        if (dist < Monster.AGGRO_RANGE) this.state = STATE.CHASE;
        break;

      case STATE.CHASE:
        if (dist > Monster.DEAGGRO_RANGE) { this.state = STATE.IDLE; break; }
        if (dist < Monster.ATK_RANGE) { this.state = STATE.ATTACK; break; }
        var spd = this.spd * 0.7;
        this.vx = (dx / dist) * spd;
        this.vz = (dz / dist) * spd;
        if (dx > 0) this.facing = 1; else this.facing = -1;
        break;

      case STATE.ATTACK:
        this.vx *= 0.5; this.vz *= 0.5;
        if (dist > Monster.ATK_RANGE * 1.4) { this.state = STATE.CHASE; break; }
        if (this.atkCd <= 0) {
          this.atkCd = 1.2;
          // 傳回攻擊事件給 Combat 系統
          this._pendingAtk = true;
        }
        break;

      case STATE.HURT:
        this.vx *= 0.7; this.vz *= 0.7;
        if (this.hurtT <= 0) this.state = dist < Monster.AGGRO_RANGE ? STATE.CHASE : STATE.IDLE;
        break;

      case STATE.DEAD:
        this.vx *= 0.85; this.vz *= 0.85;
        this.sprite.alpha = Math.max(0, this.sprite.alpha - dt * 1.2);
        if (this.sprite.alpha <= 0) this.dead = true;
        return;
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.vx *= 0.82; this.vz *= 0.82;

    // 動畫
    var bob = 0;
    if (this.state === STATE.CHASE || this.state === STATE.ATTACK) {
      bob = Math.abs(Math.sin(this.animT * 8)) * -3;
    } else {
      bob = Math.sin(this.animT * 1.8) * 1.2;
    }
    this.sprite.y = bob;
    this.sprite.scale.x = this.facing * Math.abs(this.sprite.scale.x);

    // 受傷閃紅
    this.sprite.tint = (this.state === STATE.HURT && this.hurtT > 0.08) ? 0xFF6666 : 0xFFFFFF;

    // HP 條
    this._drawHpBar();
  };

  Monster.prototype._drawHpBar = function () {
    var g = this._hpBar;
    g.clear();
    if (this.hp >= this.maxHp) return;
    var ratio = Math.max(0, this.hp / this.maxHp);
    var bw = 30, bh = 4;
    g.beginFill(0x330000);
    g.drawRect(-bw/2, -this._def.h*2 - 8, bw, bh);
    g.endFill();
    g.beginFill(ratio > 0.5 ? 0x44FF44 : ratio > 0.25 ? 0xFFAA00 : 0xFF2222);
    g.drawRect(-bw/2, -this._def.h*2 - 8, bw * ratio, bh);
    g.endFill();
  };

  Monster.prototype.takeDamage = function (dmg, kbx, kbz) {
    if (this.state === STATE.DEAD) return;
    this.hp -= dmg;
    this.hurtT = 0.25;
    if (kbx !== undefined) { this.vx += kbx; this.vz += kbz; }
    this.state = this.hp <= 0 ? STATE.DEAD : STATE.HURT;
    if (this.state === STATE.DEAD) {
      this.sprite.rotation = 0.4;
      G.Events.emit('monsterDead', { monster: this });
    }
  };

  // 回傳攻擊事件（每次 update 後由 MonsterManager 消耗）
  Monster.prototype.popAttack = function () {
    if (this._pendingAtk) { this._pendingAtk = false; return true; }
    return false;
  };

  // 更新螢幕位置
  Monster.prototype.setScreenPos = function (cam) {
    var sx = W/2 + (this.x - cam.x) * SCALE;
    var sy = H/2 + (this.z - cam.z) * SCALE * ISO_Z;
    this.container.x = sx;
    this.container.y = sy;
  };

  G.Monster      = Monster;
  G.MONSTER_DEFS = MONSTER_DEFS;
  G.MON_STATE    = STATE;
})(window.Game = window.Game || {});
