(function (G) {
  'use strict';

  var SIZE = 140;  // 小地圖像素大小
  var VIEW = 70;   // 顯示範圍（世界單位，半徑）
  var PPU  = SIZE / (VIEW * 2);  // 每世界單位像素數

  var BIOME_RGBA = {
    F: [34, 74, 20],
    G: [55, 105, 35],
    S: [165, 195, 210],
    D: [180, 145, 60],
    V: [105, 28, 14],
    A: [25, 12, 45],
  };

  function Minimap() {
    var cv = document.createElement('canvas');
    cv.width  = SIZE;
    cv.height = SIZE;
    cv.title  = '小地圖';
    var s = cv.style;
    s.position      = 'fixed';
    s.bottom        = '70px';
    s.right         = '14px';
    s.zIndex        = '50';
    s.borderRadius  = '4px';
    s.border        = '1px solid rgba(80,120,180,.35)';
    s.background    = 'rgba(0,0,0,.55)';
    s.pointerEvents = 'none';
    s.opacity       = '0.88';
    s.display       = 'none';
    document.body.appendChild(cv);

    this._cv    = cv;
    this._ctx   = cv.getContext('2d');
    this._img   = this._ctx.createImageData(SIZE, SIZE);
    this._timer = 0;
    this._lastPX = null; this._lastPZ = null;
  }

  Minimap.prototype.show = function () { this._cv.style.display = 'block'; };

  Minimap.prototype.update = function (dt, playerX, playerZ, monsters) {
    this._timer -= dt;
    var moved = Math.abs(playerX - this._lastPX) > 3 || Math.abs(playerZ - this._lastPZ) > 3;
    if (this._timer > 0 && !moved) return;
    this._timer = 0.22;
    this._lastPX = playerX; this._lastPZ = playerZ;

    var ctx  = this._ctx;
    var data = this._img.data;
    var step = 5;   // 每 5px 取樣一次（降低 CPU）

    for (var py = 0; py < SIZE; py += step) {
      for (var px = 0; px < SIZE; px += step) {
        var wx = playerX + (px - SIZE / 2) / PPU;
        var wz = playerZ + (py - SIZE / 2) / PPU;
        var w  = G.Biome.getBiomeWeights(wx, wz);
        var biome = Object.keys(w).sort(function (a, b) { return w[b] - w[a]; })[0];
        var c = BIOME_RGBA[biome] || [50, 50, 50];
        // 填充 step×step 方塊
        for (var dy = 0; dy < step && py+dy < SIZE; dy++) {
          for (var dx = 0; dx < step && px+dx < SIZE; dx++) {
            var idx = ((py + dy) * SIZE + (px + dx)) * 4;
            data[idx]   = c[0];
            data[idx+1] = c[1];
            data[idx+2] = c[2];
            data[idx+3] = 215;
          }
        }
      }
    }
    ctx.putImageData(this._img, 0, 0);

    // 怪物（紅點）
    if (monsters) {
      ctx.fillStyle = 'rgba(255,55,55,.88)';
      for (var i = 0; i < monsters.length; i++) {
        var m = monsters[i];
        if (m.dead) continue;
        var mx = (m.x - playerX) * PPU + SIZE / 2;
        var mz = (m.z - playerZ) * PPU + SIZE / 2;
        if (mx < 2 || mx > SIZE-2 || mz < 2 || mz > SIZE-2) continue;
        ctx.fillRect(mx - 1.5, mz - 1.5, 3, 3);
      }
    }

    // 玩家（白色十字）
    var cx = SIZE / 2, cz = SIZE / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 2, cz - 2, 4, 4);
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 2, cz - 2, 4, 4);

    // 羅盤 N
    ctx.fillStyle = 'rgba(210,190,140,.65)';
    ctx.font = '8px monospace';
    ctx.fillText('N', cx - 3, 10);
  };

  G.Minimap = Minimap;
})(window.Game = window.Game || {});
