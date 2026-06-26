(function (G) {
  'use strict';

  function glslMod(a, b) { return a - b * Math.floor(a / b); }
  function fract(v)      { return v - Math.floor(v); }
  function pm(v)         { return glslMod((v * 34 + 1) * v, 289); }

  function sn(vx, vy) {
    var C0=0.211324865, C1=0.366025404, C2=-0.577350269, C3=0.024390244;
    var s = (vx + vy) * C1;
    var ix = Math.floor(vx + s), iy = Math.floor(vy + s);
    var t  = (ix + iy) * C0;
    var x0x = vx - ix + t, x0y = vy - iy + t;
    var i1x = x0x > x0y ? 1 : 0, i1y = x0x > x0y ? 0 : 1;
    var x12 = [x0x+C0-i1x, x0y+C0-i1y, x0x+C2, x0y+C2];
    var iix = glslMod(ix, 289), iiy = glslMod(iy, 289);
    var p = [
      pm(pm(iiy)       + iix),
      pm(pm(iiy + i1y) + iix + i1x),
      pm(pm(iiy + 1)   + iix + 1),
    ];
    var m = [
      Math.max(0, 0.5 - x0x*x0x - x0y*x0y),
      Math.max(0, 0.5 - x12[0]*x12[0] - x12[1]*x12[1]),
      Math.max(0, 0.5 - x12[2]*x12[2] - x12[3]*x12[3]),
    ];
    m = m.map(function(v){ return v*v*v*v; });
    var x2 = p.map(function(v){ return 2*fract(v*C3)-1; });
    var h  = x2.map(function(v){ return Math.abs(v)-0.5; });
    var a0 = x2.map(function(v){ return v-Math.floor(v+0.5); });
    m = m.map(function(v,i){ return v*(1.79284291-0.85373472*(a0[i]*a0[i]+h[i]*h[i])); });
    return 130*(m[0]*(a0[0]*x0x+h[0]*x0y)+m[1]*(a0[1]*x12[0]+h[1]*x12[1])+m[2]*(a0[2]*x12[2]+h[2]*x12[3]));
  }

  function fbm2(x,y){ var v=0,a=0.5; for(var i=0;i<2;i++){v+=a*sn(x,y);x*=2;y*=2;a*=0.5;} return v*0.571; }
  function fbm3(x,y){ var v=0,a=0.5; for(var i=0;i<3;i++){v+=a*sn(x,y);x*=2;y*=2;a*=0.5;} return v*0.762; }
  function fbm4(x,y){ var v=0,a=0.5; for(var i=0;i<4;i++){v+=a*sn(x,y);x*=2;y*=2;a*=0.5;} return v*0.842; }

  function seededRNG(seed) {
    var s = ((seed ^ 2747636419) >>> 0);
    return function() {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17; s >>>= 0;
      s ^= s << 5;  s >>>= 0;
      return s / 0x100000000;
    };
  }

  G.Noise = { sn: sn, fbm2: fbm2, fbm3: fbm3, fbm4: fbm4, seededRNG: seededRNG };
})(window.Game = window.Game || {});
