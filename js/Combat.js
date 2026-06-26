(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;

  var ATK_RANGE    = 1.8;
  var ATK_COOLDOWN = 0.55;
  var BASE_DMG     = 12;   // 基礎值；實際傷害加上 player.totalAtk

  // ── 傷害數字顯示 ──────────────────────────────────────────────────────────
  var DmgNumber = (function () {
    var pool = [];
    var active = [];
    var container = new PIXI.Container();

    function acquire(text, x, y, color) {
      var t;
      if (pool.length > 0) {
        t = pool.pop();
        t.text = text;
      } else {
        t = new PIXI.Text(text, { fontSize:14, fontWeight:'bold', fill:color||0xFFFFFF,
          stroke:0x000000, strokeThickness:3 });
        t.anchor.set(0.5, 1);
      }
      t.style.fill = color || 0xFFFFFF;
      t.x = x; t.y = y;
      t._vy = -60; t._life = 0.9; t._alpha = 1;
      t.alpha = 1;
      container.addChild(t);
      active.push(t);
    }

    function update(dt) {
      var alive = [];
      for (var i = 0; i < active.length; i++) {
        var t = active[i];
        t._life -= dt;
        t.y += t._vy * dt;
        t._vy *= 0.88;
        t.alpha = Math.max(0, t._life / 0.9);
        if (t._life > 0) { alive.push(t); }
        else { container.removeChild(t); pool.push(t); }
      }
      active = alive;
    }

    return { container:container, spawn:acquire, update:update };
  })();

  // ── CombatSystem ─────────────────────────────────────────────────────────
  function CombatSystem(stage) {
    this._atkCd      = 0;
    this._atkAnim    = 0;   // 攻擊動畫計時
    this._slashMesh  = null;
    this._initSlash(stage);
    stage.addChild(DmgNumber.container);
  }

  CombatSystem.prototype._initSlash = function (stage) {
    // 用 PIXI.Graphics 畫一個簡單弧形斬擊特效
    var g = new PIXI.Graphics();
    g.visible = false;
    stage.addChild(g);
    this._slashGfx = g;
  };

  CombatSystem.prototype.update = function (dt, keys, player, monsters, cam) {
    if (this._atkCd > 0) this._atkCd -= dt;
    if (this._atkAnim > 0) this._atkAnim -= dt;
    DmgNumber.update(dt);

    // ── 玩家攻擊（Space 或 J）────────────────────────────────────────────
    var wantAtk = keys[' '] || keys['j'] || keys['J'];
    this.lastHit = false;
    if (wantAtk && this._atkCd <= 0) {
      this._atkCd   = ATK_COOLDOWN;
      this._atkAnim = 0.25;
      this.lastHit  = this._doPlayerAttack(player, monsters, cam);
    }

    // ── 怪物攻擊玩家 ────────────────────────────────────────────────────
    for (var i = 0; i < monsters.length; i++) {
      var m = monsters[i];
      if (m.popAttack()) {
        var def = player.totalDef || 0;
        var hit = Math.max(1, m.atk - def + Math.floor(Math.random() * 5) - 2);
        player.takeDamage(hit);
        // 顯示玩家受傷（屏幕閃紅由 main.js 處理）
        var psx = W/2, psy = H/2;
        DmgNumber.spawn('-'+hit, psx + (Math.random()-0.5)*30, psy - 40, 0xFF4444);
      }
    }

    // ── 斬擊特效 ────────────────────────────────────────────────────────
    var g = this._slashGfx;
    if (this._atkAnim > 0) {
      var ratio = this._atkAnim / 0.25;
      var psx = W/2, psy = H/2;
      g.clear();
      g.lineStyle(4 * ratio, 0xFFFFDD, ratio * 0.9);
      var arc = player.facing * Math.PI * 0.55;
      var baseA = player.facing > 0 ? -0.8 : Math.PI - 0.4;
      for (var a = baseA; a < baseA + arc; a += 0.1) {
        var r = ATK_RANGE * SCALE * 0.7;
        var px2 = psx + Math.cos(a) * r;
        var py2 = psy + Math.sin(a) * r * ISO_Z;
        if (a === baseA) g.moveTo(px2, py2); else g.lineTo(px2, py2);
      }
      g.visible = true;
    } else {
      g.clear(); g.visible = false;
    }
  };

  CombatSystem.prototype._doPlayerAttack = function (player, monsters, cam) {
    var hitAny = false;
    for (var i = 0; i < monsters.length; i++) {
      var m = monsters[i];
      if (m.dead) continue;
      var dx = m.x - player.x, dz = m.z - player.z;
      var dist = Math.sqrt(dx*dx + dz*dz) || 0.01;
      if (dist > ATK_RANGE) continue;
      if (dx * player.facing < -ATK_RANGE * 0.3) continue;

      var atkBonus = player.totalAtk || 0;
      var dmg = BASE_DMG + atkBonus + Math.floor(Math.random() * 10);
      var kbStr = 3.5;
      m.takeDamage(dmg, dx/dist * kbStr, dz/dist * kbStr);

      var sx = W/2 + (m.x - cam.x) * SCALE;
      var sy = H/2 + (m.z - cam.z) * SCALE * ISO_Z - 20;
      DmgNumber.spawn(String(dmg), sx + (Math.random()-0.5)*20, sy, 0xFFFF88);
      hitAny = true;
    }
    return hitAny;
  };

  // 外部查詢：本幀是否有命中
  CombatSystem.prototype.lastHit = false;

  G.CombatSystem = CombatSystem;
})(window.Game = window.Game || {});
