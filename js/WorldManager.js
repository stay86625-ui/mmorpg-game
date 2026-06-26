(function (G) {
  'use strict';

  function WorldManager(stage) {
    this._cm = new G.ChunkManager();
    this.treeFarCont  = this._cm.treeFarCont;
    this.treeNearCont = this._cm.treeNearCont;
    stage.addChild(this.treeFarCont);
  }

  WorldManager.prototype.addNearContainer = function(stage) {
    stage.addChild(this.treeNearCont);
  };

  WorldManager.prototype.update = function(playerX, playerZ, cam, day) {
    this._cm.update(playerX, playerZ, cam, day);
  };

  Object.defineProperty(WorldManager.prototype, 'stats', {
    get: function() { return { chunks: this._cm.loadedCount }; }
  });

  G.WorldManager = WorldManager;
})(window.Game = window.Game || {});
