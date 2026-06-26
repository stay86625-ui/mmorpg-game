(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;

  // Boss 定義（每個生態區一個）
  var BOSS_DEFS = [
    {
      id:'tree_spirit',   name:'樹妖王',     biome:'F',
      x:60,   z:50,
      maxHp:3000, atk:45, spd:1.8, scale:3.0,
      color:{r:0x22, g:0x88, b:0x22}, shape:'tall',
      phase2Hp:0.5, phase2SpeedMult:1.5, phase2AtkMult:1.4,
      drops:[{id:'wood',qty:5},{id:'iron_sword',qty:1},{id:'steel_ingot',qty:3}],
      exp:800, gold:{min:200, max:400},
    },
    {
      id:'frost_wolf',    name:'霜牙首領',    biome:'S',
      x:-80,  z:-120,
      maxHp:5000, atk:70, spd:2.5, scale:3.5,
      color:{r:0xAA, g:0xCC, b:0xFF}, shape:'quad',
      phase2Hp:0.5, phase2SpeedMult:1.6, phase2AtkMult:1.5,
      exp:1200, gold:{min:300, max:600},
    },
    {
      id:'lava_king',     name:'熔岩王',      biome:'V',
      x:180,  z:200,
      maxHp:8000, atk:100, spd:1.5, scale:4.0,
      color:{r:0xFF, g:0x44, b:0x00}, shape:'tall',
      phase2Hp:0.4, phase2SpeedMult:1.8, phase2AtkMult:1.7,
      exp:2000, gold:{min:500, max:1000},
    },
    {
      id:'abyss_lord',    name:'深淵王',      biome:'A',
      x:-200, z:250,
      maxHp:15000, atk:150, spd:2.0, scale:5.0,
      color:{r:0x33, g:0x00, b:0x55}, shape:'tall',
      phase2Hp:0.3, phase2SpeedMult:2.0, phase2AtkMult:2.0,
      exp:5000, gold:{min:1000, max:2500},
    },
  ];

  // ── Boss 怪物類別 ─────────────────────────────────────────────────────────
  function Boss(def) {
    this.def     = def;
    this.x       = def.x;
    this.z       = def.z;
    this.hp      = def.maxHp;
    this.maxHp   = def.maxHp;
    this.atk     = def.atk;
    this.spd     = def.spd;
    this.vx      = 0; this.vz = 0;
    this.phase   = 1;
    this.dead    = false;
    this.facing  = 1;
    this._atkCd  = 0;
    this._animT  = 0;
    this._pendingAtk = false;

    // 借用 Monster 的 drawMonster 函式
    var monDef = { r:def.color.r, g:def.color.g, b:def.color.b,
                   w:28, h:32, shape: def.shape || 'tall' };
    var sc = def.scale || 3.0;
    var tex = PIXI.Texture.from(G._drawBossPixel(monDef));
    tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    this.sprite = new PIXI.Sprite(tex);
    this.sprite.anchor.set(0.5, 1.0);
    this.sprite.scale.set(sc, sc);

    // 名稱標籤
    this._nameText = new PIXI.Text('👑 ' + def.name, {
      fontSize:14, fill:0xFFDD44,
      dropShadow:true, dropShadowDistance:2, dropShadowColor:0x000000,
    });
    this._nameText.anchor.set(0.5, 1);
    this._nameText.y = -this.sprite.height - 6;

    this._hpGfx = new PIXI.Graphics();
    this.container = new PIXI.Container();
    this.container.addChild(this.sprite);
    this.container.addChild(this._nameText);
    this.container.addChild(this._hpGfx);
  }

  Boss.AGGRO_RANGE = 20;
  Boss.ATK_RANGE   = 2.0;

  Boss.prototype.update = function (dt, px, pz) {
    if (this.dead) return;
    this._animT += dt;
    if (this._atkCd > 0) this._atkCd -= dt;

    // Phase 2 判斷
    if (this.phase === 1 && this.hp / this.maxHp <= (this.def.phase2Hp || 0.5)) {
      this.phase = 2;
      this.atk *= (this.def.phase2AtkMult || 1.5);
      this.spd *= (this.def.phase2SpeedMult || 1.5);
      this.sprite.tint = 0xFF8844;
      G.Events.emit('bossPhase2', { boss: this });
    }

    var dx = px - this.x, dz = pz - this.z;
    var dist = Math.sqrt(dx*dx + dz*dz);

    if (dist < Boss.AGGRO_RANGE) {
      if (dist > Boss.ATK_RANGE) {
        this.vx = (dx/dist) * this.spd;
        this.vz = (dz/dist) * this.spd;
        if (dx > 0) this.facing = 1; else this.facing = -1;
      } else {
        this.vx *= 0.5; this.vz *= 0.5;
        if (this._atkCd <= 0) {
          this._atkCd  = 1.8 / (this.phase === 2 ? 1.5 : 1);
          this._pendingAtk = true;
        }
      }
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.vx *= 0.80; this.vz *= 0.80;

    var bob = Math.abs(Math.sin(this._animT * 3)) * -5;
    this.sprite.y = bob;
    this.sprite.scale.x = this.facing * Math.abs(this.sprite.scale.x);

    this._drawBossHpBar();
  };

  Boss.prototype._drawBossHpBar = function () {
    var g    = this._hpGfx;
    g.clear();
    var ratio = Math.max(0, this.hp / this.maxHp);
    var bw = 60, bh = 6;
    var oy = -this.sprite.height - 12;
    g.beginFill(0x330000).drawRect(-bw/2, oy, bw, bh).endFill();
    g.beginFill(this.phase === 2 ? 0xFF6600 : 0xFF2222).drawRect(-bw/2, oy, bw * ratio, bh).endFill();
    if (this.phase === 2) {
      g.lineStyle(1, 0xFFAA00, 0.8).drawRect(-bw/2, oy, bw, bh);
    }
  };

  Boss.prototype.takeDamage = function (dmg, kbx, kbz) {
    if (this.dead) return;
    this.hp -= dmg;
    this.sprite.tint = (this.phase === 2 ? 0xFFCC88 : 0xFF8888);
    setTimeout(function(s){ s.tint = 0xFFFFFF; }, 150, this.sprite);
    if (kbx) { this.vx += kbx * 0.4; this.vz += kbz * 0.4; }
    if (this.hp <= 0) {
      this.dead = true;
      G.Events.emit('bossDead', { boss: this });
    }
  };

  Boss.prototype.popAttack = function () {
    if (this._pendingAtk) { this._pendingAtk = false; return true; }
    return false;
  };

  Boss.prototype.setScreenPos = function (cam) {
    var sx = W/2 + (this.x - cam.x) * SCALE;
    var sy = H/2 + (this.z - cam.z) * SCALE * ISO_Z;
    this.container.x = sx;
    this.container.y = sy;
  };

  // ── BossSystem ────────────────────────────────────────────────────────────
  function BossSystem(stage) {
    this._bosses    = [];
    this._alive     = null;   // 當前活躍 Boss
    this._container = new PIXI.Container();
    stage.addChild(this._container);

    this._barEl     = document.getElementById('boss-bar');
    this._barFill   = document.getElementById('boss-bar-fill');
    this._barName   = document.getElementById('boss-bar-name');

    // 初始化所有 Boss 的重生點（進入範圍觸發）
    this._spawnZones = BOSS_DEFS.map(function (d) {
      return { def:d, cooldown:0, active:false };
    });

    var self = this;
    G.Events.on('bossDead', function (e) { self._onBossDead(e.boss); });
    G.Events.on('bossPhase2', function () {
      if (self._barFill) self._barFill.style.background = 'linear-gradient(90deg,#AA3300,#FF6600)';
    });
    G.Events.on('bossRageStart', function () {
      var boss = self._alive;
      if (!boss || boss.dead || boss._raging) return;
      boss._raging = true;
      boss.atk     = Math.round(boss.atk * 1.5);
      boss.spd     = Math.min(boss.spd * 1.3, 6);
      boss.sprite.tint = 0xFF2200;
      self._showNotif('⚡ Boss 進入狂暴狀態！傷害大幅提升！');
    });
    G.Events.on('bossRageEnd', function () {
      var boss = self._alive;
      if (!boss || boss.dead || !boss._raging) return;
      boss._raging = false;
      boss.atk     = Math.round(boss.atk / 1.5);
      boss.spd     = boss.spd / 1.3;
      boss.sprite.tint = (boss.phase === 2) ? 0xFF8844 : 0xFFFFFF;
    });
  }

  // 提供給 Combat 系統查詢的接口
  BossSystem.prototype.getActiveBoss = function () { return this._alive; };

  BossSystem.prototype.update = function (dt, playerX, playerZ, cam, combat) {
    this._container.removeChildren();

    // 更新重生冷卻
    for (var i = 0; i < this._spawnZones.length; i++) {
      var z = this._spawnZones[i];
      if (z.cooldown > 0) z.cooldown -= dt;
      if (z.active) continue;
      if (z.cooldown > 0) continue;
      // 進入範圍 → 觸發 Boss
      var dx = z.def.x - playerX, dz = z.def.z - playerZ;
      if (dx*dx + dz*dz < 18 * 18) {
        this._spawnBoss(z);
      }
    }

    if (!this._alive) {
      if (this._barEl) this._barEl.style.display = 'none';
      return;
    }

    var boss = this._alive;
    boss.update(dt, playerX, playerZ);

    if (boss.dead) {
      boss.sprite.alpha = Math.max(0, boss.sprite.alpha - dt * 0.8);
      if (boss.sprite.alpha <= 0) this._alive = null;
    }

    boss.setScreenPos(cam);
    this._container.addChild(boss.container);

    // 更新頂部 HP 條
    if (this._barEl) {
      this._barEl.style.display = 'block';
      var ratio = Math.max(0, boss.hp / boss.maxHp * 100).toFixed(1);
      this._barFill.style.width = ratio + '%';
      this._barName.textContent = '👑 ' + boss.def.name + (boss.phase === 2 ? ' ⚠ Phase 2' : '');
    }
  };

  BossSystem.prototype._spawnBoss = function (zone) {
    var boss = new Boss(zone.def);
    this._alive = boss;
    zone.active = true;
    this._currentZone = zone;
    G.Events.emit('bossSpawn', { boss: boss });
    this._showNotif('⚠ Boss 出現！【' + zone.def.name + '】');
  };

  BossSystem.prototype._onBossDead = function (boss) {
    // 掉落
    var inv = G.inventory;
    if (inv) {
      var gold = boss.def.gold.min + Math.floor(Math.random() * (boss.def.gold.max - boss.def.gold.min));
      inv.gold += gold;
      inv._renderGold();
    }
    if (G._levelSys && G._player) G._levelSys.addExp(boss.def.exp, G._player);

    if (this._currentZone) {
      this._currentZone.active   = false;
      this._currentZone.cooldown = 300; // 5 分鐘後重生
    }
    this._showNotif('💀 Boss 擊敗！【' + boss.def.name + '】');
  };

  BossSystem.prototype._showNotif = function (msg) {
    var el = document.getElementById('boss-notif');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(function () { el.style.display = 'none'; }, 5000);
  };

  // Boss 像素繪製（用 Monster 的 drawMonster 底層邏輯）
  G._drawBossPixel = function (def) {
    var W2 = def.w * 3, H2 = def.h * 3;
    var cv = document.createElement('canvas');
    cv.width = W2; cv.height = H2;
    var c = cv.getContext('2d');
    var r = def.r, g = def.g, b = def.b;
    var col  = 'rgb('+r+','+g+','+b+')';
    var dark = 'rgb('+Math.floor(r*.4)+','+Math.floor(g*.4)+','+Math.floor(b*.4)+')';
    var lite = 'rgb('+Math.min(255,r+80)+','+Math.min(255,g+80)+','+Math.min(255,b+80)+')';
    var S = 3;
    c.fillStyle = dark; c.fillRect(S*4, S*10, W2-S*8, H2-S*12);
    c.fillStyle = col;  c.fillRect(S*3, S*2, W2-S*6, S*9);
    c.fillStyle = lite; c.fillRect(S*5, S*3, S*4, S*3);
    c.fillStyle = '#600010'; c.fillRect(S*5, S*5, S*2, S*2); c.fillRect(W2-S*7, S*5, S*2, S*2);
    c.fillStyle = col; c.fillRect(S*2, 0, S*2, S*3); c.fillRect(W2-S*4, 0, S*2, S*3);
    return cv;
  };

  G.BossSystem = BossSystem;
  G.BOSS_DEFS  = BOSS_DEFS;
})(window.Game = window.Game || {});
