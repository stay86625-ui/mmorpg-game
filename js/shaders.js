(function (G) {
  'use strict';

  var W = G.W, H = G.H, SCALE = G.SCALE, ISO_Z = G.ISO_Z;
  var _IX = (W / SCALE).toFixed(3);
  var _IZ = (H / (SCALE * ISO_Z)).toFixed(3);

  var PHASE = 'uniform float uDy,uDw,uSs;\n' +
    'float gDy(float d){return uDy;}float gDw(float d){return uDw;}float gSs(float d){return uSs;}';

  var GN = '\nvec3 _pm(vec3 x){return mod((x*34.+1.)*x,289.);}\n' +
    'float sn(vec2 v){\n' +
    '  vec4 C=vec4(.211324865,.366025404,-.577350269,.024390244);\n' +
    '  vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx);\n' +
    '  vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);\n' +
    '  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);\n' +
    '  vec3 p=_pm(_pm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));\n' +
    '  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);\n' +
    '  m=m*m*m*m;vec3 x2=2.*fract(p*C.www)-1.,h=abs(x2)-.5;\n' +
    '  vec3 a0=x2-floor(x2+.5);m*=1.79284291-.85373472*(a0*a0+h*h);\n' +
    '  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;\n' +
    '  return 130.*dot(m,g);}\n' +
    'float fbm2(vec2 p){float v=0.,a=.5;for(int i=0;i<2;i++){v+=a*sn(p);p*=2.;a*=.5;}return v*.571;}\n' +
    'float fbm3(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*sn(p);p*=2.;a*=.5;}return v*.762;}\n' +
    'float fbm4(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*sn(p);p*=2.;a*=.5;}return v*.842;}';

  var UQ = 'attribute vec2 aPos;attribute vec2 aUv;uniform mat3 projectionMatrix;varying vec2 vU;\n' +
    'void main(){gl_Position=vec4((projectionMatrix*vec3(aPos,1.)).xy,0.,1.);vU=aUv;}';

  var BV = 'attribute vec2 aPos;attribute vec2 aUv;uniform mat3 projectionMatrix;\n' +
    'uniform float uSX,uSY,uSW,uSH;varying vec2 vU;\n' +
    'void main(){vec2 p=vec2(aPos.x*uSW+uSX,aPos.y*uSH+uSY);\n' +
    'gl_Position=vec4((projectionMatrix*vec3(p,1.)).xy,0.,1.);vU=aUv;}';

  var GND_F = [
    'precision highp float;',
    'varying vec2 vU;uniform float uDT,uT,uCX,uCZ;',
    PHASE, GN,
    'void main(){',
    '  float wx=uCX+(vU.x-.5)*' + _IX + ';float wz=uCZ+(vU.y-.5)*' + _IZ + ';',
    '  vec2 wp=vec2(wx,wz)*.28;',
    '  float n0=fbm3(wp)*.5+.5,n1=fbm2(wp*2.2+vec2(3.1,1.7))*.5+.5,n2=fbm4(wp*4.5+vec2(1.4,2.9))*.5+.5;',
    '  float bsc=0.012;vec2 bpt=vec2(wx,wz)*bsc;',
    '  float tempN=sn(bpt)*.5+.5;',
    '  float humN=sn(bpt+vec2(17.3,5.7))*.5+.5;',
    '  float magN=sn(bpt+vec2(31.1,8.4))*.5+.5;',
    '  float abN=sn(bpt*1.3+vec2(7.3,22.1))*.5+.5;',
    '  float bF=tempN*humN*(1.-magN*.5);',
    '  float bG=max(0.,1.-abs(tempN-.5)*2.)*(1.-humN*.5);',
    '  float bS=max(0.,(1.-tempN-.2))*(1.-abN*.5);',
    '  float bD=tempN*(1.-humN)*(1.-magN*.5);',
    '  float bV=magN*tempN*(1.-humN*.3);',
    '  float bA=abN*(1.-tempN)*magN;',
    '  float tot=bF+bG+bS+bD+bV+bA;if(tot<.01){bG=1.;tot=1.;}',
    '  bF/=tot;bG/=tot;bS/=tot;bD/=tot;bV/=tot;bA/=tot;',
    '  vec3 col=',
    '    mix(vec3(.042,.132,.018),vec3(.085,.248,.038),n0)*bF',
    '   +mix(vec3(.108,.168,.042),vec3(.168,.248,.078),n0)*bG',
    '   +mix(vec3(.74,.82,.92),vec3(.90,.95,1.00),n1)*bS',
    '   +mix(vec3(.66,.44,.14),vec3(.80,.60,.22),n1)*bD',
    '   +mix(vec3(.20,.04,.01),vec3(.38,.10,.02),n0)*bV',
    '   +mix(vec3(.08,.02,.16),vec3(.14,.04,.26),n0)*bA;',
    '  float rock=clamp((fbm2(wp*3.2+vec2(8.,2.))-.80)/.14,0.,1.);',
    '  col=mix(col,mix(vec3(.09,.08,.07),vec3(.17,.15,.13),n1),(bF+bG)*.22*rock);',
    '  col=mix(col,mix(vec3(.72,.62,.08),vec3(.82,.80,.80),n2),',
    '    clamp((sn(wp*14.+vec2(1.5,3.8))-.88)/.08,0.,1.)*.50*(bF+bG*.5)*gDy(uDT));',
    '  col=mix(col,vec3(.95,.30,.02),clamp((sn(wp*5.+vec2(3.,1.))-.60)/.22,0.,1.)*bV*.75);',
    '  col=mix(col,vec3(.62,.74,.92),clamp((fbm2(wp*6.+vec2(4.,5.))-.68)/.18,0.,1.)*bS*.38);',
    '  col=mix(col,vec3(.55,.08,.80),clamp((sn(wp*8.+vec2(2.,5.))-.72)/.15,0.,1.)*bA*.6);',
    '  col*=mix(.78,1.,vU.y);',
    '  col*=mix(.32,1.,gDy(uDT)*.70+.30);',
    '  col+=(vec3(.10,.14,.20)*bF+vec3(.08,.10,.16)*bG+vec3(.10,.12,.24)*bS',
    '       +vec3(.14,.07,.03)*bV+vec3(.12,.06,.28)*bA+vec3(.10,.12,.16)*bD)*(1.-gDy(uDT));',
    '  gl_FragColor=vec4(col,1.);}',
  ].join('\n');

  var TREE_F = [
    'precision highp float;',
    'varying vec2 vU;uniform float uDT,uT,uTy,uWind,uBW,uBTR,uBTG,uBTB;',
    PHASE, GN,
    'void main(){',
    '  float x=vU.x*2.-1.,y=1.-vU.y;',
    '  float tw=.10+.04*uTy,trH=.36+.04*uTy;',
    '  float trunkA=clamp(1.-abs(x)/tw,0.,1.)*clamp(1.-(y-trH)/.05,0.,1.)*step(.002,y);trunkA=trunkA*trunkA;',
    '  float bk=fbm2(vec2(x*8.,y*12.+uTy*4.))*.5+.5;',
    '  vec3 barkC=mix(vec3(.14,.085,.035),vec3(.25,.140,.062),bk);',
    '  float wx2=sin(uT*.70+uTy*3.14)*max(0.,y-.28)*uWind*.024;',
    '  vec2 lc=vec2(x+wx2,y-.58);float lv=0.;',
    '  lv+=clamp(1.-length(lc-vec2(.00,.05))/.36,0.,1.);',
    '  lv+=clamp(1.-length(lc-vec2(.18,-.05))/.26,0.,1.);',
    '  lv+=clamp(1.-length(lc-vec2(-.18,-.05))/.26,0.,1.);',
    '  lv+=clamp(1.-length(lc-vec2(.12,.17))/.23,0.,1.);',
    '  lv+=clamp(1.-length(lc-vec2(-.12,.17))/.23,0.,1.);',
    '  float t=clamp((clamp(lv*.75,0.,1.)-.32)/.40,0.,1.);lv=t*t*(3.-2.*t);',
    '  float al=max(trunkA,lv);if(al<.015)discard;',
    '  float ln=fbm3(vec2(vU.x*3.5+uT*.06+uTy,y*4.2))*.5+.5;',
    '  vec3 leafC=mix(vec3(.044,.152,.018),vec3(.080,.272,.034),ln);',
    '  leafC=mix(leafC,mix(vec3(.24,.14,.016),vec3(.28,.09,.006),ln),clamp((uDT-.62)/.20,0.,1.)*.68);',
    '  vec3 bt=vec3(uBTR,uBTG,uBTB);leafC=mix(leafC,bt,uBW);barkC=mix(barkC,bt*.55,uBW*.40);',
    '  float litV=clamp((y-.60)/.32,-1.,1.),litH=clamp(x*.40+.55,0.,1.);',
    '  leafC*=mix(.82,1.06,litV*.4+.6)*(1.-gDy(uDT))+mix(.52,1.48,litV*.5+.5)*mix(.90,1.10,litH)*gDy(uDT);',
    '  leafC*=mix(1.,.45,clamp((-lc.y+.02)/.16,0.,1.)*.75);',
    '  barkC*=mix(.45,1.35,clamp(x/max(tw,.01)*.55+.58,0.,1.));',
    '  leafC*=mix(.30,1.,gDy(uDT)*.68+.32);leafC+=vec3(.08,.14,.10)*(1.-gDy(uDT))*lv;',
    '  barkC*=mix(.28,1.,gDy(uDT)*.68+.32);barkC+=vec3(.05,.07,.11)*(1.-gDy(uDT));',
    '  gl_FragColor=vec4(mix(leafC,barkC,clamp(trunkA/max(al,.001),0.,1.)),al*.96);}',
  ].join('\n');

  var SHADOW_F = [
    'precision mediump float;varying vec2 vU;uniform float uDy;',
    'void main(){vec2 p=vU*2.-1.;float r=length(p);float sh=clamp(1.-r*1.06,0.,1.);sh=sh*sh*sh;',
    'gl_FragColor=vec4(.00,.01,.00,sh*(.08+.38*uDy));}',
  ].join('\n');

  var AMB_F = [
    'precision mediump float;varying vec2 vU;uniform float uDT;', PHASE,
    'void main(){float nt=1.-gDy(uDT);vec3 tint=vec3(.04,.06,.14)*nt;',
    'tint=mix(tint,vec3(.12,.06,.01),(gDw(uDT)+gSs(uDT))*.18);gl_FragColor=vec4(tint,nt*.07);}',
  ].join('\n');

  function makeQuadG(x, y, w, h) {
    var g = new PIXI.Geometry();
    g.addAttribute('aPos', new PIXI.Buffer(new Float32Array([x,y, x+w,y, x+w,y+h, x,y+h])), 2);
    g.addAttribute('aUv',  new PIXI.Buffer(new Float32Array([0,0, 1,0, 1,1, 0,1])), 2);
    g.addIndex([0,1,2,0,2,3]);
    return g;
  }

  var BILL_G = (function() {
    var g = new PIXI.Geometry();
    g.addAttribute('aPos', new PIXI.Buffer(new Float32Array([-.5,-1, .5,-1, .5,0, -.5,0])), 2);
    g.addAttribute('aUv',  new PIXI.Buffer(new Float32Array([0,0, 1,0, 1,1, 0,1])), 2);
    g.addIndex([0,1,2,0,2,3]);
    return g;
  })();

  var SH_G = (function() {
    var g = new PIXI.Geometry();
    g.addAttribute('aPos', new PIXI.Buffer(new Float32Array([-.5,-.5, .5,-.5, .5,.5, -.5,.5])), 2);
    g.addAttribute('aUv',  new PIXI.Buffer(new Float32Array([0,0, 1,0, 1,1, 0,1])), 2);
    g.addIndex([0,1,2,0,2,3]);
    return g;
  })();

  var ROCK_F = [
    'precision mediump float;varying vec2 vU;',
    'uniform float uTy,uBW,uBTR,uBTG,uBTB;',
    PHASE,
    'void main(){',
    '  vec2 p=vU*2.-1.;',
    '  float r=length(vec2(p.x*.80,p.y*1.15+.18));',
    '  float al=clamp((.68-r)/.06,0.,1.);if(al<.01)discard;',
    '  float nx=fract(sin(uTy*127.1+p.x*81.3+p.y*63.7)*4375.5);',
    '  float ny=fract(sin(uTy*311.7+p.x*37.9+p.y*92.1)*2837.1);',
    '  vec3 col=mix(vec3(.26,.20,.14),vec3(.48,.40,.28),nx*.6+ny*.4);',
    '  col=mix(col,vec3(uBTR,uBTG,uBTB)*.60,uBW*.40);',
    '  float lit=clamp(.72-p.x*.22-p.y*.38,.22,1.);',
    '  col*=mix(.28,1.,gDy(0.)*.70+.30)*lit;',
    '  gl_FragColor=vec4(col,al*.97);',
    '}',
  ].join('\n');

  var BUSH_F = [
    'precision mediump float;varying vec2 vU;',
    'uniform float uT,uTy,uWind,uBW,uBTR,uBTG,uBTB;',
    PHASE,
    'void main(){',
    '  float x=vU.x*2.-1.,y=1.-vU.y;',
    '  float sw=sin(uT*2.4+uTy*3.14)*max(0.,y-.15)*uWind*.028;',
    '  float px=x+sw;',
    '  float g=0.;',
    '  g+=clamp(1.-length(vec2(px*.9,y-.54))/.40,0.,1.);',
    '  g+=clamp(1.-length(vec2((px-.26)*.9,y-.42))/.28,0.,1.);',
    '  g+=clamp(1.-length(vec2((px+.26)*.9,y-.42))/.28,0.,1.);',
    '  float t=clamp((clamp(g*.8,0.,1.)-.24)/.36,0.,1.);g=t*t*(3.-2.*t);',
    '  if(g<.04)discard;',
    '  vec3 col=mix(vec3(.06,.20,.03),vec3(.16,.38,.07),y+sw*.3);',
    '  col=mix(col,vec3(uBTR,uBTG,uBTB),uBW*.75);',
    '  col*=mix(.28,1.,gDy(0.)*.68+.32);',
    '  col+=vec3(.04,.08,.05)*(1.-gDy(0.))*g;',
    '  gl_FragColor=vec4(col,g*.90);',
    '}',
  ].join('\n');

  G.Shaders = { UQ:UQ, BV:BV, GND_F:GND_F, TREE_F:TREE_F, ROCK_F:ROCK_F, BUSH_F:BUSH_F,
                SHADOW_F:SHADOW_F, AMB_F:AMB_F,
                makeQuadG:makeQuadG, BILL_G:BILL_G, SH_G:SH_G };
})(window.Game = window.Game || {});
