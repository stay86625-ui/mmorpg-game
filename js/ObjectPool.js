(function (G) {
  'use strict';

  function ObjectPool(factory, initialSize) {
    this.factory   = factory;
    this.available = [];
    for (var i = 0; i < (initialSize || 0); i++) this.available.push(factory());
  }
  ObjectPool.prototype.acquire = function() {
    return this.available.length > 0 ? this.available.pop() : this.factory();
  };
  ObjectPool.prototype.release = function(obj) {
    this.available.push(obj);
  };
  Object.defineProperty(ObjectPool.prototype, 'size', {
    get: function() { return this.available.length; }
  });

  G.ObjectPool = ObjectPool;
})(window.Game = window.Game || {});
