(function (G) {
  'use strict';

  // NPC 定義已移至 CitySystem.js（各城市 NPC 由 CitySystem 管理）
  var NPC_DEFS = [];

  function NPCManager(stage) {
    this._npcs      = [];
    this._container = new PIXI.Container();
    stage.addChild(this._container);
    this._nearNPC   = null;

    for (var i = 0; i < NPC_DEFS.length; i++) {
      this._npcs.push(new G.NPC(NPC_DEFS[i]));
    }

    // 互動提示
    this._hintEl = document.getElementById('interact-hint');
  }

  NPCManager.prototype.update = function (dt, playerX, playerZ, cam, keys) {
    this._container.removeChildren();
    this._nearNPC = null;

    for (var i = 0; i < this._npcs.length; i++) {
      var npc = this._npcs[i];
      npc.update(dt, cam);
      this._container.addChild(npc.container);

      if (npc.isNearPlayer(playerX, playerZ)) {
        this._nearNPC = npc;
      }
    }

    // 提示與互動由 CitySystem 接管（NPC_DEFS 已清空）
    if (this._nearNPC && this._hintEl) {
      this._hintEl.style.display = 'block';
      this._hintEl.textContent = '按 [T] 與「' + this._nearNPC.name + '」對話';
    }
    if (this._nearNPC && (keys['t'] || keys['T'])) {
      keys['t'] = false; keys['T'] = false;
      G.NPC.showDialog(this._nearNPC);
    }
  };

  NPCManager.prototype.getNearNPC = function () { return this._nearNPC; };

  G.NPCManager = NPCManager;
})(window.Game = window.Game || {});
