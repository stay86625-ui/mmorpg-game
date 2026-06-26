(function (G) {
  'use strict';

  // ── BestiarySystem ────────────────────────────────────────────────────────
  function BestiarySystem() {
    this._kills     = {};  // monsterId → count
    this._seen      = {};  // monsterId → true
    this._panel     = document.getElementById('bestiary-panel');
    this._listEl    = document.getElementById('bestiary-list');

    if (!this._panel) return;
    var self = this;
    document.getElementById('bestiary-close').addEventListener('click', function(){ self.hide(); });

    G.Events.on('monsterDead', function (e) { self._onKill(e.monster); });
  }

  BestiarySystem.prototype._onKill = function (m) {
    var id = m.type.id;
    this._seen[id]  = true;
    this._kills[id] = (this._kills[id] || 0) + 1;
    G.Events.emit('achievementCheck', { type:'kill', monsterId:id, total:this._kills[id] });
  };

  BestiarySystem.prototype.getKills  = function (id) { return this._kills[id] || 0; };
  BestiarySystem.prototype.totalKills = function () {
    var total = 0;
    Object.keys(this._kills).forEach(function(k){ total += this._kills[k]; }, this);
    return total;
  };

  BestiarySystem.prototype.show = function () {
    this._render();
    if (this._panel) this._panel.classList.add('open');
    G._uiOpen = true;
  };
  BestiarySystem.prototype.hide = function () {
    if (this._panel) this._panel.classList.remove('open');
    G._checkUiOpen();
  };
  BestiarySystem.prototype.toggle = function () {
    if (this._panel && this._panel.classList.contains('open')) this.hide();
    else this.show();
  };

  BestiarySystem.prototype._render = function () {
    if (!this._listEl) return;
    var self    = this;
    var BIOMES  = G.BIOME_MONSTERS || {};
    var entries = [];
    Object.keys(BIOMES).forEach(function (biome) {
      (BIOMES[biome] || []).forEach(function (t) {
        var seen  = !!self._seen[t.id];
        var kills = self._kills[t.id] || 0;
        entries.push({ type:t, biome:biome, seen:seen, kills:kills });
      });
    });

    this._listEl.innerHTML = entries.map(function (e) {
      var t = e.type;
      var name = e.seen ? t.name : '???';
      var def = G.MONSTER_DEFS ? G.MONSTER_DEFS[t.id] : null;
      var clr = def ? ('rgb('+def.r+','+def.g+','+def.b+')') : '#888';
      return '<div class="bst-row">' +
        '<div class="bst-icon" style="background:'+clr+';width:18px;height:18px;border-radius:3px;display:inline-block;margin-right:8px"></div>' +
        '<span class="bst-name" style="color:'+(e.seen?'rgba(210,190,140,.9)':'rgba(80,80,80,.6)')+'">'+name+'</span>' +
        '<span class="bst-bio">'+(e.seen?'【'+e.biome+'區】':'?')+'</span>' +
        '<span class="bst-kills" style="color:'+(e.kills>0?'#88EE88':'rgba(80,80,80,.5)')+'">擊殺：'+e.kills+'</span>' +
      '</div>';
    }).join('');
  };

  BestiarySystem.prototype.serialize   = function () { return { kills: this._kills, seen: this._seen }; };
  BestiarySystem.prototype.deserialize = function (d) {
    if (!d) return;
    this._kills = d.kills || {};
    this._seen  = d.seen  || {};
  };

  G.BestiarySystem = BestiarySystem;
})(window.Game = window.Game || {});
