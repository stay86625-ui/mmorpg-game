(function (G) {
  'use strict';

  var sn = G.Noise.sn;
  var BSC = 0.012;

  function getBiomeWeights(wx, wz) {
    var bx = wx*BSC, bz = wz*BSC;
    var tempN = sn(bx, bz)*0.5+0.5;
    var humN  = sn(bx+17.3, bz+5.7)*0.5+0.5;
    var magN  = sn(bx+31.1, bz+8.4)*0.5+0.5;
    var abN   = sn(bx*1.3+7.3, bz*1.3+22.1)*0.5+0.5;
    var bF = tempN*humN*(1-magN*0.5);
    var bG = Math.max(0, 1-Math.abs(tempN-0.5)*2)*(1-humN*0.5);
    var bS = Math.max(0, 1-tempN-0.2)*(1-abN*0.5);
    var bD = tempN*(1-humN)*(1-magN*0.5);
    var bV = magN*tempN*(1-humN*0.3);
    var bA = abN*(1-tempN)*magN;
    var tot = bF+bG+bS+bD+bV+bA || 1;
    return { F:bF/tot, G:bG/tot, S:bS/tot, D:bD/tot, V:bV/tot, A:bA/tot };
  }

  function getTreeDensity(wx, wz) {
    var w = getBiomeWeights(wx, wz);
    return w.F*12 + w.G*5 + w.S*7 + w.D*1.5 + w.V*0.5;
  }

  function getBiomeTint(wx, wz) {
    var w = getBiomeWeights(wx, wz);
    if (w.S > 0.3) return { r:0.84, g:0.90, b:0.97, w:Math.min(w.S, 0.88) };
    if (w.V > 0.3) return { r:0.22, g:0.08, b:0.04, w:Math.min(w.V, 0.88) };
    if (w.D > 0.3) return { r:0.62, g:0.40, b:0.08, w:Math.min(w.D, 0.80) };
    if (w.A > 0.3) return { r:0.28, g:0.05, b:0.40, w:Math.min(w.A, 0.82) };
    return { r:0.5, g:0.72, b:0.4, w:0 };
  }

  G.Biome = { getBiomeWeights:getBiomeWeights, getTreeDensity:getTreeDensity, getBiomeTint:getBiomeTint };
})(window.Game = window.Game || {});
