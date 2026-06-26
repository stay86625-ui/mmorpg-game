(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;
  var CHUNK_SIZE = G.CHUNK_SIZE, LOAD_RADIUS = G.LOAD_RADIUS;
  var Shaders = G.Shaders, Biome = G.Biome;
  var seededRNG = G.Noise.seededRNG;
  var ObjectPool = G.ObjectPool;

  // 每種生態區的 prop 配置
  var BIOME_PROPS = {
    F: [ {type:'bush', freq:7}, {type:'rock', freq:2} ],
    G: [ {type:'bush', freq:5}, {type:'rock', freq:2} ],
    S: [ {type:'rock', freq:5}, {type:'bush', freq:1} ],
    D: [ {type:'rock', freq:4} ],
    V: [ {type:'rock', freq:6} ],
    A: [ {type:'rock', freq:3}, {type:'bush', freq:1} ],
  };

  function ChunkManager() {
    this.chunks   = {};
    this.treePool = new ObjectPool(this._makeTreeMesh.bind(this), 300);
    this.rockPool = new ObjectPool(this._makeRockMesh.bind(this), 200);
    this.bushPool = new ObjectPool(this._makeBushMesh.bind(this), 150);
    this.treeFarCont  = new PIXI.Container();
    this.treeNearCont = new PIXI.Container();
  }

  ChunkManager.prototype._makeTreeMesh = function () {
    var sh = PIXI.Shader.from(Shaders.BV, Shaders.TREE_F, {
      uDT:0, uT:0, uTy:0, uWind:1,
      uSX:W/2, uSY:H/2, uSW:100, uSH:100,
      uBTR:.5, uBTG:.72, uBTB:.4, uBW:0, uDy:0, uDw:0, uSs:0
    });
    var m = new PIXI.Mesh(Shaders.BILL_G, sh);
    m._sh = sh; m._kind = 'tree';
    var shadowSh = PIXI.Shader.from(Shaders.BV, Shaders.SHADOW_F, {
      uDy:0, uSX:W/2, uSY:H/2, uSW:100, uSH:50
    });
    m._shadowM  = new PIXI.Mesh(Shaders.SH_G, shadowSh);
    m._shadowSh = shadowSh;
    return m;
  };

  ChunkManager.prototype._makeRockMesh = function () {
    var sh = PIXI.Shader.from(Shaders.BV, Shaders.ROCK_F, {
      uDy:0, uDw:0, uSs:0,
      uTy:0, uBW:0, uBTR:.4, uBTG:.36, uBTB:.28,
      uSX:W/2, uSY:H/2, uSW:40, uSH:30,
    });
    var m = new PIXI.Mesh(Shaders.BILL_G, sh);
    m._sh = sh; m._kind = 'rock';
    return m;
  };

  ChunkManager.prototype._makeBushMesh = function () {
    var sh = PIXI.Shader.from(Shaders.BV, Shaders.BUSH_F, {
      uDy:0, uDw:0, uSs:0,
      uT:0, uTy:0, uWind:1, uBW:0, uBTR:.3, uBTG:.6, uBTB:.2,
      uSX:W/2, uSY:H/2, uSW:35, uSH:25,
    });
    var m = new PIXI.Mesh(Shaders.BILL_G, sh);
    m._sh = sh; m._kind = 'bush';
    return m;
  };

  ChunkManager.prototype.update = function (playerX, playerZ, cam, day) {
    var cx = Math.floor(playerX / CHUNK_SIZE);
    var cz = Math.floor(playerZ / CHUNK_SIZE);

    for (var dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
      for (var dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
        var key = (cx+dx) + ',' + (cz+dz);
        if (!this.chunks[key]) this._loadChunk(cx+dx, cz+dz);
      }
    }

    var self = this;
    Object.keys(this.chunks).forEach(function (key) {
      var parts = key.split(',');
      var ccx = parseInt(parts[0], 10), ccz = parseInt(parts[1], 10);
      if (Math.abs(ccx-cx) > LOAD_RADIUS+1 || Math.abs(ccz-cz) > LOAD_RADIUS+1) {
        self._unloadChunk(key);
      }
    });

    this.treeFarCont.removeChildren();
    this.treeNearCont.removeChildren();

    var viewHW = W / SCALE * 0.62;
    var viewHH = H / (SCALE * ISO_Z) * 0.62;
    var isDy = day.isDy, isDw = day.isDw, isSs = day.isSs;
    var T = day.T, DT = day.DT, windStr = day.windStr;

    var keys = Object.keys(this.chunks);
    for (var ki = 0; ki < keys.length; ki++) {
      var chunk = this.chunks[keys[ki]];

      // ── 樹木 ─────────────────────────────────────────────────────────────
      var trees = chunk.trees;
      for (var ti = 0; ti < trees.length; ti++) {
        var tm = trees[ti];
        var ddx = tm._wx - cam.x, ddz = tm._wz - cam.z;
        if (Math.abs(ddx) > viewHW + tm._wW || Math.abs(ddz) > viewHH + tm._wH) continue;
        var sx = W/2 + ddx * SCALE, sy = H/2 + ddz * SCALE * ISO_Z;
        var u = tm._sh.uniforms;
        u.uSX=sx; u.uSY=sy; u.uSW=tm._wW*SCALE; u.uSH=tm._wH*SCALE;
        u.uWind=windStr; u.uT=T; u.uDT=DT; u.uDy=isDy; u.uDw=isDw; u.uSs=isSs;
        var su = tm._shadowSh.uniforms;
        su.uSX=sx; su.uSY=sy; su.uDy=isDy;
        var fc = tm._wz < playerZ ? this.treeFarCont : this.treeNearCont;
        fc.addChild(tm._shadowM); fc.addChild(tm);
      }

      // ── Props（岩石 / 灌木）──────────────────────────────────────────────
      var props = chunk.props;
      for (var pi = 0; pi < props.length; pi++) {
        var pm = props[pi];
        var pdx = pm._wx - cam.x, pdz = pm._wz - cam.z;
        if (Math.abs(pdx) > viewHW + pm._wW || Math.abs(pdz) > viewHH + pm._wH) continue;
        var psx = W/2 + pdx * SCALE, psy = H/2 + pdz * SCALE * ISO_Z;
        var pu = pm._sh.uniforms;
        pu.uSX=psx; pu.uSY=psy; pu.uSW=pm._wW*SCALE; pu.uSH=pm._wH*SCALE;
        pu.uDy=isDy; pu.uDw=isDw; pu.uSs=isSs;
        if (pm._kind === 'bush') { pu.uT=T; pu.uWind=windStr; }
        var pfc = pm._wz < playerZ ? this.treeFarCont : this.treeNearCont;
        pfc.addChild(pm);
      }
    }
  };

  ChunkManager.prototype._loadChunk = function (cx, cz) {
    var wx0 = cx * CHUNK_SIZE, wz0 = cz * CHUNK_SIZE;
    var rng  = seededRNG((cx * 374761393) ^ (cz * 668265263));
    var midDensity = Biome.getTreeDensity(wx0 + CHUNK_SIZE/2, wz0 + CHUNK_SIZE/2);
    var count = Math.floor(midDensity + rng() * 3);
    var trees = [];
    for (var i = 0; i < count; i++) {
      var wx = wx0 + rng() * CHUNK_SIZE;
      var wz = wz0 + rng() * CHUNK_SIZE;
      var ty = rng();
      var wH = 3.2 + rng() * 2.8, wW = 2.2 + rng() * 1.6;
      var tint = Biome.getBiomeTint(wx, wz);
      var mesh = this.treePool.acquire();
      mesh._wx = wx; mesh._wz = wz; mesh._wH = wH; mesh._wW = wW;
      var u = mesh._sh.uniforms;
      u.uTy=ty; u.uSW=wW*SCALE; u.uSH=wH*SCALE;
      u.uBTR=tint.r; u.uBTG=tint.g; u.uBTB=tint.b; u.uBW=tint.w;
      mesh._shadowSh.uniforms.uSW = wW*SCALE*1.15;
      mesh._shadowSh.uniforms.uSH = wW*SCALE*ISO_Z*0.50;
      trees.push(mesh);
    }

    // ── Props ──────────────────────────────────────────────────────────────
    var w = Biome.getBiomeWeights(wx0 + CHUNK_SIZE/2, wz0 + CHUNK_SIZE/2);
    var biome = Object.keys(w).sort(function (a, b) { return w[b] - w[a]; })[0];
    var tintM = Biome.getBiomeTint(wx0 + CHUNK_SIZE/2, wz0 + CHUNK_SIZE/2);
    var propDefs = BIOME_PROPS[biome] || [];
    var props = [];
    var rng2 = seededRNG((cx * 223456789) ^ (cz * 987654321));
    for (var di = 0; di < propDefs.length; di++) {
      var def = propDefs[di];
      var pcount = Math.floor(rng2() * def.freq);
      for (var pi = 0; pi < pcount; pi++) {
        var pwx = wx0 + rng2() * CHUNK_SIZE;
        var pwz = wz0 + rng2() * CHUNK_SIZE;
        var pty = rng2();
        var pmesh;
        if (def.type === 'rock') {
          pmesh = this.rockPool.acquire();
          var rW = 0.7 + rng2() * 0.7, rH = 0.45 + rng2() * 0.35;
          pmesh._wW = rW; pmesh._wH = rH;
          var ru = pmesh._sh.uniforms;
          ru.uTy=pty; ru.uSW=rW*SCALE; ru.uSH=rH*SCALE;
          ru.uBTR=tintM.r; ru.uBTG=tintM.g; ru.uBTB=tintM.b; ru.uBW=tintM.w*0.5;
        } else {
          pmesh = this.bushPool.acquire();
          var bW = 0.6 + rng2() * 0.5, bH = 0.45 + rng2() * 0.3;
          pmesh._wW = bW; pmesh._wH = bH;
          var bu = pmesh._sh.uniforms;
          bu.uTy=pty; bu.uSW=bW*SCALE; bu.uSH=bH*SCALE;
          bu.uBTR=tintM.r; bu.uBTG=tintM.g; bu.uBTB=tintM.b; bu.uBW=tintM.w;
        }
        pmesh._wx = pwx; pmesh._wz = pwz;
        props.push(pmesh);
      }
    }

    var key = cx + ',' + cz;
    this.chunks[key] = { cx:cx, cz:cz, trees:trees, props:props };
  };

  ChunkManager.prototype._unloadChunk = function (key) {
    var chunk = this.chunks[key];
    for (var i = 0; i < chunk.trees.length; i++) this.treePool.release(chunk.trees[i]);
    for (var j = 0; j < chunk.props.length; j++) {
      var pm = chunk.props[j];
      if (pm._kind === 'rock') this.rockPool.release(pm);
      else this.bushPool.release(pm);
    }
    delete this.chunks[key];
  };

  Object.defineProperty(ChunkManager.prototype, 'loadedCount', {
    get: function () { return Object.keys(this.chunks).length; }
  });

  G.ChunkManager = ChunkManager;
})(window.Game = window.Game || {});
