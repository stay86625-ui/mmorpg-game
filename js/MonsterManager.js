(function (G) {
  'use strict';

  var SCALE = G.SCALE, ISO_Z = G.ISO_Z;
  var W = G.W, H = G.H;

  var MAX_ACTIVE   = 40;   // 場上最多怪物數
  var SPAWN_RADIUS = G.CHUNK_SIZE * (G.LOAD_RADIUS - 0.5); // 生成距離
  var DESPAWN_DIST = G.CHUNK_SIZE * (G.LOAD_RADIUS + 1.2); // 超出後消除

  function MonsterManager(stage) {
    this._monsters   = [];
    this._container  = new PIXI.Container();
    stage.addChild(this._container);
  }

  // 每幀呼叫：更新 AI、位置，並從 SpawnManager 生成新怪
  // levelSystem / player 選填，用於死亡時給 EXP
  MonsterManager.prototype.update = function (dt, playerX, playerZ, cam, spawnManager, levelSystem, player) {
    this._container.removeChildren();

    // ── 從 SpawnPoints 生成怪物 ───────────────────────────────────────────
    if (this._monsters.length < MAX_ACTIVE && spawnManager) {
      var cx = Math.floor(playerX / G.CHUNK_SIZE);
      var cz = Math.floor(playerZ / G.CHUNK_SIZE);
      var R  = G.LOAD_RADIUS;
      for (var dz = -R; dz <= R; dz++) {
        for (var dx = -R; dx <= R; dx++) {
          var pts = spawnManager.getSpawnPoints(cx+dx, cz+dz);
          for (var pi = 0; pi < pts.length; pi++) {
            var pt = pts[pi];
            if (pt.monster || pt.respawnCd > 0) continue;
            if (this._monsters.length >= MAX_ACTIVE) break;
            var ddx = pt.wx - playerX, ddz = pt.wz - playerZ;
            var d = Math.sqrt(ddx*ddx + ddz*ddz);
            if (d > SPAWN_RADIUS * 0.4 && d < SPAWN_RADIUS) {
              // 城鎮安全區不生成怪
              if (G.TownSystem && G.TownSystem.isSafeZone(pt.wx, pt.wz)) continue;
              var mon = new G.Monster(pt.type, pt.wx, pt.wz);
              // 精英怪判定（AreaSystem 載入後）
              if (G.AreaSystem) G.AreaSystem.rollElite(mon);
              pt.monster = mon;
              this._monsters.push(mon);
            }
          }
        }
      }
    }

    // ── 更新每隻怪物 ──────────────────────────────────────────────────────
    var alive = [];
    for (var i = 0; i < this._monsters.length; i++) {
      var m = this._monsters[i];
      var ex = m.x - playerX, ez = m.z - playerZ;
      var dist = Math.sqrt(ex*ex + ez*ez);

      // 超出範圍→移除
      if (dist > DESPAWN_DIST) {
        this._releaseMonster(m, spawnManager);
        continue;
      }

      m.update(dt, playerX, playerZ);

      if (m.dead) {
        // EXP 已由 LevelSystem 監聽 monsterDead 事件處理
        this._releaseMonster(m, spawnManager);
        continue;
      }

      m.setScreenPos(cam);
      this._container.addChild(m.container);
      alive.push(m);
    }
    this._monsters = alive;
  };

  MonsterManager.prototype._releaseMonster = function (m, spawnManager) {
    // 找回對應的 SpawnPoint 並設定重生冷卻
    if (!spawnManager) return;
    var cx = Math.floor(m.x / G.CHUNK_SIZE);
    var cz = Math.floor(m.z / G.CHUNK_SIZE);
    var R  = G.LOAD_RADIUS;
    for (var dz = -R; dz <= R; dz++) {
      for (var dx = -R; dx <= R; dx++) {
        var pts = spawnManager.getSpawnPoints(cx+dx, cz+dz);
        for (var pi = 0; pi < pts.length; pi++) {
          if (pts[pi].monster === m) {
            pts[pi].monster   = null;
            pts[pi].respawnCd = m.dead ? 15 : 3; // 死亡→15秒重生，否則3秒
            break;
          }
        }
      }
    }
  };

  // 回傳所有活著的怪物（給 Combat 用）
  MonsterManager.prototype.getMonsters = function () { return this._monsters; };

  G.MonsterManager = MonsterManager;
})(window.Game = window.Game || {});
