(function (G) {
  'use strict';

  var KEY = 'ew_save_v1';

  function SaveSystem() {}

  SaveSystem.prototype.save = function (data) {
    try {
      var payload = JSON.stringify(Object.assign({}, data, { ts: Date.now() }));
      localStorage.setItem(KEY, payload);
      return true;
    } catch(e) {
      G.Events.emit('showNotif', { msg: '⚠ 存檔失敗！請清理瀏覽器儲存空間', clr: '#FF4444', duration: 5000 });
      return false;
    }
  };

  SaveSystem.prototype.load = function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch(e) { return null; }
  };

  SaveSystem.prototype.clear = function () {
    try { localStorage.removeItem(KEY); } catch(e) {}
  };

  // 定時自動存檔（每 30 秒）
  SaveSystem.prototype.startAutoSave = function (getDataFn) {
    var self = this;
    setInterval(function () { self.save(getDataFn()); }, 30000);
  };

  G.SaveSystem = SaveSystem;
})(window.Game = window.Game || {});
