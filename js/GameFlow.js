(function (G) {
  'use strict';

  // ── 職業設定 ─────────────────────────────────────────────────────────────
  var CLASSES = [
    {
      id: 0, name: '法師', icon: '🔮', role: '魔法輸出',
      desc: '精通元素魔法的智慧者，能召喚強大法術遠程打擊敵人。魔法攻擊極強，但防禦薄弱，需保持距離作戰。',
      stats: { atk: 4, def: 1, spd: 3, mag: 5 },
    },
    {
      id: 1, name: '劍士', icon: '⚔', role: '近戰戰士',
      desc: '精通劍術的前線英雄，攻守均衡，能在戰場最前線屹立不倒，是隊伍的鋼鐵支柱。',
      stats: { atk: 4, def: 4, spd: 3, mag: 1 },
    },
    {
      id: 2, name: '弓手', icon: '🏹', role: '遠程敏捷',
      desc: '敏捷的遠程射手，能精準命中遠距目標，移動速度快，擅長游擊戰術，讓敵人難以靠近。',
      stats: { atk: 4, def: 2, spd: 5, mag: 2 },
    },
    {
      id: 3, name: '伊格', icon: '⚡', role: '特殊全能',
      desc: '謎樣的神秘存在，融合了魔法與武藝，擁有獨特天賦，能適應各種戰況，充滿未知可能。',
      stats: { atk: 3, def: 3, spd: 4, mag: 4 },
    },
    {
      id: 4, name: '刺客', icon: '🗡', role: '爆發刺殺',
      desc: '潛行於陰影中的殺手，出其不意，爆發傷害極高。速度最快，一擊斃命，但需精準把握時機。',
      stats: { atk: 5, def: 2, spd: 5, mag: 1 },
    },
  ];

  // ── GameFlow 類別 ─────────────────────────────────────────────────────────
  function GameFlow(hasSave, onStart) {
    this._sel     = 0;
    this._cb      = onStart;
    this._hasSave = hasSave;

    // DOM refs
    this._screens   = document.getElementById('screens');
    this._scrTitle  = document.getElementById('scr-title');
    this._scrCreate = document.getElementById('scr-create');
    this._clsList   = document.getElementById('cls-list');
    this._detailNm  = document.getElementById('cls-detail-name');
    this._detailDsc = document.getElementById('cls-detail-desc');
    this._statsRow  = document.getElementById('stats-row');
    this._cvChar    = document.getElementById('cv-char');
    this._inpName   = document.getElementById('inp-name');
    this._btnEnter  = document.getElementById('btn-enter');

    this._buildClassCards();
    this._selectClass(0);
    this._bindEvents();
  }

  // ── 建立職業卡片 ──────────────────────────────────────────────────────────
  GameFlow.prototype._buildClassCards = function () {
    var self = this;
    this._clsList.innerHTML = '';
    CLASSES.forEach(function (cls) {
      var div = document.createElement('div');
      div.className = 'cls-card';
      div.dataset.id = cls.id;
      div.innerHTML =
        '<span class="cls-icon">' + cls.icon + '</span>' +
        '<div>' +
          '<div class="cls-nm">' + cls.name + '</div>' +
          '<div class="cls-role">' + cls.role + '</div>' +
        '</div>';
      div.addEventListener('click', function () { self._selectClass(cls.id); });
      self._clsList.appendChild(div);
    });
  };

  // ── 選取職業 ──────────────────────────────────────────────────────────────
  GameFlow.prototype._selectClass = function (id) {
    this._sel = id;
    var cls = CLASSES[id];

    // 更新卡片高亮
    var cards = this._clsList.querySelectorAll('.cls-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle('sel', parseInt(cards[i].dataset.id) === id);
    }

    // 說明文字
    this._detailNm.textContent  = cls.icon + '  ' + cls.name;
    this._detailDsc.textContent = cls.desc;

    // 屬性條
    var s = cls.stats;
    this._statsRow.innerHTML =
      this._mkStat('ATK', 'atk', s.atk) +
      this._mkStat('DEF', 'def', s.def) +
      this._mkStat('SPD', 'spd', s.spd) +
      this._mkStat('MAG', 'mag', s.mag);

    // 角色預覽
    this._drawPreview(id);
  };

  GameFlow.prototype._mkStat = function (label, type, val) {
    var w = (val / 5 * 100).toFixed(0);
    return '<div class="st">' +
      '<div class="st-lbl">' + label + '</div>' +
      '<div class="st-bar"><div class="st-fill st-' + type + '" style="width:' + w + '%"></div></div>' +
    '</div>';
  };

  // ── 角色預覽（優先顯示 webp 設計圖，fallback 像素） ─────────────────────
  GameFlow.prototype._drawPreview = function (clsId) {
    var cv  = this._cvChar;
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);

    // 嘗試載入 webp 設計圖
    var clsName = G.CLS_NAMES && G.CLS_NAMES[clsId];
    if (clsName) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        ctx.clearRect(0, 0, cv.width, cv.height);
        // Canvas 綠幕去背
        var tmp = document.createElement('canvas');
        tmp.width = img.naturalWidth; tmp.height = img.naturalHeight;
        var tc  = tmp.getContext('2d');
        tc.drawImage(img, 0, 0);
        var d = tc.getImageData(0, 0, tmp.width, tmp.height), px = d.data;
        for (var i = 0; i < px.length; i += 4) {
          var r = px[i]/255, g = px[i+1]/255, b = px[i+2]/255;
          var ge = g - Math.max(r, b) * 0.85;
          var t  = ge < 0.20 ? 0 : ge > 0.48 ? 1 : (ge - 0.20) / 0.28;
          px[i+3] = Math.round(px[i+3] * (1 - t));
        }
        tc.putImageData(d, 0, 0);
        // 裁切 body 區域（設計圖左側站姿）
        var sx = Math.round(0.04 * tmp.width),  sy = Math.round(0.07 * tmp.height);
        var sw = Math.round(0.42 * tmp.width),  sh = Math.round(0.84 * tmp.height);
        var margin = 8;
        var sc = Math.min((cv.width - margin*2) / sw, (cv.height - margin*2) / sh);
        var ox = (cv.width  - sw * sc) / 2;
        var oy = (cv.height - sh * sc) / 2;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(tmp, sx, sy, sw, sh, ox, oy, sw * sc, sh * sc);
      };
      img.onerror = function () { _pixelFallback(); };
      img.src = 'assets/characters/' + clsName + '.webp';
      return;
    }

    function _pixelFallback() {
      if (!G.makePixelChar) return;
      var src = G.makePixelChar(clsId);
      var margin = 10;
      var sc = Math.min((cv.width - margin*2) / src.width, (cv.height - margin*2) / src.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, (cv.width - src.width*sc)/2, (cv.height - src.height*sc)/2, src.width*sc, src.height*sc);
    }
    _pixelFallback();
  };

  // ── 事件繫結 ──────────────────────────────────────────────────────────────
  GameFlow.prototype._bindEvents = function () {
    var self = this;

    // 繼續遊戲按鈕可見性
    var btnCont = document.getElementById('btn-continue');
    if (this._hasSave) btnCont.style.display = 'inline-block';

    // ── 標題畫面 ──
    document.getElementById('btn-new-game').addEventListener('click', function () {
      self._show(self._scrCreate);
    });
    btnCont.addEventListener('click', function () {
      self._launch(null, -1, false);   // 繼續：不改名字/職業
    });

    // ── 創建畫面 ──
    document.getElementById('btn-back').addEventListener('click', function () {
      self._show(self._scrTitle);
    });

    // 名稱輸入 → 啟用進入按鈕
    this._inpName.addEventListener('input', function () {
      self._btnEnter.disabled = self._inpName.value.trim().length === 0;
    });
    this._inpName.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !self._btnEnter.disabled) self._enter();
    });
    this._btnEnter.addEventListener('click', function () { self._enter(); });

    // Enter 鍵在標題畫面→跳到創建
    window.addEventListener('keydown', function (e) {
      if (!self._scrTitle.classList.contains('active')) return;
      if (e.key === 'Enter') self._show(self._scrCreate);
    });
  };

  GameFlow.prototype._enter = function () {
    var name = this._inpName.value.trim();
    if (!name) return;
    this._launch(name, this._sel, true);
  };

  // ── 切換畫面 ──────────────────────────────────────────────────────────────
  GameFlow.prototype._show = function (target) {
    var all = [this._scrTitle, this._scrCreate];
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    target.classList.add('active');
    // 創建畫面：清空名稱輸入、重新繪製預覽
    if (target === this._scrCreate) {
      this._inpName.value = '';
      this._btnEnter.disabled = true;
      this._selectClass(this._sel);
      setTimeout(function () { document.getElementById('inp-name').focus(); }, 120);
    }
  };

  // ── 啟動遊戲 ──────────────────────────────────────────────────────────────
  GameFlow.prototype._launch = function (name, cls, isNew) {
    var self = this;
    this._screens.classList.add('fade-out');
    setTimeout(function () { self._screens.style.display = 'none'; }, 900);
    if (this._cb) this._cb({ name: name, cls: cls, isNew: isNew });
  };

  G.GameFlow = GameFlow;
  G.GAME_CLASSES = CLASSES;
})(window.Game = window.Game || {});
