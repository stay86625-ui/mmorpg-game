(function (G) {
  'use strict';

  // 每個職業的被動技能樹
  var SKILL_TREES = {
    '法師': [
      {id:'mage_1', name:'魔力強化',   cost:1, desc:'+15% 法術傷害',       stat:'magPct',  val:0.15},
      {id:'mage_2', name:'冰霜掌握',   cost:1, desc:'冰箭冷卻 -25%',       stat:'iceCd',   val:0.25},
      {id:'mage_3', name:'元素強化',   cost:2, desc:'+20% 全技能傷害',      stat:'skillPct',val:0.20},
      {id:'mage_4', name:'魔力之泉',   cost:2, desc:'最大 MP +50',          stat:'mp',      val:50},
      {id:'mage_5', name:'爆裂魔法',   cost:3, desc:'火球術爆炸範圍 +50%', stat:'fbRange', val:0.5},
    ],
    '劍士': [
      {id:'swd_1',  name:'攻擊精通',   cost:1, desc:'+10 攻擊力',          stat:'atk',     val:10},
      {id:'swd_2',  name:'鐵壁防禦',   cost:1, desc:'+12 防禦力',          stat:'def',     val:12},
      {id:'swd_3',  name:'戰士之魂',   cost:2, desc:'+80 最大 HP',         stat:'hp',      val:80},
      {id:'swd_4',  name:'雙擊',       cost:2, desc:'攻擊有 20% 機率雙倍', stat:'doublePct',val:0.20},
      {id:'swd_5',  name:'不滅意志',   cost:3, desc:'HP<20% 時防禦 +30',   stat:'lowHpDef',val:30},
    ],
    '弓箭手': [
      {id:'bow_1',  name:'銳眼',       cost:1, desc:'+8 攻擊力',           stat:'atk',     val:8},
      {id:'bow_2',  name:'疾射',       cost:1, desc:'攻速 +15%',           stat:'atkSpd',  val:0.15},
      {id:'bow_3',  name:'穿透射擊',   cost:2, desc:'穿透箭貫穿數 +1',     stat:'pierceN', val:1},
      {id:'bow_4',  name:'連矢',       cost:2, desc:'散射箭數 +2',         stat:'spreadN', val:2},
      {id:'bow_5',  name:'猛禽之眼',   cost:3, desc:'暴擊率 +25%',         stat:'critPct', val:0.25},
    ],
    '伊格': [
      {id:'ig_1',   name:'雷電加護',   cost:1, desc:'+10 法術攻擊',        stat:'mag',     val:10},
      {id:'ig_2',   name:'光速反應',   cost:1, desc:'技能冷卻 -15%',       stat:'cdRed',   val:0.15},
      {id:'ig_3',   name:'雙重閃電',   cost:2, desc:'雷擊同時擊中 2 個目標',stat:'lightN', val:1},
      {id:'ig_4',   name:'光柱強化',   cost:2, desc:'光柱持續時間 +1秒',    stat:'pillarT', val:1},
      {id:'ig_5',   name:'天罰',       cost:3, desc:'雷擊傷害 +40%',       stat:'lightDmg',val:0.40},
    ],
    '刺客': [
      {id:'asm_1',  name:'暗影步',     cost:1, desc:'移動速度 +15%',       stat:'spd',     val:0.15},
      {id:'asm_2',  name:'致命一擊',   cost:1, desc:'近戰攻擊 +12',        stat:'atk',     val:12},
      {id:'asm_3',  name:'毒素強化',   cost:2, desc:'毒霧傷害 +30%',       stat:'poisonDmg',val:0.30},
      {id:'asm_4',  name:'虛影殘像',   cost:2, desc:'暗影衝刺留下 2 個殘影',stat:'dashTrail',val:2},
      {id:'asm_5',  name:'死神之觸',   cost:3, desc:'攻擊有 15% 機率即死',  stat:'deathPct',val:0.15},
    ],
  };

  // ── SkillTree ─────────────────────────────────────────────────────────────
  function SkillTree() {
    this.points   = 0;
    this.unlocked = {};  // skillId → true
    this._panel   = document.getElementById('skill-panel');
    this._ptEl    = document.getElementById('skill-pts');
    this._listEl  = document.getElementById('skill-list');

    if (!this._panel) return;
    var self = this;
    document.getElementById('skill-close').addEventListener('click', function () { self.hide(); });

    G.Events.on('levelUp', function () { self.points++; self._render(); });
  }

  SkillTree.prototype.addPoint = function (n) {
    this.points += (n || 1);
    this._render();
  };

  SkillTree.prototype.isUnlocked = function (id) { return !!this.unlocked[id]; };

  SkillTree.prototype.getPassiveStat = function (stat) {
    var total = 0;
    var self  = this;
    var cls   = G._player ? G.CLS_NAMES[G._player.cls] : null;
    var tree  = cls ? (SKILL_TREES[cls] || []) : [];
    tree.forEach(function (sk) {
      if (self.unlocked[sk.id] && sk.stat === stat) total += sk.val;
    });
    return total;
  };

  SkillTree.prototype._unlock = function (sk) {
    if (this.unlocked[sk.id]) return;
    if (this.points < sk.cost) return;
    this.points -= sk.cost;
    this.unlocked[sk.id] = true;
    G.Events.emit('skillUnlocked', { skill: sk });
    G.Events.emit('equipChanged', {}); // 觸發屬性重算
    this._render();
  };

  SkillTree.prototype._render = function () {
    if (!this._panel) return;
    var cls  = G._player ? G.CLS_NAMES[G._player.cls] : '法師';
    var tree = SKILL_TREES[cls] || [];
    if (this._ptEl) this._ptEl.textContent = '可用技能點：' + this.points;
    if (!this._listEl) return;
    var self = this;
    this._listEl.innerHTML = tree.map(function (sk) {
      var done = self.unlocked[sk.id];
      var can  = !done && self.points >= sk.cost;
      return '<div class="sk-tree-item' + (done ? ' unlocked' : '') + '">' +
        '<div class="sk-tree-name">' + sk.name + (done ? ' ✓' : '') + '</div>' +
        '<div class="sk-tree-desc">' + sk.desc + '</div>' +
        '<div class="sk-tree-cost">消耗：' + sk.cost + ' SP</div>' +
        (done ? '' : '<button class="sk-tree-btn" ' + (can ? '' : 'disabled') + ' data-id="' + sk.id + '">' +
          (can ? '解鎖' : (self.points < sk.cost ? '點數不足' : '已解鎖')) + '</button>') +
      '</div>';
    }).join('');
    this._listEl.querySelectorAll('.sk-tree-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.id;
        var sk = tree.find(function (s) { return s.id === id; });
        if (sk) self._unlock(sk);
      });
    });
  };

  SkillTree.prototype.show = function () {
    this._render();
    if (this._panel) this._panel.classList.add('open');
    G._uiOpen = true;
  };

  SkillTree.prototype.hide = function () {
    if (this._panel) this._panel.classList.remove('open');
    G._checkUiOpen();
  };

  SkillTree.prototype.toggle = function () {
    if (this._panel && this._panel.classList.contains('open')) this.hide();
    else this.show();
  };

  SkillTree.prototype.serialize   = function () { return { points: this.points, unlocked: this.unlocked }; };
  SkillTree.prototype.deserialize = function (d) {
    if (!d) return;
    this.points   = d.points   || 0;
    this.unlocked = d.unlocked || {};
    this._render();
  };

  G.SkillTree   = SkillTree;
  G.SKILL_TREES = SKILL_TREES;
})(window.Game = window.Game || {});
