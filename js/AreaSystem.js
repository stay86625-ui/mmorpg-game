(function (G) {
  'use strict';

  // ── 區域定義（依生態區+距離中心判斷）────────────────────────────────────
  var AREAS = [
    { id:'town',     name:'魔法村',       minLv:1,  maxLv:1,  danger:0, biome:null,  maxDist:22,  color:'#88FF88' },
    { id:'forest',   name:'翠綠森林',     minLv:5,  maxLv:14, danger:1, biome:'F',   maxDist:999, color:'#44AA44' },
    { id:'grassland',name:'碧草原野',     minLv:1,  maxLv:9,  danger:1, biome:'G',   maxDist:999, color:'#99CC44' },
    { id:'snowfield',name:'永凍雪原',     minLv:15, maxLv:24, danger:2, biome:'S',   maxDist:999, color:'#AACCEE' },
    { id:'desert',   name:'焦灼沙漠',     minLv:10, maxLv:22, danger:2, biome:'D',   maxDist:999, color:'#DDAA44' },
    { id:'volcano',  name:'熔岩火山帶',   minLv:25, maxLv:39, danger:3, biome:'V',   maxDist:999, color:'#FF6622' },
    { id:'abyss',    name:'虛空深淵',     minLv:40, maxLv:60, danger:4, biome:'A',   maxDist:999, color:'#9944CC' },
  ];

  var DANGER_ICONS = ['', '⚠', '⚠⚠', '⚠⚠⚠', '💀'];
  var DANGER_NAMES = ['安全', '普通', '危險', '極危', '死亡'];
  var DANGER_COLORS= ['#88FF88','#AADD44','#FFAA22','#FF4422','#CC22FF'];

  // ── 精英怪配置 ────────────────────────────────────────────────────────────
  var ELITE_TIERS = [
    { id:'elite',   name:'精英',  prefix:'[精英]', hpMult:3.0, atkMult:1.8, expMult:3.0, dropBonus:2,  nameColor:'#FF9800', chance:0.12 },
    { id:'rare',    name:'稀有',  prefix:'[稀有]', hpMult:6.0, atkMult:2.5, expMult:6.0, dropBonus:4,  nameColor:'#9C27B0', chance:0.04 },
    { id:'champion',name:'首領',  prefix:'〖首領〗',hpMult:12,  atkMult:3.5, expMult:12,  dropBonus:6,  nameColor:'#FF1744', chance:0.01 },
  ];

  // ── AreaSystem ────────────────────────────────────────────────────────────
  function AreaSystem() {
    this._currentArea  = null;
    this._pendingArea  = null;  // 防抖：待確認區域
    this._pendingTime  = 0;     // 已在待確認區域的秒數
    this._areaEl       = document.getElementById('area-name');
    this._levelRangeEl = document.getElementById('area-level');
    this._dangerEl     = document.getElementById('area-danger');
    this._notifTimer   = 0;
  }

  AreaSystem.prototype.getArea = function (wx, wz) {
    var dist = Math.sqrt(wx*wx + wz*wz);
    // 城鎮優先
    if (dist < 22) return AREAS[0];
    // 取得生態區
    var biome = 'G';
    if (G.Biome) {
      var w = G.Biome.getBiomeWeights(wx, wz);
      biome = Object.keys(w).sort(function(a,b){ return w[b]-w[a]; })[0];
    }
    for (var i = 1; i < AREAS.length; i++) {
      if (AREAS[i].biome === biome) return AREAS[i];
    }
    return AREAS[2]; // fallback: grassland
  };

  AreaSystem.prototype.update = function (dt, playerX, playerZ) {
    var area = this.getArea(playerX, playerZ);

    if (!this._currentArea || this._currentArea.id !== area.id) {
      // 防抖：需在新區域停留 1.2 秒才觸發通知（避免邊界反覆觸發）
      if (!this._pendingArea || this._pendingArea.id !== area.id) {
        this._pendingArea = area;
        this._pendingTime = 0;
      } else {
        this._pendingTime += dt;
        if (this._pendingTime >= 1.2) {
          this._currentArea = area;
          this._pendingArea = null;
          this._showAreaNotif(area);
          G.Events.emit('areaChanged', { area: area });
        }
      }
    } else {
      this._pendingArea = null;
      this._pendingTime = 0;
    }

    if (this._notifTimer > 0) this._notifTimer -= dt;
    this._renderHUD(area);
  };

  AreaSystem.prototype._renderHUD = function (area) {
    if (this._areaEl)      this._areaEl.textContent      = area.name;
    if (this._areaEl)      this._areaEl.style.color       = area.color;
    if (this._levelRangeEl) this._levelRangeEl.textContent = 'Lv.' + area.minLv + '~' + area.maxLv;
    if (this._dangerEl) {
      this._dangerEl.textContent = DANGER_ICONS[area.danger] + ' ' + DANGER_NAMES[area.danger];
      this._dangerEl.style.color = DANGER_COLORS[area.danger];
    }
  };

  AreaSystem.prototype._showAreaNotif = function (area) {
    var el = document.getElementById('area-notif');
    if (!el) return;
    el.innerHTML =
      '<span style="color:' + area.color + ';font-size:11px;font-weight:600">' + area.name + '</span>' +
      '<span style="color:rgba(160,145,110,.65);font-size:9px">Lv.' + area.minLv + '~' + area.maxLv +
      ' ' + DANGER_ICONS[area.danger] + '</span>';
    el.style.display = 'flex';
    clearTimeout(this._notifTimer2);
    var self = this;
    this._notifTimer2 = setTimeout(function () { el.style.display = 'none'; }, 2800);
  };

  AreaSystem.prototype.getCurrentArea = function () { return this._currentArea; };

  // ── 精英怪生成 ────────────────────────────────────────────────────────────
  AreaSystem.rollElite = function (monster) {
    for (var i = ELITE_TIERS.length - 1; i >= 0; i--) {
      var tier = ELITE_TIERS[i];
      if (Math.random() < tier.chance) {
        monster.hp      = Math.round(monster.hp    * tier.hpMult);
        monster.maxHp   = monster.hp;
        monster.atk     = Math.round(monster.atk   * tier.atkMult);
        monster.type    = Object.assign({}, monster.type, {
          exp:         Math.round(monster.type.exp * tier.expMult),
          eliteTier:   tier,
          name:        tier.prefix + monster.type.name,
        });
        monster._elite  = tier;
        // 等比放大（rollElite 在 addChild 之前呼叫，直接修改 scale 即可）
        if (monster.sprite) {
          monster.sprite.scale.x *= 1.25;
          monster.sprite.scale.y *= 1.25;
        }
        return tier;
      }
    }
    return null;
  };

  G.AreaSystem   = AreaSystem;
  G.ELITE_TIERS  = ELITE_TIERS;
  G.AREA_LIST    = AREAS;
})(window.Game = window.Game || {});
