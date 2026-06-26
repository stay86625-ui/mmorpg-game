(function (G) {
  'use strict';

  // 稀有度顏色
  var RARITY_COLOR = {
    common:    '#9E9E9E',
    uncommon:  '#4CAF50',
    rare:      '#2196F3',
    epic:      '#9C27B0',
    legendary: '#FF9800',
  };

  var ITEMS = {
    // ── 武器 ──────────────────────────────────────────────────────────────
    wooden_sword:   { id:'wooden_sword',   name:'木劍',       type:'weapon', slot:'weapon', rarity:'common',
      icon:'⚔', atk:6,  price:30,  desc:'最基本的木製長劍。' },
    iron_sword:     { id:'iron_sword',     name:'鐵劍',       type:'weapon', slot:'weapon', rarity:'common',
      icon:'⚔', atk:14, price:120, desc:'普通的鐵製長劍。' },
    steel_sword:    { id:'steel_sword',    name:'鋼劍',       type:'weapon', slot:'weapon', rarity:'uncommon',
      icon:'⚔', atk:26, price:350, desc:'精鍛的鋼製長劍。' },
    flame_blade:    { id:'flame_blade',    name:'炎刃',       type:'weapon', slot:'weapon', rarity:'rare',
      icon:'🔥', atk:40, price:900, mag:8,  desc:'蘊含火焰之力的寶劍。' },
    magic_staff:    { id:'magic_staff',    name:'魔法杖',     type:'weapon', slot:'weapon', rarity:'uncommon',
      icon:'🔮', atk:6,  price:200, mag:20, desc:'蘊含魔力的法杖。' },
    elder_staff:    { id:'elder_staff',    name:'長老法杖',   type:'weapon', slot:'weapon', rarity:'rare',
      icon:'🔮', atk:8,  price:800, mag:38, desc:'古代長老遺留的法杖。' },
    hunters_bow:    { id:'hunters_bow',    name:'獵弓',       type:'weapon', slot:'weapon', rarity:'common',
      icon:'🏹', atk:12, price:100, spd:5,  desc:'獵人常用的木製長弓。' },
    elven_bow:      { id:'elven_bow',      name:'精靈弓',     type:'weapon', slot:'weapon', rarity:'rare',
      icon:'🏹', atk:28, price:750, spd:15, desc:'精靈工匠打造的長弓。' },
    shadow_dagger:  { id:'shadow_dagger',  name:'暗影匕首',   type:'weapon', slot:'weapon', rarity:'uncommon',
      icon:'🗡', atk:20, price:280, spd:10, desc:'輕盈的暗殺匕首。' },
    void_blade:     { id:'void_blade',     name:'虛空刃',     type:'weapon', slot:'weapon', rarity:'epic',
      icon:'🗡', atk:48, price:2000, spd:18, mag:10, desc:'來自深淵的神秘刀刃。' },
    thunder_spear:  { id:'thunder_spear',  name:'雷霆長槍',   type:'weapon', slot:'weapon', rarity:'epic',
      icon:'⚡', atk:44, price:1800, mag:22, desc:'蘊含雷電之力的長槍。' },

    // ── 頭盔 ──────────────────────────────────────────────────────────────
    leather_helm:   { id:'leather_helm',   name:'皮革頭盔',   type:'armor', slot:'head', rarity:'common',
      icon:'🪖', def:4,  hp:15,  price:60,  desc:'輕便的皮革頭盔。' },
    iron_helm:      { id:'iron_helm',      name:'鐵盔',       type:'armor', slot:'head', rarity:'uncommon',
      icon:'🪖', def:10, hp:30,  price:200, desc:'厚重的鐵製頭盔。' },
    steel_helm:     { id:'steel_helm',     name:'精鋼頭盔',   type:'armor', slot:'head', rarity:'rare',
      icon:'🪖', def:18, hp:55,  price:600, desc:'精鍛的鋼鐵頭盔。' },
    magic_hood:     { id:'magic_hood',     name:'法師兜帽',   type:'armor', slot:'head', rarity:'uncommon',
      icon:'🪖', def:5,  hp:20, mp:30, price:180, desc:'蘊含魔力的兜帽。' },

    // ── 胸甲 ──────────────────────────────────────────────────────────────
    leather_chest:  { id:'leather_chest',  name:'皮革胸甲',   type:'armor', slot:'chest', rarity:'common',
      icon:'🛡', def:7,  hp:25,  price:90,  desc:'輕便的皮革胸甲。' },
    iron_chest:     { id:'iron_chest',     name:'鐵甲',       type:'armor', slot:'chest', rarity:'uncommon',
      icon:'🛡', def:16, hp:50,  price:300, desc:'厚重的鐵製胸甲。' },
    steel_plate:    { id:'steel_plate',    name:'精鋼板甲',   type:'armor', slot:'chest', rarity:'rare',
      icon:'🛡', def:28, hp:90,  price:800, desc:'精鍛的鋼板胸甲。' },
    robe:           { id:'robe',           name:'魔法長袍',   type:'armor', slot:'chest', rarity:'uncommon',
      icon:'🛡', def:6,  hp:30, mp:50, price:250, desc:'蘊含魔力的長袍。' },

    // ── 腿甲 ──────────────────────────────────────────────────────────────
    leather_legs:   { id:'leather_legs',   name:'皮革護腿',   type:'armor', slot:'legs', rarity:'common',
      icon:'👖', def:5,  hp:20,  price:70,  desc:'輕便的皮革護腿。' },
    iron_legs:      { id:'iron_legs',      name:'鐵腿甲',     type:'armor', slot:'legs', rarity:'uncommon',
      icon:'👖', def:12, hp:40,  price:220, desc:'厚重的鐵製護腿。' },

    // ── 鞋子 ──────────────────────────────────────────────────────────────
    leather_boots:  { id:'leather_boots',  name:'皮靴',       type:'armor', slot:'boots', rarity:'common',
      icon:'👟', def:3,  spd:4,  price:50,  desc:'輕便的皮革鞋子。' },
    iron_boots:     { id:'iron_boots',     name:'鐵靴',       type:'armor', slot:'boots', rarity:'uncommon',
      icon:'👟', def:8,  spd:2,  hp:20, price:160, desc:'沉重但堅固的鐵靴。' },
    swift_boots:    { id:'swift_boots',    name:'疾風靴',     type:'armor', slot:'boots', rarity:'rare',
      icon:'👟', def:5,  spd:12, price:500, desc:'極輕盈，讓移動速度大增。' },

    // ── 戒指 ──────────────────────────────────────────────────────────────
    power_ring:     { id:'power_ring',     name:'力量戒指',   type:'accessory', slot:'ring', rarity:'uncommon',
      icon:'💍', atk:6,  price:200, desc:'蘊含力量的戒指。' },
    magic_ring:     { id:'magic_ring',     name:'魔力戒指',   type:'accessory', slot:'ring', rarity:'uncommon',
      icon:'💍', mag:10, mp:25, price:220, desc:'蘊含魔力的戒指。' },
    life_ring:      { id:'life_ring',      name:'生命戒指',   type:'accessory', slot:'ring', rarity:'uncommon',
      icon:'💍', hp:60,  price:180, desc:'蘊含生機的戒指。' },

    // ── 項鍊 ──────────────────────────────────────────────────────────────
    life_necklace:  { id:'life_necklace',  name:'生命項鍊',   type:'accessory', slot:'necklace', rarity:'uncommon',
      icon:'📿', hp:80,  price:280, desc:'蘊含生機的項鍊。' },
    mage_pendant:   { id:'mage_pendant',   name:'法師墜飾',   type:'accessory', slot:'necklace', rarity:'rare',
      icon:'📿', mag:14, mp:40, price:650, desc:'古老法師遺留的墜飾。' },

    // ── 消耗品 ────────────────────────────────────────────────────────────
    health_potion:  { id:'health_potion',  name:'生命藥水',   type:'consumable', rarity:'common',
      icon:'🧪', price:30,  sellPrice:10, desc:'恢復 60 HP。',  effect:'heal_hp', amount:60,  stackable:true },
    mp_potion:      { id:'mp_potion',      name:'魔力藥水',   type:'consumable', rarity:'common',
      icon:'🫙', price:25,  sellPrice:8,  desc:'恢復 40 MP。',  effect:'heal_mp', amount:40,  stackable:true },
    hi_potion:      { id:'hi_potion',      name:'高級藥水',   type:'consumable', rarity:'uncommon',
      icon:'🧪', price:100, sellPrice:35, desc:'恢復 150 HP。', effect:'heal_hp', amount:150, stackable:true },
    elixir:         { id:'elixir',         name:'萬能藥劑',   type:'consumable', rarity:'rare',
      icon:'✨', price:400, sellPrice:120, desc:'完全恢復 HP 與 MP。', effect:'heal_all', stackable:true },

    // ── 材料 ──────────────────────────────────────────────────────────────
    wood:           { id:'wood',           name:'木材',       type:'material', rarity:'common',
      icon:'🪵', price:5,  sellPrice:2,  desc:'普通木材。',   stackable:true },
    iron_ore:       { id:'iron_ore',       name:'鐵礦石',     type:'material', rarity:'common',
      icon:'🪨', price:8,  sellPrice:3,  desc:'鐵礦石。',     stackable:true },
    iron_ingot:     { id:'iron_ingot',     name:'鐵錠',       type:'material', rarity:'common',
      icon:'🔩', price:20, sellPrice:8,  desc:'冶煉後的鐵錠。', stackable:true },
    steel_ingot:    { id:'steel_ingot',    name:'鋼錠',       type:'material', rarity:'uncommon',
      icon:'🔩', price:60, sellPrice:22, desc:'精煉的鋼錠。',  stackable:true },
    herb:           { id:'herb',           name:'草藥',       type:'material', rarity:'common',
      icon:'🌿', price:6,  sellPrice:2,  desc:'普通草藥。',   stackable:true },
    magic_crystal:  { id:'magic_crystal',  name:'魔法水晶',   type:'material', rarity:'uncommon',
      icon:'💎', price:45, sellPrice:18, desc:'蘊含魔力的水晶。', stackable:true },
    slime_gel:      { id:'slime_gel',      name:'史萊姆凝膠', type:'material', rarity:'common',
      icon:'🟢', price:4,  sellPrice:1,  desc:'史萊姆掉落的凝膠。', stackable:true },
    wolf_fang:      { id:'wolf_fang',      name:'狼牙',       type:'material', rarity:'common',
      icon:'🦷', price:10, sellPrice:4,  desc:'野狼的獠牙。', stackable:true },
    boar_hide:      { id:'boar_hide',      name:'野豬皮',     type:'material', rarity:'common',
      icon:'🟤', price:12, sellPrice:5,  desc:'野豬的皮革。', stackable:true },
    ice_shard:      { id:'ice_shard',      name:'冰晶碎片',   type:'material', rarity:'uncommon',
      icon:'❄',  price:30, sellPrice:12, desc:'冰元素的碎片。', stackable:true },
    fire_core:      { id:'fire_core',      name:'火焰核心',   type:'material', rarity:'uncommon',
      icon:'🔥', price:40, sellPrice:16, desc:'火元素的核心。', stackable:true },
    scorpion_claw:  { id:'scorpion_claw',  name:'蠍子鉗',     type:'material', rarity:'common',
      icon:'🦂', price:14, sellPrice:6,  desc:'蠍子的鉗爪。', stackable:true },
    void_essence:   { id:'void_essence',   name:'虛空精華',   type:'material', rarity:'rare',
      icon:'🌌', price:150, sellPrice:60, desc:'深淵虛空精的精華。', stackable:true },
    lava_stone:     { id:'lava_stone',     name:'熔岩石',     type:'material', rarity:'uncommon',
      icon:'🔴', price:35, sellPrice:14, desc:'火山地帶的熔岩石。', stackable:true },
    bone:           { id:'bone',           name:'骸骨',       type:'material', rarity:'common',
      icon:'🦴', price:6,  sellPrice:2,  desc:'怪物遺留的骸骨。', stackable:true },
  };

  G.ItemDatabase = {
    get:         function (id) { return ITEMS[id] || null; },
    all:         function ()   { return ITEMS; },
    rarityColor: function (r)  { return RARITY_COLOR[r] || '#9E9E9E'; },
  };
})(window.Game = window.Game || {});
