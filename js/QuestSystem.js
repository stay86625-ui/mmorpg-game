(function (G) {
  'use strict';

  function QuestSystem() {
    this._active    = {};  // questId → { quest, progress }
    this._completed = {};  // questId → true
    this._panel     = document.getElementById('quest-panel');
    this._listEl    = document.getElementById('quest-list');

    if (!this._panel) return;
    var self = this;
    document.getElementById('quest-close').addEventListener('click', function () { self.hidePanel(); });

    // 監聽怪物死亡事件
    G.Events.on('monsterDead', function (e) { self._onMonsterKill(e.monster); });
    // 監聽物品拾取事件
    G.Events.on('itemPickup', function (e)  { self._onItemPickup(e.itemId, e.qty); });
  }

  // ── 任務接受 ─────────────────────────────────────────────────────────────
  QuestSystem.prototype.accept = function (questId) {
    if (this._active[questId] || this._completed[questId]) return false;
    var q = G.QuestDatabase.get(questId);
    if (!q) return false;
    this._active[questId] = { quest: q, progress: 0 };
    this._showNotif('📋 接受任務：' + q.title);
    G.Events.emit('questAccepted', { questId: questId });
    this._render();
    return true;
  };

  // ── NPC 任務委託面板 ─────────────────────────────────────────────────────
  QuestSystem.prototype.offerQuest = function (questId, npcName) {
    var q   = G.QuestDatabase.get(questId);
    if (!q) return;
    var panel   = document.getElementById('quest-offer-panel');
    if (!panel) { this.accept(questId); return; }

    document.getElementById('qo-npc-name').textContent  = npcName || '';
    document.getElementById('qo-quest-title').textContent = q.title;
    document.getElementById('qo-quest-desc').textContent  = q.desc;
    var typeIcon = q.type === 'kill' ? '⚔' : '🎒';
    document.getElementById('qo-quest-target').textContent =
      typeIcon + ' ' + (q.type === 'kill' ? '目標：擊殺 ' : '目標：收集 ') +
      q.targetName + ' × ' + q.goal;
    var rewItems = (q.rewardItems || []).map(function (ri) {
      var d = G.ItemDatabase ? G.ItemDatabase.get(ri.id) : null;
      return (d ? d.icon + d.name : ri.id) + ' ×' + ri.qty;
    }).join('　');
    document.getElementById('qo-quest-reward').textContent =
      '獎勵：🪙 ' + q.rewardGold + '　EXP ' + q.rewardExp + (rewItems ? '　' + rewItems : '');

    var self = this;
    var acceptBtn  = document.getElementById('qo-accept');
    var declineBtn = document.getElementById('qo-decline');
    // 移除舊的監聽器（用 clone 替換）
    var newAccept  = acceptBtn.cloneNode(true);
    var newDecline = declineBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAccept, acceptBtn);
    declineBtn.parentNode.replaceChild(newDecline, declineBtn);

    newAccept.addEventListener('click', function () {
      self.accept(questId);
      panel.style.display = 'none';
      G._checkUiOpen();
    });
    newDecline.addEventListener('click', function () {
      panel.style.display = 'none';
      G._checkUiOpen();
    });

    panel.style.display = 'flex';
    G._uiOpen = true;
  };

  // ── 任務完成檢查 ────────────────────────────────────────────────────────
  QuestSystem.prototype._onMonsterKill = function (monster) {
    var self = this;
    Object.keys(this._active).forEach(function (qid) {
      var entry = self._active[qid];
      var q     = entry.quest;
      if (q.type !== 'kill' || q.target !== monster.type.id) return;
      entry.progress++;
      if (entry.progress >= q.goal) self._complete(qid);
      else self._render();
    });
  };

  QuestSystem.prototype._onItemPickup = function (itemId, qty) {
    var self = this;
    Object.keys(this._active).forEach(function (qid) {
      var entry = self._active[qid];
      var q     = entry.quest;
      if (q.type !== 'collect' || q.target !== itemId) return;
      entry.progress = Math.min(q.goal, entry.progress + (qty || 1));
      if (entry.progress >= q.goal) self._complete(qid);
      else self._render();
    });
  };

  QuestSystem.prototype._complete = function (questId) {
    var entry = this._active[questId];
    if (!entry) return;
    var q     = entry.quest;
    delete this._active[questId];
    this._completed[questId] = true;

    // 發放獎勵
    var inv = G.inventory;
    if (inv) {
      inv.gold += q.rewardGold || 0;
      inv._renderGold();
      (q.rewardItems || []).forEach(function (ri) { inv.addItem(ri.id, ri.qty); });
    }
    if (G._levelSys && G._player) {
      G._levelSys.addExp(q.rewardExp || 0, G._player);
    }

    this._showNotif('✅ 任務完成：' + q.title + '　+🪙 ' + q.rewardGold + '  +EXP ' + q.rewardExp);
    G.Events.emit('questComplete', { questId: questId, quest: q });
    this._render();

    // 提示玩家去找 NPC 接取下一個任務
    if (q.next) {
      var nextQ = G.QuestDatabase.get(q.next);
      if (nextQ) {
        setTimeout(function () {
          G.Events.emit('showNotif', {
            msg:'🆕 新任務已解鎖：「' + nextQ.title + '」 請尋找 NPC 接取',
            clr:'#FFD700', duration:5000,
          });
        }, 2000);
      }
    }
  };

  // ── 任務進度查詢 ─────────────────────────────────────────────────────────
  QuestSystem.prototype.getKillProgress = function (monsterTypeId) {
    var entry = null;
    var self = this;
    Object.keys(this._active).forEach(function (qid) {
      var e = self._active[qid];
      if (e.quest.type === 'kill' && e.quest.target === monsterTypeId) entry = e;
    });
    return entry ? { progress: entry.progress, goal: entry.quest.goal } : null;
  };

  // ── 面板 ─────────────────────────────────────────────────────────────────
  QuestSystem.prototype.showPanel = function () {
    this._render();
    if (this._panel) this._panel.classList.add('open');
    G._uiOpen = true;
  };

  QuestSystem.prototype.hidePanel = function () {
    if (this._panel) this._panel.classList.remove('open');
    G._checkUiOpen();
  };

  QuestSystem.prototype.togglePanel = function () {
    if (this._panel && this._panel.classList.contains('open')) this.hidePanel();
    else this.showPanel();
  };

  QuestSystem.prototype._render = function () {
    if (!this._listEl) return;
    var self   = this;
    var keys   = Object.keys(this._active);
    if (keys.length === 0) {
      this._listEl.innerHTML = '<div style="opacity:.5;text-align:center;padding:20px">目前沒有進行中的任務<br>找村長或 NPC 接取任務！</div>';
      return;
    }
    this._listEl.innerHTML = keys.map(function (qid) {
      var e    = self._active[qid];
      var q    = e.quest;
      var pct  = Math.min(100, Math.round(e.progress / q.goal * 100));
      var typeIcon = q.type === 'kill' ? '⚔' : '🎒';
      return '<div class="quest-item">' +
        '<div class="quest-title">' + typeIcon + ' ' + q.title + '</div>' +
        '<div class="quest-desc">' + q.desc + '</div>' +
        '<div class="quest-prog-row">' +
          '<span>' + (q.type === 'kill' ? '擊殺' : '收集') + ' ' + q.targetName + '：' + e.progress + ' / ' + q.goal + '</span>' +
        '</div>' +
        '<div class="quest-bar-bg"><div class="quest-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="quest-reward">獎勵：🪙 ' + q.rewardGold + ' ｜ EXP ' + q.rewardExp +
          (q.rewardItems ? ' ｜ ' + q.rewardItems.map(function(r){ var d=G.ItemDatabase.get(r.id); return (d?d.icon+d.name:'?')+'×'+r.qty; }).join(' ') : '') +
        '</div>' +
      '</div>';
    }).join('');
  };

  // ── 通知 ─────────────────────────────────────────────────────────────────
  QuestSystem.prototype._showNotif = function (msg) {
    var el = document.getElementById('quest-notif');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(this._notifTimer);
    var self = this;
    this._notifTimer = setTimeout(function () { el.style.display = 'none'; }, 4000);
  };

  // ── 存檔 / 讀檔 ─────────────────────────────────────────────────────────
  QuestSystem.prototype.serialize = function () {
    var activeData = {};
    var self = this;
    Object.keys(this._active).forEach(function (qid) {
      activeData[qid] = self._active[qid].progress;
    });
    return { active: activeData, completed: this._completed };
  };

  QuestSystem.prototype.deserialize = function (data) {
    if (!data) return;
    var self = this;
    this._completed = data.completed || {};
    this._active = {};
    Object.keys(data.active || {}).forEach(function (qid) {
      var q = G.QuestDatabase.get(qid);
      if (!q) return;
      self._active[qid] = { quest: q, progress: data.active[qid] };
    });
    this._render();
  };

  G.QuestSystem = QuestSystem;
})(window.Game = window.Game || {});
