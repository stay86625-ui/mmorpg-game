(function (G) {
  'use strict';

  // ── 勢力定義 ───────────────────────────────────────────────────────────────
  var FACTIONS = [
    { id:'village',  name:'魔法村',     icon:'🏡', color:'#88FF88', desc:'村莊居民與守衛' },
    { id:'hunters',  name:'獵人公會',   icon:'⚔',  color:'#FF9800', desc:'討伐怪物的精英獵人' },
    { id:'merchants',name:'商人聯盟',   icon:'🪙',  color:'#FFD700', desc:'掌控貿易的富商集團' },
    { id:'mages',    name:'魔法學院',   icon:'✨',  color:'#9C27B0', desc:'研究魔法的學者' },
    { id:'dwarves',  name:'矮人工匠',   icon:'⚒',  color:'#795548', desc:'精通鍛造的工匠族' },
    { id:'elves',    name:'精靈之林',   icon:'🌲',  color:'#4CAF50', desc:'守護自然的精靈族' },
  ];

  var REP_TIERS = [
    { id:'hostile',  name:'敵對',   min:-10000, max:-500,  color:'#FF1744' },
    { id:'cold',     name:'冷淡',   min:-499,   max:-1,    color:'#FF7043' },
    { id:'neutral',  name:'中立',   min:0,      max:499,   color:'#9E9E9E' },
    { id:'friendly', name:'友善',   min:500,    max:2499,  color:'#4CAF50' },
    { id:'honored',  name:'尊敬',   min:2500,   max:5999,  color:'#2196F3' },
    { id:'revered',  name:'崇拜',   min:6000,   max:99999, color:'#FF9800' },
  ];

  // 哪些行為增加哪個勢力的聲望
  var REP_GAINS = {
    monsterDead: {
      slime:   { village:5,  hunters:3  },
      wolf:    { village:8,  hunters:5  },
      boar:    { village:6,  hunters:4  },
      goblin:  { hunters:10, village:5  },
      skeleton:{ hunters:8,  mages:4    },
      orc:     { hunters:12, village:6  },
      golem:   { mages:8,    dwarves:6  },
      drake:   { hunters:20, village:10 },
      treant:  { elves:-10,  hunters:8  },
      lavaDemon:{ hunters:25, mages:15  },
      iceWyvern:{ hunters:25, mages:15  },
      voidEntity:{ mages:30, hunters:20 },
    },
    questComplete: {
      q_slime_hunt:   { village:100,  hunters:50  },
      q_wolf_threat:  { hunters:100,  village:50  },
      q_gather_herbs: { village:80,   mages:60    },
      q_iron_supply:  { dwarves:120,  merchants:40},
      q_boar_menace:  { village:100,  hunters:60  },
      q_ice_crystal:  { mages:150,    hunters:50  },
      q_fire_boss:    { hunters:200,  village:100 },
      q_void_essence: { mages:250,    hunters:150 },
    },
    craft: {
      dwarves:5, merchants:2,
    },
    gather: {
      elves:3,
    },
  };

  function getTier(rep) {
    for (var i = REP_TIERS.length - 1; i >= 0; i--) {
      if (rep >= REP_TIERS[i].min) return REP_TIERS[i];
    }
    return REP_TIERS[0];
  }

  // ── ReputationSystem ───────────────────────────────────────────────────────
  function ReputationSystem() {
    this._rep = {};
    FACTIONS.forEach(function(f){ this._rep[f.id] = 0; }, this);

    this._panel  = document.getElementById('rep-panel');
    this._listEl = document.getElementById('rep-list');

    if (!this._panel) return;
    var self = this;
    document.getElementById('rep-close').addEventListener('click', function(){ self.hide(); });

    G.Events.on('monsterDead',     function(e){ self._onMonsterKill(e.monster); });
    G.Events.on('questComplete',   function(e){ self._onQuestComplete(e.questId); });
    G.Events.on('achievementCheck',function(e){
      if (e.type === 'gather') self._addRep('elves', REP_GAINS.gather.elves);
      if (e.type === 'craft')  { self._addRep('dwarves', REP_GAINS.craft.dwarves); self._addRep('merchants', REP_GAINS.craft.merchants); }
    });
  }

  function findFaction(id) {
    for (var i = 0; i < FACTIONS.length; i++) { if (FACTIONS[i].id === id) return FACTIONS[i]; }
    return null;
  }

  ReputationSystem.prototype._addRep = function(factionId, amount) {
    if (!this._rep.hasOwnProperty(factionId)) return;
    var before = getTier(this._rep[factionId]);
    this._rep[factionId] = Math.max(-10000, Math.min(99999, (this._rep[factionId]||0) + amount));
    var after  = getTier(this._rep[factionId]);
    if (before.id !== after.id) {
      var fac  = findFaction(factionId);
      var icon = fac ? fac.icon : '';
      var name = fac ? fac.name : factionId;
      G.Events.emit('showNotif', {
        msg: icon + ' ' + name + ' 聲望提升：' + before.name + ' → <b style="color:' + after.color + '">' + after.name + '</b>',
        clr: after.color, duration: 4000,
      });
    }
  };

  ReputationSystem.prototype._onMonsterKill = function(m) {
    var gains = REP_GAINS.monsterDead[m.type.id];
    if (!gains) return;
    var self = this;
    Object.keys(gains).forEach(function(fid){ self._addRep(fid, gains[fid]); });
  };

  ReputationSystem.prototype._onQuestComplete = function(questId) {
    var gains = REP_GAINS.questComplete[questId];
    if (!gains) return;
    var self = this;
    Object.keys(gains).forEach(function(fid){ self._addRep(fid, gains[fid]); });
  };

  ReputationSystem.prototype.getTier   = function(fid) { return getTier(this._rep[fid]||0); };
  ReputationSystem.prototype.getRep    = function(fid) { return this._rep[fid]||0; };
  ReputationSystem.prototype.isFriendly = function(fid) {
    var t = this.getTier(fid);
    return t.id === 'friendly' || t.id === 'honored' || t.id === 'revered';
  };

  ReputationSystem.prototype.show = function () {
    this._render();
    if (this._panel) this._panel.classList.add('open');
    G._uiOpen = true;
  };
  ReputationSystem.prototype.hide = function () {
    if (this._panel) this._panel.classList.remove('open');
    G._checkUiOpen();
  };
  ReputationSystem.prototype.toggle = function () {
    if (this._panel && this._panel.classList.contains('open')) this.hide();
    else this.show();
  };

  ReputationSystem.prototype._render = function () {
    if (!this._listEl) return;
    var self = this;
    this._listEl.innerHTML = FACTIONS.map(function(f) {
      var rep  = self._rep[f.id]||0;
      var tier = getTier(rep);
      var next = REP_TIERS[REP_TIERS.indexOf(tier)+1];
      var pct  = next ? Math.round((rep - tier.min) / (next.min - tier.min) * 100) : 100;
      return '<div class="rep-row">'+
        '<span class="rep-icon">'+f.icon+'</span>'+
        '<div class="rep-info">'+
          '<div class="rep-name" style="color:'+f.color+'">'+f.name+'</div>'+
          '<div class="rep-tier" style="color:'+tier.color+'">'+tier.name+'（'+rep+'）</div>'+
          '<div class="rep-bar"><div class="rep-fill" style="width:'+pct+'%;background:'+tier.color+'"></div></div>'+
        '</div>'+
      '</div>';
    }).join('');
  };

  ReputationSystem.prototype.serialize   = function () { return { rep: this._rep }; };
  ReputationSystem.prototype.deserialize = function (d) {
    if (!d) return;
    this._rep = Object.assign({}, this._rep, d.rep || {});
  };

  G.ReputationSystem = ReputationSystem;
  G.FACTIONS         = FACTIONS;
})(window.Game = window.Game || {});
