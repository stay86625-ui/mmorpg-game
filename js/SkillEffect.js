(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;

  // ── 單個特效實例 ──────────────────────────────────────────────────────────
  function Effect(type, wx, wz, opts) {
    this.type    = type;
    this.x       = wx;  this.z    = wz;
    this.vx      = opts.vx || 0; this.vz = opts.vz || 0;
    this.life    = opts.life || 1.0;
    this.maxLife = this.life;
    this.dmg     = opts.dmg   || 30;
    this.radius  = opts.radius || 1.2;
    this.facing  = opts.facing || 1;
    this.pierce  = !!opts.pierce;
    this._seed   = Math.random() * 100;   // 穩定隨機種子
    this.hit     = {};
    this.dead    = false;
    this.animT   = 0;

    this.container = new PIXI.Container();
    this._g  = new PIXI.Graphics();
    this._g2 = new PIXI.Graphics();
    this.container.addChild(this._g);
    this.container.addChild(this._g2);
  }

  // ── 每幀更新 ──────────────────────────────────────────────────────────────
  Effect.prototype.update = function (dt, monsters) {
    this.life  -= dt;
    this.animT += dt;
    if (this.life <= 0) { this.dead = true; return; }

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // 毒霧：固定間隔傷害
    if (this.type === 'poison_mist') {
      this._ptick = (this._ptick || 0) + dt;
      if (this._ptick >= 0.35) { this._ptick = 0; this._hitCheck(monsters, true); }
    } else if (this.type === 'light_pillar') {
      this._ptick = (this._ptick || 0) + dt;
      if (this._ptick >= 0.45) { this._ptick = 0; this._hitCheck(monsters, true); }
    } else {
      this._hitCheck(monsters, this.pierce);
    }

    this._draw(this.life / this.maxLife);
  };

  Effect.prototype._hitCheck = function (monsters, multi) {
    if (!monsters) return;
    for (var i = 0; i < monsters.length; i++) {
      var m = monsters[i];
      if (m.dead || (this.hit[i] && !multi)) continue;
      var dx = m.x - this.x, dz = m.z - this.z;
      if (Math.sqrt(dx * dx + dz * dz) < this.radius) {
        var kbStr = 3.0;
        var dist  = Math.sqrt(dx*dx + dz*dz) || 0.01;
        m.takeDamage(this.dmg, dx/dist * kbStr, dz/dist * kbStr);
        this.hit[i] = true;
        if (!multi && !this.pierce) { this.dead = true; return; }
      }
    }
  };

  // ── 繪製特效 ──────────────────────────────────────────────────────────────
  Effect.prototype._draw = function (ratio) {
    var g = this._g, g2 = this._g2;
    g.clear(); g2.clear();
    var t = this.animT, s = this._seed;

    switch (this.type) {

      case 'fireball': {
        var r = 10 + Math.sin(t * 18 + s) * 2.5;
        g.beginFill(0xFF1800, ratio * 0.75).drawCircle(0, 0, r + 5).endFill();
        g.beginFill(0xFF6600, ratio).drawCircle(0, 0, r).endFill();
        g.beginFill(0xFFBB00, ratio * 0.9).drawCircle(0, 0, r * 0.55).endFill();
        g.beginFill(0xFFFFAA, ratio * 0.7).drawCircle(0, 0, r * 0.22).endFill();
        // 尾焰
        for (var fi = 0; fi < 5; fi++) {
          var fa = s + fi * 1.2 + t * 4;
          var fd = 8 + Math.sin(t * 10 + fi) * 4;
          g2.beginFill(0xFF4400, ratio * 0.35)
            .drawCircle(-this.facing * fd + Math.cos(fa)*3, Math.sin(fa)*3, 4).endFill();
        }
        break;
      }

      case 'ice_arrow': {
        var f = this.facing;
        g.lineStyle(3, 0xAAE8FF, ratio)
         .moveTo(-18 * f, 0).lineTo(18 * f, 0);
        g.beginFill(0x66CCFF, ratio * 0.95)
         .drawPolygon([f*20, 0, f*5, -6, f*5, 6]).endFill();
        g.beginFill(0xDDEEFF, ratio * 0.7).drawCircle(f * 14, 0, 3).endFill();
        // 冰晶尾
        for (var ii = 0; ii < 4; ii++) {
          g2.beginFill(0x88DDFF, ratio * (0.4 - ii * 0.08))
            .drawPolygon([-f*(8+ii*4), -2+ii, -f*(4+ii*4), 0, -f*(8+ii*4), 2-ii])
            .endFill();
        }
        break;
      }

      case 'whirlwind': {
        var ws = (1 - ratio) * this.radius * SCALE;
        var wa = ratio * 0.85;
        for (var wi = 0; wi < 6; wi++) {
          var wAng = (wi / 6) * Math.PI * 2 + t * 9;
          var wx2 = Math.cos(wAng) * ws, wy2 = Math.sin(wAng) * ws * ISO_Z;
          var wx3 = Math.cos(wAng + 0.55) * (ws + 12), wy3 = Math.sin(wAng + 0.55) * (ws + 12) * ISO_Z;
          g.lineStyle(3 * ratio, 0xFFEE44, wa)
           .moveTo(wx2, wy2).lineTo(wx3, wy3);
        }
        g.lineStyle(1.5, 0xFFFF88, wa * 0.4)
         .drawEllipse(0, 0, ws, ws * ISO_Z);
        g.lineStyle(1, 0xFFFF44, wa * 0.25)
         .drawEllipse(0, 0, ws * 0.6, ws * 0.6 * ISO_Z);
        break;
      }

      case 'shield_bash': {
        var sr = (1 - ratio) * this.radius * SCALE * 1.5;
        g.lineStyle(5, 0x4488FF, ratio * 0.9).drawEllipse(0, 0, sr, sr * ISO_Z);
        g.lineStyle(3, 0x88BBFF, ratio * 0.6).drawEllipse(0, 0, sr*0.55, sr*0.55*ISO_Z);
        g.beginFill(0x2255EE, ratio * 0.12).drawEllipse(0, 0, sr, sr * ISO_Z).endFill();
        break;
      }

      case 'pierce_arrow': {
        var pf = this.facing;
        g.lineStyle(2, 0xEECC88, ratio)
         .moveTo(-24 * pf, 0).lineTo(24 * pf, 0);
        g.beginFill(0xFFEE88, ratio)
         .drawPolygon([pf*24, 0, pf*10, -5, pf*10, 5]).endFill();
        g.beginFill(0xAA8844, ratio * 0.6)
         .drawRect(pf < 0 ? 10 : -24, -1.5, 14, 3).endFill();
        break;
      }

      case 'lightning': {
        var bAlpha = ratio > 0.55 ? 1.0 : ratio / 0.55;
        var bH = 220;
        // 主閃電
        g.lineStyle(5, 0x5588FF, bAlpha * 0.6).moveTo(0, -bH);
        var lx = 0;
        for (var li = 0; li < 8; li++) {
          var lox = Math.sin(s + li * 2.3) * 24;
          var lny = -bH + (li + 1) * bH / 8;
          g.lineTo(lx + lox, lny);
          lx += lox;
        }
        g.lineTo(0, 0);
        // 亮芯
        g.lineStyle(2, 0xCCEEFF, bAlpha).moveTo(0, -bH);
        var lx2 = 0;
        for (var li2 = 0; li2 < 8; li2++) {
          var lox2 = Math.sin(s + li2 * 2.3 + 0.5) * 14;
          var lny2 = -bH + (li2 + 1) * bH / 8;
          g.lineTo(lx2 + lox2, lny2);
          lx2 += lox2;
        }
        g.lineTo(0, 0);
        // 衝擊光暈
        g.beginFill(0x88BBFF, bAlpha * 0.38)
         .drawEllipse(0, 0, 22 * ratio, 14 * ratio * ISO_Z).endFill();
        break;
      }

      case 'light_pillar': {
        var pH = 280;
        var pW = 20 + Math.sin(t * 5 + s) * 3;
        var pA = ratio;
        // 外層光暈
        g.beginFill(0xFFEE88, pA * 0.28)
         .drawRect(-pW, -pH, pW * 2, pH).endFill();
        // 主柱
        g.beginFill(0xFFFFCC, pA * 0.55)
         .drawRect(-pW * 0.55, -pH, pW * 1.1, pH).endFill();
        // 亮芯
        g.beginFill(0xFFFFFF, pA * 0.75)
         .drawRect(-pW * 0.22, -pH, pW * 0.44, pH).endFill();
        // 地面光圈
        g.beginFill(0xFFFF88, pA * 0.45)
         .drawEllipse(0, 0, pW * 1.4, pW * 0.55 * ISO_Z).endFill();
        break;
      }

      case 'shadow_dash': {
        var sa = ratio * 0.7;
        g.beginFill(0x1A0033, sa)
         .drawEllipse(0, 0, 18, 10 * ISO_Z).endFill();
        g.beginFill(0x7722BB, sa * 0.6)
         .drawEllipse(0, 0, 10, 6 * ISO_Z).endFill();
        // 殘影粒子
        for (var di2 = 0; di2 < 3; di2++) {
          var da2 = Math.sin(t * 8 + s + di2) * 7;
          g2.beginFill(0x9933CC, sa * 0.25)
            .drawCircle(da2, Math.sin(t*5+di2*2)*4, 3).endFill();
        }
        break;
      }

      case 'poison_mist': {
        var puffs = 6;
        for (var pi2 = 0; pi2 < puffs; pi2++) {
          var pa2 = (pi2 / puffs) * Math.PI * 2 + t * 0.6 + s;
          var pd  = 16 + Math.sin(t * 1.5 + pi2 * 0.9) * 9;
          var pr2 = 15 + Math.sin(t * 2.5 + pi2 * 1.4) * 5;
          g.beginFill(0x22AA44, ratio * 0.26)
           .drawEllipse(
             Math.cos(pa2) * pd,
             Math.sin(pa2) * pd * ISO_Z,
             pr2, pr2 * 0.55).endFill();
        }
        g.beginFill(0x55CC66, ratio * 0.18)
         .drawEllipse(0, 0, this.radius * SCALE * 0.85, this.radius * SCALE * 0.5 * ISO_Z)
         .endFill();
        break;
      }
    }
  };

  Effect.prototype.updateScreenPos = function (cam) {
    this.container.x = W/2 + (this.x - cam.x) * SCALE;
    this.container.y = H/2 + (this.z - cam.z) * SCALE * ISO_Z;
  };

  // ── EffectManager ─────────────────────────────────────────────────────────
  function EffectManager(stage) {
    this._effects   = [];
    this._container = new PIXI.Container();
    stage.addChild(this._container);
  }

  // 從 opts 取出歸一化方向向量（支援 dx/dz 或 facing 降級）
  function _normDir(opts) {
    if (typeof opts.dx !== 'undefined') {
      var dx = opts.dx, dz = opts.dz || 0;
      var len = Math.sqrt(dx*dx + dz*dz) || 1;
      return { dx: dx/len, dz: dz/len };
    }
    var f = opts.facing || 1;
    return { dx: f, dz: 0 };
  }

  // 建立帶方向旋轉的投射物 Effect
  function _mkProj(type, wx, wz, opts, spd, life, radius, pierce, dmg) {
    var d = _normDir(opts);
    var hasDir = (typeof opts.dx !== 'undefined');
    var ef = new Effect(type, wx, wz, {
      vx: d.dx * spd, vz: d.dz * spd,
      life: life, dmg: dmg, radius: radius,
      pierce: pierce,
      facing: hasDir ? 1 : (opts.facing || 1),
    });
    if (hasDir) {
      ef.container.rotation = Math.atan2(d.dz * ISO_Z, d.dx);
    }
    return ef;
  }

  EffectManager.prototype.spawn = function (type, wx, wz, opts) {
    var f   = opts.facing || 1;
    var dmg = opts.dmg   || 30;
    var efs = [];

    switch (type) {
      case 'fireball': {
        var ef = _mkProj('fireball', wx, wz, opts, 10, 1.8, 1.0, false, dmg);
        efs.push(ef); break;
      }

      case 'ice_arrow': {
        var ef = _mkProj('ice_arrow', wx, wz, opts, 18, 1.1, 0.7, false, dmg);
        efs.push(ef); break;
      }

      case 'whirlwind':
        efs.push(new Effect('whirlwind', wx, wz,
          { life:0.70, dmg:dmg, radius:2.5, pierce:true, facing:f }));
        break;

      case 'shield_bash':
        efs.push(new Effect('shield_bash', wx, wz,
          { life:0.55, dmg:dmg, radius:2.8, pierce:true, facing:f }));
        break;

      case 'pierce_arrow': {
        var ef = _mkProj('pierce_arrow', wx, wz, opts, 16, 1.3, 0.8, true, dmg);
        efs.push(ef); break;
      }

      case 'spread_arrow': {
        var sdx = _normDir(opts).dx, sdz = _normDir(opts).dz;
        var perpX = -sdz, perpZ = sdx;
        var spAngles = [-0.30, -0.15, 0, 0.15, 0.30];
        for (var ai = 0; ai < spAngles.length; ai++) {
          var ag  = spAngles[ai];
          var cos = Math.cos(ag), sin = Math.sin(ag);
          var adx = sdx * cos + perpX * sin;
          var adz = sdz * cos + perpZ * sin;
          var alen = Math.sqrt(adx*adx + adz*adz) || 1;
          adx /= alen; adz /= alen;
          var ef2 = new Effect('pierce_arrow', wx, wz, {
            vx:adx*16, vz:adz*16, life:0.9, dmg:dmg, radius:0.65, pierce:false, facing:1,
          });
          ef2.container.rotation = Math.atan2(adz * ISO_Z, adx);
          efs.push(ef2);
        }
        break;
      }

      case 'lightning': {
        var ld = _normDir(opts);
        efs.push(new Effect('lightning', wx + ld.dx * 4, wz + ld.dz * 4,
          { life:0.55, dmg:dmg, radius:2.2, pierce:true, facing:f }));
        break;
      }

      case 'light_pillar': {
        var lpd = _normDir(opts);
        efs.push(new Effect('light_pillar', wx + lpd.dx * 1.5, wz + lpd.dz * 1.5,
          { life:2.0, dmg:dmg, radius:1.5, pierce:true, facing:f }));
        break;
      }

      case 'shadow_dash': {
        var pl  = opts.player;
        var sdd = _normDir(opts);
        for (var ti = 1; ti <= 4; ti++) {
          efs.push(new Effect('shadow_dash', wx + sdd.dx * ti * 1.1, wz + sdd.dz * ti * 1.1,
            { life:0.3 + ti * 0.04, dmg:0, radius:0, facing:f }));
        }
        var endX = wx + sdd.dx * 5.0, endZ = wz + sdd.dz * 5.0;
        efs.push(new Effect('shadow_dash', endX, endZ,
          { life:0.45, dmg:dmg, radius:1.6, pierce:true, facing:f }));
        if (pl) { pl.x = endX; pl.z = endZ; }
        break;
      }

      case 'poison_mist':
        efs.push(new Effect('poison_mist', wx, wz,
          { life:3.5, dmg:dmg, radius:2.4, pierce:true, facing:f }));
        break;
    }

    for (var ei = 0; ei < efs.length; ei++) this._effects.push(efs[ei]);
  };

  EffectManager.prototype.update = function (dt, cam, monsters) {
    this._container.removeChildren();
    var alive = [];
    for (var i = 0; i < this._effects.length; i++) {
      var e = this._effects[i];
      e.update(dt, monsters);
      if (!e.dead) {
        e.updateScreenPos(cam);
        this._container.addChild(e.container);
        alive.push(e);
      }
    }
    this._effects = alive;
  };

  G.EffectManager = EffectManager;
})(window.Game = window.Game || {});
