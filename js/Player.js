(function (G) {
  'use strict';

  var CHAR_CW = G.CHAR_CW, CHAR_CH = G.CHAR_CH, CHAR_SC = G.CHAR_SC;
  var CLS_NAMES = G.CLS_NAMES;
  var ANIM = null; // 等 CharacterRenderer 載入後設定

  // ── 像素風角色繪製（備援） ────────────────────────────────────────────────
  function makePixelChar(cls) {
    var cv = document.createElement('canvas');
    cv.width = CHAR_CW; cv.height = CHAR_CH;
    var c = cv.getContext('2d');
    var OL = '#0A0A18';
    var PALS = [
      ['#BBBDDF','#F0CCA8','#2E0950','#56138E','#BF9618','#1C0340','#7422C4','#9E58EC'],
      ['#1A4010','#E8C48A','#0D2607','#163E0E','#8C6E1C','#08130A','#24A828','#3CC43C'],
      ['#541010','#ECCB8C','#744E1E','#94723C','#4C2A10','#321202','#883A12','#C0642C'],
      ['#080E20','#E8C8A6','#040406','#0A0A18','#142040','#020204','#1840A8','#2860D8'],
      ['#606070','#E8C49A','#220404','#440808','#303030','#0E0000','#A01010','#C41818'],
    ];
    var P=PALS[cls],H=P[0],SK=P[1],RO=P[2],RI=P[3],BL=P[4],BT=P[5],EY=P[6],AC=P[7];
    var p=function(x,y,col){if(x<0||x>=CHAR_CW||y<0||y>=CHAR_CH)return;c.fillStyle=col;c.fillRect(x,y,1,1);};
    var r=function(x,y,w,h,col){c.fillStyle=col;c.fillRect(x,y,w,h);};
    var bx=function(x,y,w,h,col){r(x-1,y-1,w+2,h+2,OL);r(x,y,w,h,col);};
    var X=8;
    bx(X-3,25,3,5,BT);bx(X+1,25,3,5,BT);bx(X-3,19,3,7,RI);bx(X+1,19,3,7,RI);
    bx(X-4,16,9,9,RO);r(X,17,1,8,'rgba(0,0,0,0.10)');
    bx(X-3,11,7,8,RI);r(X-2,12,5,2,'rgba(255,255,255,0.07)');
    bx(X-6,11,4,4,RO);bx(X+3,11,4,4,RO);
    r(X-4,17,9,2,OL);r(X-3,18,7,1,BL);
    r(X-1,16,3,3,BL);p(X-2,16,OL);p(X+2,16,OL);p(X-2,19,OL);p(X+2,19,OL);
    bx(X-1,9,3,3,SK);bx(X-3,3,7,9,SK);r(X-2,4,1,7,'rgba(0,0,0,0.09)');
    p(X-4,6,SK);p(X-4,7,SK);p(X-5,5,OL);p(X-5,6,OL);p(X-5,7,OL);p(X-5,8,OL);p(X-4,5,OL);p(X-4,8,OL);
    p(X+4,6,SK);p(X+4,7,SK);p(X+5,5,OL);p(X+5,6,OL);p(X+5,7,OL);p(X+5,8,OL);p(X+4,5,OL);p(X+4,8,OL);
    r(X-4,5,4,4,OL);r(X-3,6,3,2,'#EDE8DC');p(X-2,6,EY);p(X-2,7,EY);p(X-3,6,'rgba(255,255,255,0.55)');
    r(X+1,5,4,4,OL);r(X+1,6,3,2,'#EDE8DC');p(X+2,6,EY);p(X+2,7,EY);p(X+3,6,'rgba(255,255,255,0.55)');
    r(X-3,4,2,1,H);r(X+1,4,2,1,H);r(X-1,10,3,1,'rgba(155,80,58,0.5)');
    if(cls===0){bx(X,0,2,2,RO);bx(X-1,2,4,2,RO);bx(X-2,3,6,2,RO);bx(X-4,4,10,2,RO);r(X-3,5,8,1,AC);r(X-3,4,8,2,H);bx(X-4,6,2,15,H);bx(X-5,8,1,11,H);bx(X+3,6,2,7,H);}
    else if(cls===1){bx(X+8,0,2,22,OL);r(X+8,1,2,21,'#96A8BC');r(X+8,1,1,21,'#C4D6F0');bx(X+6,13,6,2,BL);bx(X+8,15,2,6,'#563610');r(X+9,21,1,1,BL);r(X-3,2,7,5,OL);r(X-2,3,5,4,H);bx(X-3,0,2,4,H);bx(X-1,1,2,3,H);bx(X+1,0,2,4,H);bx(X+2,1,2,3,H);r(X-2,3,5,4,H);}
    else if(cls===2){bx(X-3,2,7,4,H);bx(X+4,4,2,17,H);bx(X+5,7,1,12,H);r(X+4,6,3,2,AC);p(X+3,6,OL);p(X+3,7,OL);p(X+7,6,OL);p(X+7,7,OL);bx(X-5,4,2,7,H);}
    else if(cls===3){bx(X-3,2,7,4,H);bx(X+4,4,2,18,H);bx(X+3,7,2,14,H);r(X-3,2,4,5,'rgba(0,0,0,0.30)');}
    else{bx(X-3,2,7,4,H);bx(X+3,1,4,4,H);bx(X+6,0,3,3,H);r(X-3,5,7,1,AC);p(X-4,5,OL);p(X+4,5,OL);}
    if(cls===0){r(X+7,8,7,7,'rgba(120,50,240,0.22)');bx(X+8,9,5,5,AC);r(X+9,10,3,3,RO);r(X+10,10,1,1,'#DEC0FF');p(X+10,10,'rgba(255,255,255,0.7)');bx(X+10,14,1,10,RI);}
    else if(cls===2){bx(X+7,3,2,18,RO);r(X+8,4,1,16,'#9A6830');r(X+6,3,1,18,BL);bx(X+6,7,1,10,'#8A5418');p(X+6,6,'#686878');p(X+5,7,BL);p(X+7,7,BL);}
    else if(cls===3){bx(X+10,4,1,26,RI);r(X+10,5,1,25,'#2C1808');r(X+7,1,7,6,OL);r(X+8,2,5,4,AC);r(X+9,2,3,4,RO);r(X+10,2,1,3,'#8CC8FF');p(X+10,3,'rgba(255,255,255,0.8)');r(X+9,13,3,1,BL);}
    else if(cls===4){bx(X+8,9,1,9,'#8E94A4');r(X+8,10,1,7,'#AEC0D0');bx(X+6,17,5,1,RI);bx(X+8,18,1,4,H);bx(X+9,16,1,8,'#8E94A4');r(X+9,17,1,6,'#AEC0D0');bx(X+7,23,5,1,RI);bx(X+9,24,1,3,H);}
    return cv;
  }

  // ── Player 類別 ──────────────────────────────────────────────────────────
  var MAX_HP = 200;

  function Player() {
    this.x = 0; this.z = 0;
    this.vx = 0; this.vz = 0;
    this.facing = 1;
    this.walk   = 0;
    this.speed  = 5.5;
    this.cls    = 0;

    // 基本資訊
    this.name    = '旅人';
    this.gold    = 0;

    // 基礎屬性（不含裝備）
    this.baseAtk   = 10;
    this.baseDef   = 5;
    this.baseMaxHp = MAX_HP;
    this.baseMaxMp = 100;

    // 裝備加成後的最終屬性（由 InventorySystem 更新）
    this.totalAtk  = 10;
    this.totalDef  = 5;

    // 戰鬥
    this.hp      = MAX_HP;
    this.maxHp   = MAX_HP;
    this.hurtT   = 0;
    this.dead    = false;
    this.respawnT = 0;

    // 魔力
    this.maxMp   = 100;
    this.mp      = 100;
    this.mpRegen = 8;    // 每秒回復

    // 渲染相關
    this.sprite     = null;
    this.character  = null;
    this._pixelTexs = [];
    this._charTexs  = null;
  }

  // 初始化備援像素風格（遊戲開始時立即呼叫）
  Player.prototype.initPixelFallback = function () {
    var self = this;
    this._pixelTexs = [0,1,2,3,4].map(function (cls) {
      var tex = PIXI.Texture.from(makePixelChar(cls));
      tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
      return tex;
    });
    var sp = new PIXI.Sprite(this._pixelTexs[this.cls]);
    sp.anchor.set(0.5, 1.0);
    sp.scale.set(CHAR_SC, CHAR_SC);
    this.sprite = sp;
  };

  // webp 材質載入完成後呼叫，切換成真實角色圖
  Player.prototype.initWebp = function (textures) {
    this._charTexs = textures;
    this._applyWebpClass(this.cls);
  };

  Player.prototype._applyWebpClass = function (cls) {
    if (!this._charTexs) return;
    var name = CLS_NAMES[cls];
    var CR   = G.CharacterRenderer;
    var ch   = CR.create(name, this._charTexs, 90);
    if (!ch) return; // 沒有對應材質，保留目前 sprite

    // 把舊 sprite 從父節點移除
    if (this.sprite && this.sprite.parent) this.sprite.parent.removeChild(this.sprite);

    this.character = ch;
    this.sprite    = ch.container;
    // 把新 container 加回 stage（由 main.js 負責插回正確層次）
    this.sprite._needsAddToStage = true;
  };

  Player.prototype.takeDamage = function (dmg) {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - dmg);
    this.hurtT = 0.30;
    if (this.hp <= 0) {
      this.dead    = true;
      this.respawnT = 4.0;
      G.Events.emit('playerDead', { player: this });
    }
  };

  Player.prototype.respawn = function () {
    var sp;
    if (G._citySystem) {
      sp = G._citySystem.getNearestRespawn(this.x, this.z);
    } else if (G.TownSystem && G._townSys) {
      sp = G.TownSystem.prototype.getSpawnPoint.call(G._townSys);
    } else {
      sp = { x:0, z:-18 };
    }
    this.hp    = this.maxHp;
    this.mp    = this.maxMp;
    this.dead  = false;
    this.x     = sp.x; this.z = sp.z;
    this.vx    = 0; this.vz = 0;
  };

  Player.prototype.update = function (dt, keys) {
    if (this.hurtT > 0) this.hurtT -= dt;

    if (this.dead) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn();
      return false;
    }

    // MP 自動回復
    this.mp = Math.min(this.maxMp, this.mp + this.mpRegen * dt);

    var ax = 0, az = 0, moving = false;
    if (keys['ArrowLeft']  || keys['a'] || keys['A']) { ax = -1; this.facing = -1; }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) { ax =  1; this.facing =  1; }
    if (keys['ArrowUp']    || keys['w'] || keys['W'])   az = -1;
    if (keys['ArrowDown']  || keys['s'] || keys['S'])   az =  1;
    if (ax || az) {
      var l = Math.sqrt(ax * ax + az * az);
      this.vx = ax / l * this.speed;
      this.vz = az / l * this.speed;
      this.walk += dt * 5;
      moving = true;
    }
    this.x  += this.vx * dt;
    this.z  += this.vz * dt;
    this.vx *= 0.78;
    this.vz *= 0.78;
    return moving;
  };

  Player.prototype.setClass = function (cls) {
    this.cls = ((cls % 5) + 5) % 5;
    if (this._charTexs) {
      this._applyWebpClass(this.cls);
    } else if (this._pixelTexs.length) {
      this.sprite.texture = this._pixelTexs[this.cls];
    }
  };

  // 設定動畫狀態（Character 模式下有效）
  Player.prototype.setAnimState = function (state) {
    if (this.character) this.character.setState(state);
  };

  Object.defineProperty(Player.prototype, 'className', {
    get: function () { return CLS_NAMES[this.cls]; }
  });

  G.Player        = Player;
  G.makePixelChar = makePixelChar;
})(window.Game = window.Game || {});
