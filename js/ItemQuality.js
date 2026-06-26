(function (G) {
  'use strict';

  // ── 六階品質 ──────────────────────────────────────────────────────────────
  var QUALITIES = {
    normal:    { name:'普通', color:'#9E9E9E', mult:1.00, maxPre:0, maxSuf:0 },
    good:      { name:'優秀', color:'#4CAF50', mult:1.18, maxPre:0, maxSuf:1 },
    rare:      { name:'稀有', color:'#2196F3', mult:1.38, maxPre:1, maxSuf:1 },
    epic:      { name:'史詩', color:'#9C27B0', mult:1.62, maxPre:1, maxSuf:2 },
    legendary: { name:'傳說', color:'#FF9800', mult:1.95, maxPre:2, maxSuf:2 },
    mythic:    { name:'神話', color:'#FF1744', mult:2.40, maxPre:2, maxSuf:3 },
  };

  // ── 前綴 ──────────────────────────────────────────────────────────────────
  var PREFIXES = [
    { id:'sharp',    name:'鋒利的',  stat:'atk', r:[5,18]  },
    { id:'furious',  name:'暴怒的',  stat:'atk', r:[14,32], weaponOnly:true },
    { id:'swift',    name:'迅捷的',  stat:'spd', r:[5,20]  },
    { id:'frosty',   name:'冰霜的',  stat:'mag', r:[8,24]  },
    { id:'blazing',  name:'烈焰的',  stat:'mag', r:[12,32] },
    { id:'sturdy',   name:'堅固的',  stat:'def', r:[5,20]  },
    { id:'vital',    name:'活力的',  stat:'hp',  r:[28,75] },
    { id:'mystic',   name:'神秘的',  stat:'mp',  r:[22,55] },
    { id:'ancient',  name:'遠古的',  stat:'atk', r:[10,25] },
    { id:'blessed',  name:'神佑的',  stat:'hp',  r:[45,110]},
    { id:'shadow',   name:'暗影的',  stat:'spd', r:[8,22]  },
    { id:'thunder',  name:'雷電的',  stat:'mag', r:[15,38] },
  ];

  // ── 後綴 ──────────────────────────────────────────────────────────────────
  var SUFFIXES = [
    { id:'slayer',    name:'屠殺者', stat:'atk', r:[8,24]  },
    { id:'guardian',  name:'守護者', stat:'def', r:[8,24]  },
    { id:'conqueror', name:'征服者', stat:'hp',  r:[40,100] },
    { id:'destroyer', name:'毀滅者', stat:'mag', r:[12,35] },
    { id:'sage',      name:'智者',   stat:'mp',  r:[28,65] },
    { id:'champion',  name:'勇者',   stat:'atk', r:[6,20]  },
    { id:'titan',     name:'巨人',   stat:'hp',  r:[55,130] },
    { id:'phantom',   name:'幻影',   stat:'spd', r:[8,24]  },
    { id:'mystic',    name:'秘術師', stat:'mag', r:[10,28] },
    { id:'veteran',   name:'老兵',   stat:'def', r:[10,28] },
  ];

  // ── 套裝定義 ───────────────────────────────────────────────────────────────
  var SETS = {
    forest_guard: {
      name:'森林守護者',
      pieces:['leather_helm','leather_chest','leather_legs','leather_boots'],
      bonuses:[
        { count:2, desc:'+20 DEF', stats:{ def:20 } },
        { count:4, desc:'+60 HP ｜ +15% 移速', stats:{ hp:60, spd:15 } },
      ],
    },
    iron_warrior: {
      name:'鐵甲戰士',
      pieces:['iron_helm','iron_chest','iron_legs','iron_boots'],
      bonuses:[
        { count:2, desc:'+30 ATK', stats:{ atk:30 } },
        { count:4, desc:'+120 HP ｜ +25 DEF', stats:{ hp:120, def:25 } },
      ],
    },
    arcane_mage: {
      name:'奧術法師',
      pieces:['magic_hood','robe','mage_pendant','magic_ring'],
      bonuses:[
        { count:2, desc:'+40 MAG', stats:{ mag:40 } },
        { count:4, desc:'+80 MP ｜ 技能傷害 +20%', stats:{ mp:80 } },
      ],
    },
  };

  // ── 品質機率表（根據怪物 EXP）────────────────────────────────────────────
  function rollQuality(monsterExp) {
    var r = Math.random() * 100;
    var e = monsterExp || 10;
    if      (e >= 200) { if(r<4)  return'mythic'; if(r<16) return'legendary'; if(r<38) return'epic'; if(r<65) return'rare'; if(r<88) return'good'; return'normal'; }
    else if (e >= 90)  { if(r<1)  return'mythic'; if(r<7)  return'legendary'; if(r<22) return'epic'; if(r<52) return'rare'; if(r<80) return'good'; return'normal'; }
    else if (e >= 52)  {                           if(r<2)  return'legendary'; if(r<12) return'epic'; if(r<38) return'rare'; if(r<70) return'good'; return'normal'; }
    else if (e >= 22)  {                                                        if(r<4)  return'epic'; if(r<18) return'rare'; if(r<50) return'good'; return'normal'; }
    else if (e >= 10)  {                                                                               if(r<5)  return'rare'; if(r<28) return'good'; return'normal'; }
    else               {                                                                                                      if(r<3)  return'rare'; if(r<20) return'good'; return'normal'; }
  }

  function _rndRange(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  function _pickAffixes(pool, count, isWeapon) {
    var filtered = pool.filter(function(a){ return !a.weaponOnly || isWeapon; });
    var result = [];
    for (var i = 0; i < count && filtered.length > 0; i++) {
      var idx = Math.floor(Math.random() * filtered.length);
      var a   = filtered.splice(idx, 1)[0];
      result.push({ id:a.id, name:a.name, stat:a.stat, val:_rndRange(a.r[0], a.r[1]) });
    }
    return result;
  }

  // ── 生成物品實例 ──────────────────────────────────────────────────────────
  function generateInstance(itemId, monsterExp) {
    var def = G.ItemDatabase.get(itemId);
    if (!def) return null;
    if (def.type !== 'weapon' && def.type !== 'armor' && def.type !== 'accessory') return null;

    var qId  = rollQuality(monsterExp);
    var q    = QUALITIES[qId];
    var isW  = def.type === 'weapon';

    return {
      qualityId: qId,
      mult:      q.mult,
      prefixes:  _pickAffixes(PREFIXES.slice(), q.maxPre, isW),
      suffixes:  _pickAffixes(SUFFIXES.slice(), q.maxSuf, isW),
    };
  }

  // ── 從實例讀取屬性 ────────────────────────────────────────────────────────
  function getInstanceStats(itemId, inst) {
    var def = G.ItemDatabase.get(itemId);
    if (!def) return {};
    var mult = inst ? (inst.mult || 1) : 1;
    var st   = {};
    ['atk','def','hp','mp','spd','mag'].forEach(function(k){ if(def[k]) st[k] = Math.round(def[k] * mult); });
    if (inst) {
      (inst.prefixes || []).concat(inst.suffixes || []).forEach(function(a){ st[a.stat] = (st[a.stat]||0) + a.val; });
    }
    return st;
  }

  // ── 顯示名稱 ──────────────────────────────────────────────────────────────
  function getDisplayName(itemId, inst) {
    var def = G.ItemDatabase.get(itemId);
    if (!def) return '?';
    if (!inst || inst.qualityId === 'normal') return def.name;
    var pre = inst.prefixes.length > 0 ? inst.prefixes[0].name : '';
    var suf = inst.suffixes.length > 0 ? '[' + inst.suffixes.map(function(s){ return s.name; }).join('·') + ']' : '';
    return (pre ? pre : '') + def.name + (suf ? ' ' + suf : '');
  }

  function getColor(inst) {
    if (!inst) return '#9E9E9E';
    return (QUALITIES[inst.qualityId] || QUALITIES.normal).color;
  }

  function getQualityName(inst) {
    if (!inst) return '普通';
    return (QUALITIES[inst.qualityId] || QUALITIES.normal).name;
  }

  // ── 套裝加成計算 ──────────────────────────────────────────────────────────
  function getSetBonuses(equipped) {
    var counts = {};
    Object.keys(equipped).forEach(function(slot) {
      var e = equipped[slot];
      if (!e) return;
      // e 可能是 { itemId, inst } 物件或 null
      var itemId = (e && typeof e === 'object') ? e.itemId : e;
      if (!itemId) return;
      Object.keys(SETS).forEach(function(setId) {
        if (SETS[setId].pieces.indexOf(itemId) >= 0) {
          counts[setId] = (counts[setId] || 0) + 1;
        }
      });
    });
    var bonusStats = {};
    var activeSets = [];
    Object.keys(counts).forEach(function(setId) {
      var s = SETS[setId];
      s.bonuses.forEach(function(b) {
        if (counts[setId] >= b.count) {
          activeSets.push({ setName: s.name, count: counts[setId], desc: b.desc });
          Object.keys(b.stats).forEach(function(k){ bonusStats[k] = (bonusStats[k]||0) + b.stats[k]; });
        }
      });
    });
    return { stats: bonusStats, active: activeSets };
  }

  G.ItemQuality = {
    QUALITIES:        QUALITIES,
    SETS:             SETS,
    rollQuality:      rollQuality,
    generateInstance: generateInstance,
    getInstanceStats: getInstanceStats,
    getDisplayName:   getDisplayName,
    getColor:         getColor,
    getQualityName:   getQualityName,
    getSetBonuses:    getSetBonuses,
  };
})(window.Game = window.Game || {});
