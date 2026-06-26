(function (G) {
  'use strict';

  // 每級所需 EXP（index = level-1）
  var EXP_TABLE = [];
  for (var _i = 1; _i <= 60; _i++) {
    EXP_TABLE.push(Math.floor(80 * Math.pow(_i, 1.55)));
  }

  function LevelSystem() {
    this.level   = 1;
    this.exp     = 0;
    this.expNext = EXP_TABLE[0];
    this._noticeT  = 0;
    this._newLevel = 0;

    // 監聽怪物死亡事件
    var self = this;
    G.Events.on('monsterDead', function (e) {
      var player = G._player;
      if (player) self.addExp(e.monster.type.exp || 10, player);
    });
  }

  LevelSystem.prototype.addExp = function (amount, player) {
    if (this.level >= 60) return;
    this.exp += amount;
    while (this.level < 60 && this.exp >= this.expNext) {
      this.exp     -= this.expNext;
      this.level   += 1;
      this.expNext  = EXP_TABLE[Math.min(this.level - 1, 59)];
      this._onLevelUp(player);
    }
  };

  LevelSystem.prototype._onLevelUp = function (player) {
    player.baseMaxHp = Math.floor((player.baseMaxHp || player.maxHp) * 1.08 + 18);
    player.baseMaxMp = Math.floor((player.baseMaxMp || player.maxMp) * 1.06 + 12);
    player.mpRegen   = Math.min(player.mpRegen + 0.6, 30);
    this._noticeT    = 3.5;
    this._newLevel   = this.level;
    // 先重算含裝備加成的 maxHp/maxMp，再回滿血量
    G.Events.emit('equipChanged', {});
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    G.Events.emit('levelUp', { level: this.level });
  };

  LevelSystem.prototype.update = function (dt) {
    if (this._noticeT > 0) this._noticeT -= dt;
  };

  LevelSystem.prototype.expRatio = function () {
    return Math.min(1, this.exp / Math.max(1, this.expNext));
  };

  LevelSystem.prototype.popNotice = function () {
    if (this._noticeT > 3.3) {   // 只在升級後第一幀觸發
      return this._newLevel;
    }
    return 0;
  };

  G.LevelSystem = LevelSystem;
})(window.Game = window.Game || {});
