(function (G) {
  'use strict';

  // ── 成就定義 ───────────────────────────────────────────────────────────────
  var ACH_DEFS = [
    // 戰鬥類
    { id:'first_kill',    cat:'combat',  name:'初次狩獵',   desc:'擊殺第一隻怪物',                  icon:'⚔', cond:function(s){ return s.totalKills>=1;  }, title:'新手獵人' },
    { id:'kill_100',      cat:'combat',  name:'百怪屠夫',   desc:'累計擊殺 100 隻怪物',             icon:'⚔', cond:function(s){ return s.totalKills>=100;}, title:'百怪屠夫' },
    { id:'kill_1000',     cat:'combat',  name:'千鍛勇士',   desc:'累計擊殺 1000 隻怪物',            icon:'⚔', cond:function(s){ return s.totalKills>=1000;},title:'戰場老兵' },
    { id:'slime_hunter',  cat:'combat',  name:'史萊姆剋星', desc:'擊殺 50 隻史萊姆',                icon:'🟢', cond:function(s){ return (s.kills['slime']||0)>=50; }, title:null },
    { id:'wolf_slayer',   cat:'combat',  name:'狼群剋星',   desc:'擊殺 30 隻野狼',                  icon:'🐺', cond:function(s){ return (s.kills['wolf']||0)>=30; }, title:null },
    { id:'boss_first',    cat:'combat',  name:'初嘗Boss',   desc:'首次擊敗 Boss',                   icon:'💀', cond:function(s){ return s.bossKills>=1;  }, title:'Boss獵人' },
    { id:'boss_3',        cat:'combat',  name:'Boss征服者', desc:'擊敗 3 種不同 Boss',              icon:'💀', cond:function(s){ return s.uniqueBoss>=3; }, title:'Boss征服者' },
    // 探索類
    { id:'explore_f',     cat:'explore', name:'踏入森林',   desc:'進入翠綠森林',                    icon:'🌲', cond:function(s){ return !!s.areas['forest']; },    title:null },
    { id:'explore_s',     cat:'explore', name:'踏入雪原',   desc:'進入永凍雪原',                    icon:'❄',  cond:function(s){ return !!s.areas['snowfield']; }, title:null },
    { id:'explore_v',     cat:'explore', name:'踏入火山',   desc:'進入熔岩火山帶',                  icon:'🌋', cond:function(s){ return !!s.areas['volcano']; },   title:'火山探險家' },
    { id:'explore_a',     cat:'explore', name:'踏入深淵',   desc:'進入虛空深淵',                    icon:'🌌', cond:function(s){ return !!s.areas['abyss']; },     title:'深淵探索者' },
    { id:'all_areas',     cat:'explore', name:'世界旅行家', desc:'踏遍所有區域',                    icon:'🗺',  cond:function(s){ return Object.keys(s.areas).length>=6; }, title:'世界旅行家' },
    // 採集類
    { id:'gather_10',     cat:'gather',  name:'初學採集',   desc:'採集 10 次',                      icon:'🌿', cond:function(s){ return s.gathers>=10;  }, title:null },
    { id:'gather_100',    cat:'gather',  name:'採集達人',   desc:'採集 100 次',                     icon:'🌿', cond:function(s){ return s.gathers>=100; }, title:'採集達人' },
    // 製作類
    { id:'craft_1',       cat:'craft',   name:'初次製作',   desc:'製作第一件物品',                  icon:'⚒',  cond:function(s){ return s.crafts>=1;  }, title:null },
    { id:'craft_20',      cat:'craft',   name:'工藝大師',   desc:'製作 20 件物品',                  icon:'⚒',  cond:function(s){ return s.crafts>=20; }, title:'工藝大師' },
    // 成長類
    { id:'lv_10',         cat:'growth',  name:'升至10級',   desc:'角色達到 10 級',                  icon:'⭐', cond:function(s){ return s.level>=10;  }, title:null },
    { id:'lv_30',         cat:'growth',  name:'升至30級',   desc:'角色達到 30 級',                  icon:'⭐', cond:function(s){ return s.level>=30;  }, title:'老練冒險家' },
    { id:'lv_60',         cat:'growth',  name:'升至60級',   desc:'角色達到 60 級！滿等！',          icon:'👑', cond:function(s){ return s.level>=60;  }, title:'傳奇冒險家' },
    { id:'gold_1000',     cat:'growth',  name:'小富翁',     desc:'持有 1000 金幣',                  icon:'🪙', cond:function(s){ return s.gold>=1000; }, title:null },
    { id:'gold_10000',    cat:'growth',  name:'大富翁',     desc:'持有 10000 金幣',                 icon:'💰', cond:function(s){ return s.gold>=10000;}, title:'財富大王' },
    { id:'legendary_item',cat:'growth',  name:'傳說收藏家', desc:'獲得第一件傳說品質裝備',          icon:'🔮', cond:function(s){ return s.legendaryItems>=1;}, title:'傳說收藏家' },
    // 世界事件
    { id:'treasure',      cat:'event',   name:'尋寶者',     desc:'收集 3 次世界寶藏',               icon:'💰', cond:function(s){ return s.treasures>=3; }, title:'尋寶者' },
  ];

  // ── 稱號系統（依成就解鎖）────────────────────────────────────────────────
  var ALL_TITLES = (function(){
    var t = {};
    ACH_DEFS.forEach(function(a){ if(a.title) t[a.title] = a.id; });
    return t;
  })();

  // ── AchievementSystem ──────────────────────────────────────────────────────
  function AchievementSystem() {
    this._unlocked = {};  // achId → true
    this._stats    = {
      totalKills:0, kills:{}, bossKills:0, uniqueBoss:0,
      areas:{}, gathers:0, crafts:0, level:1, gold:0,
      legendaryItems:0, treasures:0,
    };
    this._titles   = [];   // 已解鎖稱號陣列
    this._activeTitle = '';

    this._panel    = document.getElementById('ach-panel');
    this._listEl   = document.getElementById('ach-list');

    var self = this;

    // 事件綁定（先於 UI 初始化，確保無論 panel 是否存在都能追蹤）
    G.Events.on('monsterDead',       function(e){ self._onMonsterKill(e.monster); });
    G.Events.on('bossDead',          function(e){ self._onBossKill(e.boss); });
    G.Events.on('areaChanged',       function(e){ self._onAreaChange(e.area); });
    G.Events.on('achievementCheck',  function(e){ self._onCheck(e); });
    G.Events.on('levelUp',           function(e){ self._stats.level = e.level||1; self._check(); });
    G.Events.on('itemPickup',        function(e){ if(e.inst && e.inst.qualityId==='legendary') self._stats.legendaryItems++; self._check(); });
    G.Events.on('itemPickup',        function(){ var inv=G.inventory; if(inv) self._stats.gold=inv.gold; self._check(); });
    G.Events.on('equipChanged',      function(){ var inv=G.inventory; if(inv) self._stats.gold=inv.gold; self._check(); });

    if (!this._panel) return;
    document.getElementById('ach-close').addEventListener('click', function(){ self.hide(); });
  }

  AchievementSystem.prototype._onMonsterKill = function(m) {
    var id = m.type.id;
    this._stats.totalKills++;
    this._stats.kills[id] = (this._stats.kills[id]||0)+1;
    this._check();
  };
  AchievementSystem.prototype._onBossKill = function(boss) {
    this._stats.bossKills++;
    if (!this._stats._bossIds) this._stats._bossIds={};
    if (!this._stats._bossIds[boss.def.id]) { this._stats._bossIds[boss.def.id]=true; this._stats.uniqueBoss++; }
    this._check();
  };
  AchievementSystem.prototype._onAreaChange = function(area) {
    this._stats.areas[area.id] = true;
    this._check();
  };
  AchievementSystem.prototype._onCheck = function(e) {
    if (e.type === 'gather')   { this._stats.gathers++;  }
    if (e.type === 'craft')    { this._stats.crafts++;   }
    if (e.type === 'treasure') { this._stats.treasures++;}
    this._check();
  };

  AchievementSystem.prototype._check = function() {
    var inv = G.inventory;
    if (inv) this._stats.gold = inv.gold;
    var lv  = G._levelSys;
    if (lv) this._stats.level = lv.level;
    var self = this;
    ACH_DEFS.forEach(function (a) {
      if (self._unlocked[a.id]) return;
      try {
        if (a.cond(self._stats)) {
          self._unlocked[a.id] = true;
          self._showUnlockNotif(a);
          if (a.title && self._titles.indexOf(a.title) < 0) {
            self._titles.push(a.title);
            if (!self._activeTitle) { self._activeTitle = a.title; self._updateTitleEl(); }
          }
          G.Events.emit('achievementUnlocked', { ach: a });
        }
      } catch(ex) {}
    });
  };

  AchievementSystem.prototype._showUnlockNotif = function(a) {
    var el = document.getElementById('ach-notif');
    if (!el) return;
    el.innerHTML = a.icon + ' 成就解鎖：<b>' + a.name + '</b>' + (a.title ? ' ｜ 稱號：【' + a.title + '】' : '');
    el.style.display = 'block';
    clearTimeout(this._notifT);
    var self = this;
    this._notifT = setTimeout(function(){ el.style.display='none'; }, 4000);
  };

  AchievementSystem.prototype._updateTitleEl = function() {
    if (this._titleEl) {
      this._titleEl.textContent = this._activeTitle ? '【' + this._activeTitle + '】' : '';
    }
    var hudTitle = document.getElementById('hud-title');
    if (hudTitle) hudTitle.textContent = this._activeTitle ? '【' + this._activeTitle + '】' : '';
  };

  AchievementSystem.prototype.setActiveTitle = function(title) {
    this._activeTitle = title;
    this._updateTitleEl();
  };

  AchievementSystem.prototype.show = function () {
    this._render();
    if (this._panel) this._panel.classList.add('open');
    G._uiOpen = true;
  };
  AchievementSystem.prototype.hide = function () {
    if (this._panel) this._panel.classList.remove('open');
    G._checkUiOpen();
  };
  AchievementSystem.prototype.toggle = function () {
    if (this._panel && this._panel.classList.contains('open')) this.hide();
    else this.show();
  };

  var CAT_NAMES = { combat:'戰鬥', explore:'探索', gather:'採集', craft:'製作', growth:'成長', event:'世界事件' };

  AchievementSystem.prototype._render = function () {
    if (!this._listEl) return;
    var self = this;
    var cats = ['combat','explore','gather','craft','growth','event'];
    this._listEl.innerHTML = cats.map(function(cat) {
      var achs = ACH_DEFS.filter(function(a){ return a.cat===cat; });
      return '<div class="ach-cat">' + CAT_NAMES[cat] + '</div>' +
        achs.map(function(a){
          var done = !!self._unlocked[a.id];
          return '<div class="ach-item'+(done?' ach-done':'')+'">'+
            '<span class="ach-icon">'+a.icon+'</span>'+
            '<div><div class="ach-name">'+(done?a.name:'???')+'</div>'+
            '<div class="ach-desc">'+(done?a.desc:'未解鎖')+'</div>'+
            (done&&a.title?'<div class="ach-title-tag">稱號：【'+a.title+'】</div>':'')+'</div>'+
            (done?'<span class="ach-check">✓</span>':'')+'</div>';
        }).join('');
    }).join('');
  };

  AchievementSystem.prototype.serialize = function () {
    return { unlocked: this._unlocked, stats: this._stats, titles: this._titles, activeTitle: this._activeTitle };
  };
  AchievementSystem.prototype.deserialize = function (d) {
    if (!d) return;
    this._unlocked    = d.unlocked    || {};
    this._stats       = Object.assign(this._stats, d.stats || {});
    this._titles      = d.titles      || [];
    this._activeTitle = d.activeTitle || '';
    this._updateTitleEl();
  };

  G.AchievementSystem = AchievementSystem;
  G.ACH_DEFS          = ACH_DEFS;
})(window.Game = window.Game || {});
