(function (G) {
  'use strict';

  // 每種生態區的怪物表（先定義好資料，渲染/AI 後續再加）
  var BIOME_MONSTERS = {
    F: [
      { id:'slime',      name:'史萊姆',   maxHp:50,  atk:5,  spd:1.5, scale:0.8, exp:8  },
      { id:'wolf',       name:'野狼',     maxHp:80,  atk:12, spd:3.0, scale:1.0, exp:15 },
    ],
    G: [
      { id:'rabbit',     name:'野兔',     maxHp:30,  atk:2,  spd:4.0, scale:0.6, exp:5  },
      { id:'boar',       name:'野豬',     maxHp:100, atk:20, spd:2.5, scale:1.2, exp:22 },
    ],
    S: [
      { id:'snowWolf',   name:'雪狼',     maxHp:120, atk:18, spd:3.5, scale:1.1, exp:28 },
      { id:'iceElem',    name:'冰元素',   maxHp:150, atk:22, spd:1.5, scale:1.2, exp:35 },
    ],
    D: [
      { id:'scorpion',   name:'蠍子',     maxHp:90,  atk:15, spd:2.5, scale:0.9, exp:20 },
      { id:'sandworm',   name:'沙蟲',     maxHp:200, atk:25, spd:1.0, scale:2.0, exp:45 },
    ],
    V: [
      { id:'fireElem',   name:'火元素',   maxHp:180, atk:30, spd:2.0, scale:1.3, exp:52 },
      { id:'lavaDemon',  name:'熔岩魔',   maxHp:250, atk:35, spd:1.5, scale:1.5, exp:75 },
    ],
    A: [
      { id:'voidSpirit', name:'虛空精',   maxHp:300, atk:40, spd:2.5, scale:1.0, exp:90 },
      { id:'abyssLord',  name:'深淵領主', maxHp:800, atk:80, spd:1.8, scale:2.0, exp:200},
    ],
  };

  // 代表一個潛在的怪物重生點
  function SpawnPoint(wx, wz, type) {
    this.wx = wx;
    this.wz = wz;
    this.type = type;      // 怪物資料 reference
    this.monster = null;   // 未來放 Monster 實例
    this.respawnCd = 0;    // 重生倒計時（秒）
  }

  function SpawnManager() {
    this._points = {};     // 'cx,cz' → SpawnPoint[]
  }

  // 在 Chunk 載入時初始化其生成點（由 ChunkManager 呼叫）
  SpawnManager.prototype.initChunk = function (cx, cz) {
    var key = cx + ',' + cz;
    if (this._points[key]) return;

    var wx0 = cx * G.CHUNK_SIZE, wz0 = cz * G.CHUNK_SIZE;
    var w   = G.Biome.getBiomeWeights(wx0 + G.CHUNK_SIZE / 2, wz0 + G.CHUNK_SIZE / 2);
    var biome = Object.keys(w).sort(function (a, b) { return w[b] - w[a]; })[0];
    var types = BIOME_MONSTERS[biome];
    if (!types || !types.length) { this._points[key] = []; return; }

    var rng   = G.Noise.seededRNG((cx * 15731) ^ (cz * 789221));
    var count = Math.floor(rng() * 3); // 0~2 個生成點
    var pts   = [];
    for (var i = 0; i < count; i++) {
      pts.push(new SpawnPoint(
        wx0 + rng() * G.CHUNK_SIZE,
        wz0 + rng() * G.CHUNK_SIZE,
        types[Math.floor(rng() * types.length)]
      ));
    }
    this._points[key] = pts;
  };

  SpawnManager.prototype.unloadChunk = function (cx, cz) {
    delete this._points[cx + ',' + cz];
  };

  // 每幀更新（目前只跑重生倒計時，未來加 AI）
  SpawnManager.prototype.update = function (dt) {
    var keys = Object.keys(this._points);
    for (var ki = 0; ki < keys.length; ki++) {
      var pts = this._points[keys[ki]];
      for (var i = 0; i < pts.length; i++) {
        if (!pts[i].monster && pts[i].respawnCd > 0) pts[i].respawnCd -= dt;
      }
    }
  };

  SpawnManager.prototype.getSpawnPoints = function (cx, cz) {
    return this._points[cx + ',' + cz] || [];
  };

  G.SpawnManager   = SpawnManager;
  G.BIOME_MONSTERS = BIOME_MONSTERS;
})(window.Game = window.Game || {});
