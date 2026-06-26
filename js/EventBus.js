(function (G) {
  'use strict';
  var _ev = {};
  G.Events = {
    on:   function (e, f) { (_ev[e] = _ev[e] || []).push(f); },
    off:  function (e, f) { if (_ev[e]) _ev[e] = _ev[e].filter(function (x) { return x !== f; }); },
    emit: function (e, d) { (_ev[e] || []).slice().forEach(function (f) { try { f(d); } catch(ex) {} }); },
    once: function (e, f) { var w = function (d) { G.Events.off(e, w); f(d); }; G.Events.on(e, w); },
    clear: function (e)   { if (e) delete _ev[e]; else _ev = {}; },
  };
})(window.Game = window.Game || {});
