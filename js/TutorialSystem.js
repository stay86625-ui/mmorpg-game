(function (G) {
  'use strict';

  var STEPS = [
    { id:'move',      icon:'🎮', title:'第一步：移動',
      msg:'使用 <b>W A S D</b> 移動你的角色<br><span style="opacity:.65">靠近怪物時會自動進入戰鬥</span>',
      check:'move' },
    { id:'kill',      icon:'⚔',  title:'第二步：戰鬥',
      msg:'靠近怪物後<b>自動攻擊</b><br>按 <b>Q</b> 或 <b>E</b> 可釋放強力技能',
      check:'killed' },
    { id:'pickup',    icon:'💎', title:'第三步：撿取物品',
      msg:'走到地上的<b>發光圓圈</b>旁邊<br>靠近後會自動撿取物品',
      check:'pickup' },
    { id:'inventory', icon:'🎒', title:'第四步：開啟背包',
      msg:'按 <b>I</b> 鍵開啟背包<br>可裝備物品、使用道具、查看角色屬性',
      check:'inventory' },
    { id:'city',      icon:'🏙', title:'第五步：前往城市',
      msg:'前往 <b>翡翠城</b>（你的北方）<br>城市是<b>安全區</b>——無怪物，進入自動恢復 HP/MP',
      check:'city' },
    { id:'npc',       icon:'💬', title:'第六步：與 NPC 對話',
      msg:'走近頭上有 <b>❗</b> 標記的 NPC<br>按 <b>T</b> 鍵開始對話',
      check:'npc' },
    { id:'quest',     icon:'📋', title:'第七步：接受任務',
      msg:'在對話中點選<b>接受任務</b><br>完成任務可獲得豐厚獎勵！',
      check:'quest' },
  ];

  function TutorialSystem() {
    this._step  = 0;
    this._done  = false;
    this._flags = {};
    this._el    = null;
    try { if (localStorage.getItem('ew_tutorial_done') === '1') this._done = true; } catch (e) {}
  }

  TutorialSystem.prototype.init = function () {
    if (this._done) return;
    this._el = document.getElementById('tutorial-box');
    if (!this._el) return;
    var self = this;
    document.getElementById('tut-skip').addEventListener('click', function () { self.complete(); });
    document.getElementById('tut-next').addEventListener('click', function () { self._advance(); });

    G.Events.on('monsterDead',   function () { self._flag('killed'); });
    G.Events.on('itemPickup',    function () { self._flag('pickup'); });
    G.Events.on('questAccepted', function () { self._flag('quest');  });

    this._render();
  };

  TutorialSystem.prototype._flag  = function (f) { this._flags[f] = true; };
  TutorialSystem.prototype.markMove      = function () { this._flag('move');      };
  TutorialSystem.prototype.markInventory = function () { this._flag('inventory'); };
  TutorialSystem.prototype.markCity      = function () { this._flag('city');      };
  TutorialSystem.prototype.markNPC       = function () { this._flag('npc');       };

  TutorialSystem.prototype.update = function () {
    if (this._done || !this._el) return;
    var s = STEPS[this._step];
    if (s && this._flags[s.check]) this._advance();
  };

  TutorialSystem.prototype._advance = function () {
    this._step++;
    if (this._step >= STEPS.length) { this.complete(); return; }
    this._render();
  };

  TutorialSystem.prototype._render = function () {
    if (!this._el) return;
    var s = STEPS[this._step];
    if (!s) { this.complete(); return; }
    document.getElementById('tut-step-num').textContent = (this._step + 1) + ' / ' + STEPS.length;
    document.getElementById('tut-icon-el').textContent  = s.icon;
    document.getElementById('tut-title-el').textContent = s.title;
    document.getElementById('tut-msg-el').innerHTML     = s.msg;
    this._el.style.display = 'block';
  };

  TutorialSystem.prototype.complete = function () {
    this._done = true;
    if (this._el) this._el.style.display = 'none';
    G.Events.emit('showNotif', { msg:'🎓 新手教學完成！祝冒險愉快！', clr:'#88FF88', duration:4000 });
    try { localStorage.setItem('ew_tutorial_done', '1'); } catch (e) {}
  };

  G.TutorialSystem = TutorialSystem;
})(window.Game = window.Game || {});
