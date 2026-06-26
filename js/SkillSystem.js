(function (G) {
  'use strict';

  // ── 每職業技能定義 ──────────────────────────────────────────────────────────
  var DEFS = {
    '法師': [
      { name:'火球術', key:'Q', mpCost:22, cd:1.3, effect:'fireball',    dmg:55, range:7,  rangeClr:0xFF6600 },
      { name:'冰箭',   key:'E', mpCost:16, cd:0.9, effect:'ice_arrow',   dmg:38, range:9,  rangeClr:0x4488FF },
    ],
    '劍士': [
      { name:'旋風斬', key:'Q', mpCost:26, cd:2.2, effect:'whirlwind',   dmg:62, range:3.5,rangeClr:0xFFDD00 },
      { name:'聖盾衝', key:'E', mpCost:22, cd:5.0, effect:'shield_bash', dmg:45, range:2.5,rangeClr:0xFFFFFF },
    ],
    '弓箭手': [
      { name:'穿透箭', key:'Q', mpCost:18, cd:1.1, effect:'pierce_arrow',dmg:42, range:11, rangeClr:0x44FF88 },
      { name:'散射',   key:'E', mpCost:32, cd:2.8, effect:'spread_arrow',dmg:24, range:5,  rangeClr:0xAAFF22 },
    ],
    '伊格': [
      { name:'雷擊',   key:'Q', mpCost:28, cd:1.6, effect:'lightning',   dmg:72, range:7,  rangeClr:0xAA44FF },
      { name:'光柱',   key:'E', mpCost:38, cd:3.2, effect:'light_pillar',dmg:58, range:6,  rangeClr:0xFFEE88 },
    ],
    '刺客': [
      { name:'暗影衝刺', key:'Q', mpCost:24, cd:1.4, effect:'shadow_dash',  dmg:80, range:5, rangeClr:0x8833CC },
      { name:'毒霧',     key:'E', mpCost:30, cd:4.5, effect:'poison_mist',  dmg:14, range:3.5,rangeClr:0x22CC44 },
    ],
  };

  function SkillSystem() {
    this._cds = [0, 0];
  }

  SkillSystem.prototype.update = function (dt) {
    this._cds[0] = Math.max(0, this._cds[0] - dt);
    this._cds[1] = Math.max(0, this._cds[1] - dt);
  };

  // slot: 0=Q, 1=E | target: {x,z} 滑鼠世界座標（可選）
  SkillSystem.prototype.tryUse = function (slot, player, effectMgr, target) {
    if (this._cds[slot] > 0) return false;
    var cls  = G.CLS_NAMES[player.cls];
    var defs = DEFS[cls];
    if (!defs || !defs[slot]) return false;
    var def = defs[slot];
    if (player.mp < def.mpCost) return false;
    player.mp -= def.mpCost;
    this._cds[slot] = def.cd;

    // 計算施法方向
    var dx, dz;
    if (target) {
      dx = target.x - player.x;
      dz = target.z - player.z;
      var len = Math.sqrt(dx*dx + dz*dz) || 1;
      dx /= len; dz /= len;
      if (Math.abs(dx) > 0.08) {
        player.facing = dx > 0 ? 1 : -1;
        if (player.character) player.character.setFacing(player.facing);
      }
    } else {
      dx = player.facing;
      dz = 0;
    }

    effectMgr.spawn(def.effect, player.x, player.z,
      { facing: player.facing, dx: dx, dz: dz, dmg: def.dmg, player: player });
    G.Events.emit('skillCast', { range: def.range, clr: def.rangeClr, x: player.x, z: player.z });
    return true;
  };

  SkillSystem.prototype.getDefs = function (cls) {
    return DEFS[cls] || [null, null];
  };
  SkillSystem.prototype.getCd    = function (slot) { return this._cds[slot]; };
  SkillSystem.prototype.getMaxCd = function (slot, cls) {
    var d = (DEFS[cls] || [])[slot];
    return d ? d.cd : 1;
  };

  G.SkillSystem = SkillSystem;
  G.SKILL_DEFS  = DEFS;
})(window.Game = window.Game || {});
