(function (G) {
  'use strict';

  var W=G.W, H=G.H, SCALE=G.SCALE, ISO_Z=G.ISO_Z, CHAR_SC=G.CHAR_SC, DAY_DUR=G.DAY_DUR;
  var Shaders = G.Shaders;
  var ANIM_STATE;

  // ── PIXI app ────────────────────────────────────────────────────────────────
  var app = new PIXI.Application({
    width: W, height: H, backgroundColor: 0x020408,
    antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true,
  });
  document.body.appendChild(app.view);
  app.view.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh';

  // ── Day/night ─────────────────────────────────────────────────────────────
  function jsDy(d){ var t=Math.max(0,Math.min(1,(1-Math.abs(d-.5)*2-.45)/.37)); return t*t*(3-2*t); }
  function jsP(d,lo,sz){ var t=Math.max(0,Math.min(1,(d-lo)/sz)); return t*t*(3-2*t); }

  // ── Stage ─────────────────────────────────────────────────────────────────
  var stage = app.stage;

  var gndSh = PIXI.Shader.from(Shaders.UQ, Shaders.GND_F,
    { uDT:0, uT:0, uCX:0, uCZ:0, uDy:0, uDw:0, uSs:0 });
  stage.addChild(new PIXI.Mesh(Shaders.makeQuadG(0,0,W,H), gndSh));

  var worldManager = new G.WorldManager(stage);
  var spawnManager = new G.SpawnManager();
  var monsterMgr   = new G.MonsterManager(stage);
  var gatherSys    = new G.GatherSystem(stage);
  var effectMgr    = new G.EffectManager(stage);
  var dropMgr      = new G.DropManager(stage);
  var npcMgr       = new G.NPCManager(stage);
  var townSys      = new G.TownSystem(stage);
  var citySys      = new G.CitySystem(stage);
  var worldEvtSys  = new G.WorldEventSystem(stage);
  G._townSys       = townSys;
  G._citySystem    = citySys;

  var plShadowSh = PIXI.Shader.from(Shaders.BV, Shaders.SHADOW_F,
    { uDy:0, uSX:W/2, uSY:H/2, uSW:CHAR_SC*20, uSH:CHAR_SC*20*ISO_Z*0.35 });
  stage.addChild(new PIXI.Mesh(Shaders.SH_G, plShadowSh));
  var plShadowMesh = stage.children[stage.children.length-1];

  var player = new G.Player();
  G._player  = player;
  player.initPixelFallback();
  player.sprite.position.set(W/2, H/2);
  stage.addChild(player.sprite);

  worldManager.addNearContainer(stage);

  var ambSh = PIXI.Shader.from(Shaders.UQ, Shaders.AMB_F,
    { uDT:0, uDy:0, uDw:0, uSs:0 });
  stage.addChild(new PIXI.Mesh(Shaders.makeQuadG(0,0,W,H), ambSh));

  var combat  = new G.CombatSystem(stage);
  var bossSys = new G.BossSystem(stage);

  var hurtOverlay = new PIXI.Graphics();
  var deadOverlay = new PIXI.Graphics();
  stage.addChild(hurtOverlay);
  stage.addChild(deadOverlay);

  // 技能施放範圍指示圈
  var _skillRing    = new PIXI.Graphics();
  var _skillRingT   = 0, _skillRingR = 0, _skillRingClr = 0xFFFFFF;
  var _skillRingX   = 0, _skillRingZ = 0;
  stage.addChild(_skillRing);
  G.Events.on('skillCast', function (e) {
    _skillRingT   = 0.45;
    _skillRingR   = e.range || 5;  // 世界單位
    _skillRingClr = e.clr   || 0xFFFFFF;
    _skillRingX   = e.x     || 0;
    _skillRingZ   = e.z     || 0;
  });

  // 新手教學系統
  var tutorial = new G.TutorialSystem();
  // 施法動畫計時器
  var _castAnimT = 0;

  // ── 遊戲系統 ─────────────────────────────────────────────────────────────
  var levelSystem  = new G.LevelSystem();
  var skillSystem  = new G.SkillSystem();
  var areaSys      = new G.AreaSystem();
  var minimap      = new G.Minimap();
  var save         = new G.SaveSystem();
  var saved        = save.load();

  var inventory, shop, quests, skillTree, craft, bestiary, achievements, reputation;

  // showNotif 全域通知橋接
  G.Events.on('showNotif', function(e){
    var el = document.getElementById('loot-notifs');
    if (!el) return;
    var d = document.createElement('div');
    d.className = 'loot-notif';
    d.innerHTML = e.msg || '';
    if (e.clr) d.style.color = e.clr;
    el.appendChild(d);
    setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, e.duration || 2800);
  });

  // ── 全域存取 ─────────────────────────────────────────────────────────────
  G._levelSys  = levelSystem;
  G._uiOpen    = false;
  G._checkUiOpen = function () {
    var dlg = document.getElementById('dialog-box');
    var qop = document.getElementById('quest-offer-panel');
    G._uiOpen = !!(
      (inventory   && inventory._open) ||
      (shop        && shop._open)      ||
      (quests      && quests._panel && quests._panel.classList.contains('open'))       ||
      (skillTree   && skillTree._panel && skillTree._panel.classList.contains('open')) ||
      (craft       && craft._panel && craft._panel.classList.contains('open'))         ||
      (bestiary    && bestiary._panel && bestiary._panel.classList.contains('open'))   ||
      (achievements&& achievements._panel && achievements._panel.classList.contains('open'))||
      (reputation  && reputation._panel && reputation._panel.classList.contains('open'))   ||
      (townSys.warehouse._open) ||
      (dlg && dlg.style.display === 'flex') ||
      (qop && qop.style.display === 'flex')
    );
  };

  function applyEquipStats() {
    if (!inventory) return;
    var eq = inventory.getEquippedStats();
    var skAtk = G.skillTree ? G.skillTree.getPassiveStat('atk') : 0;
    var skDef = G.skillTree ? G.skillTree.getPassiveStat('def') : 0;
    var skHp  = G.skillTree ? G.skillTree.getPassiveStat('hp')  : 0;
    var skMp  = G.skillTree ? G.skillTree.getPassiveStat('mp')  : 0;
    player.totalAtk = player.baseAtk + eq.atk + skAtk;
    player.totalDef = player.baseDef + eq.def + skDef;
    player.maxHp    = player.baseMaxHp + eq.hp + skHp;
    player.maxMp    = player.baseMaxMp + eq.mp + skMp;
    player.hp       = Math.min(player.hp, player.maxHp);
    player.mp       = Math.min(player.mp, player.maxMp);
  }
  G.Events.on('equipChanged', applyEquipStats);

  // webp 載入
  G.CharacterRenderer.loadTextures('assets/characters/', function (textures) {
    ANIM_STATE = G.CharacterRenderer.ANIM;
    player.initWebp(textures);
    if (player.sprite._needsAddToStage) {
      player.sprite._needsAddToStage = false;
      var idx = stage.getChildIndex(plShadowMesh);
      stage.addChildAt(player.sprite, idx + 1);
    }
  });

  // ── DOM ───────────────────────────────────────────────────────────────────
  var hud     = document.getElementById('hud');
  var hpFill  = document.getElementById('hp-fill');
  var mpFill  = document.getElementById('mp-fill');
  var hpTxt   = document.getElementById('hp-txt');
  var mpTxt   = document.getElementById('mp-txt');
  var expFill = document.getElementById('exp-fill');
  var expTxt  = document.getElementById('exp-txt');
  var lvTxt   = document.getElementById('lv-txt');
  var lvupEl  = document.getElementById('lvup-notice');
  var skEls   = [
    {nm:document.getElementById('sk-0-name'),mp:document.getElementById('sk-0-mp'),
     cd:document.getElementById('sk-0-cd'), sl:document.getElementById('sk-0')},
    {nm:document.getElementById('sk-1-name'),mp:document.getElementById('sk-1-mp'),
     cd:document.getElementById('sk-1-cd'), sl:document.getElementById('sk-1')},
  ];
  var _saveNoticeT = 0, _prevLevel = 1;

  function _showGameUI() {
    document.getElementById('skill-bar').style.display  = 'flex';
    document.getElementById('stat-bars').style.display  = 'flex';
    document.getElementById('exp-area').style.display   = 'flex';
    lvTxt.style.display = 'block';
    var hg = document.getElementById('hud-gold');
    if (hg) hg.style.display = 'block';
    minimap.show();
  }

  // ── GameFlow ──────────────────────────────────────────────────────────────
  var gameStarted = false;
  var gameTime    = 0;
  var cam         = { x:0, z:0 };
  var keys        = {};

  new G.GameFlow(!!saved, function (result) {
    inventory    = new G.InventorySystem();
    shop         = new G.ShopSystem();
    quests       = new G.QuestSystem();
    skillTree    = new G.SkillTree();
    craft        = new G.CraftSystem();
    bestiary     = new G.BestiarySystem();
    achievements = new G.AchievementSystem();
    reputation   = new G.ReputationSystem();
    G.inventory    = inventory;
    G.shop         = shop;
    G.quests       = quests;
    G.skillTree    = skillTree;
    G.craft        = craft;
    G.bestiary     = bestiary;
    G.achievements = achievements;
    G.reputation   = reputation;
    townSys.init();

    citySys.init();
    tutorial.init();

    if (result.isNew) {
      player.name = result.name;
      player.setClass(result.cls);
      player.x = 0; player.z = 0;
      player.hp = player.maxHp; player.mp = player.maxMp;
      gameTime = 0; cam.x = 0; cam.z = 0;
      save.clear();
      // 任務改由 NPC 接取，不再自動接受（玩家需前往翡翠城找公會長）
    } else if (saved) {
      player.name = saved.name || '旅人';
      player.x    = saved.x    || 0;
      player.z    = saved.z    || 0;
      player.hp   = saved.hp   || player.maxHp;
      gameTime    = saved.gameTime || 0;
      levelSystem.level   = saved.level   || 1;
      levelSystem.exp     = saved.exp     || 0;
      levelSystem.expNext = saved.expNext || 80;
      if (saved.cls !== undefined) player.setClass(saved.cls);
      if (saved.inventory)    inventory.deserialize(saved.inventory);
      if (saved.quests)       quests.deserialize(saved.quests);
      if (saved.skillTree)    skillTree.deserialize(saved.skillTree);
      if (saved.bestiary)     bestiary.deserialize(saved.bestiary);
      if (saved.achievements) achievements.deserialize(saved.achievements);
      if (saved.reputation)   reputation.deserialize(saved.reputation);
      if (saved.warehouse)    townSys.warehouse.deserialize(saved.warehouse);
      cam.x = player.x; cam.z = player.z;
      applyEquipStats();
    }

    save.startAutoSave(function(){
      return {
        x:player.x, z:player.z, cls:player.cls, name:player.name,
        hp:player.hp, gameTime:gameTime,
        level:levelSystem.level, exp:levelSystem.exp, expNext:levelSystem.expNext,
        inventory:    inventory.serialize(),
        quests:       quests.serialize(),
        skillTree:    skillTree.serialize(),
        bestiary:     bestiary    ? bestiary.serialize()     : null,
        achievements: achievements? achievements.serialize() : null,
        reputation:   reputation  ? reputation.serialize()  : null,
        warehouse:    townSys.warehouse.serialize(),
      };
    });

    hud.textContent = '';
    _showGameUI();
    gameStarted = true;
  });

  // ── 滑鼠追蹤（世界座標換算） ─────────────────────────────────────────────
  var _mouseScreenX = W/2, _mouseScreenY = H/2;
  window.addEventListener('mousemove', function(e){
    var rect = app.view.getBoundingClientRect();
    _mouseScreenX = (e.clientX - rect.left) * (W / rect.width);
    _mouseScreenY = (e.clientY - rect.top)  * (H / rect.height);
  });
  function _mouseWorld(){
    return {
      x: cam.x + (_mouseScreenX - W/2) / SCALE,
      z: cam.z + (_mouseScreenY - H/2) / (SCALE * ISO_Z),
    };
  }

  // ── 輸入 ─────────────────────────────────────────────────────────────────
  window.addEventListener('keydown', function(e){
    keys[e.key] = true;
    if (!gameStarted) return;

    // UI 面板鍵（任何時候都響應）
    if (e.key==='i'||e.key==='I'){
      if(inventory) inventory.toggle();
      if(tutorial && !tutorial._done) tutorial.markInventory();
      return;
    }
    if (e.key==='l'||e.key==='L'){ if(quests)    quests.togglePanel(); return; }
    if (e.key==='k'||e.key==='K'){ if(skillTree) skillTree.toggle(); return; }
    if (e.key==='c'||e.key==='C'){ if(craft)        craft.toggle();        return; }
    if (e.key==='n'||e.key==='N'){ if(bestiary)     bestiary.toggle();     return; }
    if (e.key==='h'||e.key==='H'){ if(achievements) achievements.toggle(); return; }
    if (e.key==='r'||e.key==='R'){ if(reputation)   reputation.toggle();   return; }
    if (e.key==='Escape'){
      if(inventory)    inventory.hide();
      if(shop)         shop.close();
      if(quests)       quests.hidePanel();
      if(skillTree)    skillTree.hide();
      if(craft)        craft.hide();
      if(bestiary)     bestiary.hide();
      if(achievements) achievements.hide();
      if(reputation)   reputation.hide();
      if (townSys) townSys.warehouse.hide();
      G.NPC.closeDialog();
      var qop = document.getElementById('quest-offer-panel');
      if (qop) qop.style.display = 'none';
      G._checkUiOpen();
      return;
    }

    if (G._uiOpen || player.dead) return;

    if (e.key>='1'&&e.key<='5') player.setClass(parseInt(e.key)-1);
    if (e.key==='Tab'){ e.preventDefault(); player.setClass(player.cls+1); }
    if (e.key==='p'||e.key==='P'){
      save.save({
        x:player.x, z:player.z, cls:player.cls, name:player.name,
        hp:player.hp, gameTime:gameTime,
        level:levelSystem.level, exp:levelSystem.exp, expNext:levelSystem.expNext,
        inventory:    inventory    ? inventory.serialize()    : null,
        quests:       quests       ? quests.serialize()       : null,
        skillTree:    skillTree    ? skillTree.serialize()    : null,
        bestiary:     bestiary     ? bestiary.serialize()     : null,
        achievements: achievements ? achievements.serialize() : null,
        reputation:   reputation   ? reputation.serialize()   : null,
        warehouse:    townSys.warehouse.serialize(),
      });
      _saveNoticeT = 2.5;
    }
    if (e.key==='q'||e.key==='Q') { if (skillSystem.tryUse(0, player, effectMgr, _mouseWorld())) _castAnimT = 0.55; }
    if (e.key==='e'||e.key==='E') { if (skillSystem.tryUse(1, player, effectMgr, _mouseWorld())) _castAnimT = 0.55; }
    // Z：快速使用第一個消耗品
    if (e.key==='z'||e.key==='Z'){
      if(inventory){
        for(var _i=0;_i<inventory.slots.length;_i++){
          var _s=inventory.slots[_i];
          if(_s){ var _def=G.ItemDatabase.get(_s.itemId); if(_def&&_def.type==='consumable'){ inventory._useConsumable(_i,_def); break; } }
        }
      }
    }
  });
  window.addEventListener('keyup', function(e){ keys[e.key]=false; });

  // ── HUD 更新函式 ─────────────────────────────────────────────────────────
  function _updateSkillBar(){
    var cls=G.CLS_NAMES[player.cls], defs=skillSystem.getDefs(cls);
    for(var i=0;i<2;i++){
      var def=defs[i],el=skEls[i];
      if(!def){el.nm.textContent='—';el.mp.textContent='';el.cd.style.width='0%';continue;}
      el.nm.textContent=def.name;
      el.mp.textContent=def.mpCost+' MP';
      el.cd.style.width=(skillSystem.getCd(i)/def.cd*100).toFixed(1)+'%';
      el.sl.style.opacity=player.mp<def.mpCost?'0.45':'1';
    }
  }
  function _updateStatBars(){
    var hpR=Math.max(0,player.hp/player.maxHp), mpR=Math.max(0,player.mp/player.maxMp);
    hpFill.style.width=(hpR*100).toFixed(1)+'%';
    mpFill.style.width=(mpR*100).toFixed(1)+'%';
    hpTxt.textContent=player.hp+' / '+player.maxHp;
    mpTxt.textContent=Math.floor(player.mp)+' / '+player.maxMp;
  }
  function _updateExpBar(){
    expFill.style.width=(levelSystem.expRatio()*100).toFixed(1)+'%';
    lvTxt.textContent='Lv.'+levelSystem.level;
    expTxt.textContent=levelSystem.exp+' / '+levelSystem.expNext+' EXP';
  }

  // ── 震動 ─────────────────────────────────────────────────────────────────
  var _shakeMag=0, _prevHurtT=0;

  // ── 主迴圈 ───────────────────────────────────────────────────────────────
  app.ticker.add(function(delta){
    var dt=Math.min(delta/60, 0.05);
    gameTime+=dt;
    var DT=(gameTime/DAY_DUR)%1.0, T=gameTime;

    var isDy=jsDy(DT);
    var isDw=jsP(DT,0.08,0.14)*(1-jsP(DT,0.26,0.16));
    var isSs=jsP(DT,0.62,0.14)*(1-jsP(DT,0.77,0.15));

    gndSh.uniforms.uDy=isDy;gndSh.uniforms.uDw=isDw;gndSh.uniforms.uSs=isSs;
    gndSh.uniforms.uT=T;gndSh.uniforms.uDT=DT;
    gndSh.uniforms.uCX=cam.x;gndSh.uniforms.uCZ=cam.z;
    ambSh.uniforms.uDy=isDy;ambSh.uniforms.uDw=isDw;ambSh.uniforms.uSs=isSs;
    ambSh.uniforms.uDT=DT;

    var windStr=0.65+Math.sin(T*0.26)*0.40;
    worldManager.update(player.x,player.z,cam,{isDy:isDy,isDw:isDw,isSs:isSs,T:T,DT:DT,windStr:windStr});

    if(!gameStarted) return;

    skillSystem.update(dt);
    levelSystem.update(dt);

    var ak=G._uiOpen?{}:keys;
    var moving=player.update(dt, ak);
    if (moving && tutorial && !tutorial._done) tutorial.markMove();
    cam.x+=(player.x-cam.x)*0.10;
    cam.z+=(player.z-cam.z)*0.10;

    // 非移動時角色朝向滑鼠位置
    if (!moving && !G._uiOpen && !player.dead && gameStarted) {
      var mw = _mouseWorld();
      var mdx = mw.x - player.x;
      if (Math.abs(mdx) > 0.5) {
        player.facing = mdx > 0 ? 1 : -1;
      }
    }

    if (_castAnimT > 0) _castAnimT -= dt;

    if(player.character && ANIM_STATE){
      player.character.setFacing(player.facing);
      // 優先度：死亡 > 受傷 > 施法 > 移動 > 待機
      var animSt;
      if      (player.dead)          animSt = ANIM_STATE.DIE;
      else if (player.hurtT  > 0)    animSt = ANIM_STATE.HURT;
      else if (_castAnimT    > 0)    animSt = ANIM_STATE.CAST;
      else if (moving)               animSt = ANIM_STATE.WALK;
      else                           animSt = ANIM_STATE.IDLE;
      player.character.setState(animSt);
      player.character.update(dt);
    }

    spawnManager.update(dt);
    var cx=Math.floor(player.x/G.CHUNK_SIZE), cz=Math.floor(player.z/G.CHUNK_SIZE), R=G.LOAD_RADIUS;
    for(var dz2=-R;dz2<=R;dz2++) for(var dx2=-R;dx2<=R;dx2++) spawnManager.initChunk(cx+dx2,cz+dz2);

    monsterMgr.update(dt, player.x, player.z, cam, spawnManager);
    combat.update(dt, ak, player, monsterMgr.getMonsters(), cam);

    // Boss 戰鬥
    var boss=bossSys.getActiveBoss();
    if(boss&&!boss.dead){
      if(boss.popAttack()){
        var bHit=Math.max(1,boss.atk-(player.totalDef||0)+Math.floor(Math.random()*8)-4);
        player.takeDamage(bHit);
      }
      var bdx=boss.x-player.x,bdz=boss.z-player.z,bDist=Math.sqrt(bdx*bdx+bdz*bdz)||0.01;
      if(bDist<2.5&&(ak[' ']||ak['j']||ak['J'])){
        boss.takeDamage((player.totalAtk||10)+12+Math.floor(Math.random()*10),bdx/bDist*2,bdz/bDist*2);
      }
    }

    effectMgr.update(dt, cam, monsterMgr.getMonsters());
    dropMgr.update(dt, cam, player.x, player.z);
    npcMgr.update(dt, player.x, player.z, cam, keys);
    gatherSys.update(dt, cam, player.x, player.z, keys);
    bossSys.update(dt, player.x, player.z, cam);
    townSys.update(dt, player.x, player.z, cam, ak);
    citySys.update(dt, player.x, player.z, cam, keys, tutorial);
    tutorial.update();
    areaSys.update(dt, player.x, player.z);
    worldEvtSys.update(dt, cam);
    minimap.update(dt, player.x, player.z, monsterMgr.getMonsters());

    // 技能範圍指示圈（隨時間擴散並淡出）
    _skillRing.clear();
    if (_skillRingT > 0) {
      _skillRingT -= dt;
      var prog  = 1 - Math.max(0, _skillRingT / 0.45);
      var alpha = Math.max(0, _skillRingT / 0.45) * 0.80;
      var rx    = _skillRingR * (0.15 + prog * 0.85) * SCALE;
      var ry    = rx * ISO_Z;
      var cx2   = W/2 + (_skillRingX - cam.x) * SCALE;
      var cy2   = H/2 + (_skillRingZ - cam.z) * SCALE * ISO_Z;
      _skillRing.lineStyle(2.5, _skillRingClr, alpha);
      _skillRing.drawEllipse(cx2, cy2, rx, ry);
    }

    // 震動
    if(player.hurtT>_prevHurtT) _shakeMag=Math.max(_shakeMag,6);
    _prevHurtT=player.hurtT;
    if(_shakeMag>0){ _shakeMag=Math.max(0,_shakeMag-18*dt); stage.x=(Math.random()-.5)*_shakeMag; stage.y=(Math.random()-.5)*_shakeMag; }
    else{ stage.x=0; stage.y=0; }

    // 玩家位置
    var psx=W/2+(player.x-cam.x)*SCALE, psy=H/2+(player.z-cam.z)*SCALE*ISO_Z;
    if(player.character){ player.sprite.x=psx; player.sprite.y=psy; }
    else{
      var bob=moving?Math.sin(player.walk*2.5)*CHAR_SC*0.7:0;
      player.sprite.position.set(psx,psy+bob);
      player.sprite.scale.set(player.facing*CHAR_SC,CHAR_SC);
      var dn=isDy*0.68+0.32;
      player.sprite.tint=(Math.min(255,Math.round((dn*.9+(1-isDy)*.08)*255))<<16)|
                         (Math.min(255,Math.round((dn*.9+(1-isDy)*.10)*255))<<8)|
                          Math.min(255,Math.round((dn*.78+(1-isDy)*.22)*255));
    }
    plShadowSh.uniforms.uSX=psx;plShadowSh.uniforms.uSY=psy;plShadowSh.uniforms.uDy=isDy;

    // Overlay
    hurtOverlay.clear();
    if(player.hurtT>0) hurtOverlay.beginFill(0xFF1111,Math.min(.40,player.hurtT*1.4)).drawRect(0,0,W,H).endFill();
    deadOverlay.clear();
    if(player.dead) deadOverlay.beginFill(0x000000,Math.min(.88,1-player.respawnT/4)).drawRect(0,0,W,H).endFill();

    // 升級
    var newLv=levelSystem.popNotice();
    if(newLv&&newLv!==_prevLevel){
      _prevLevel=newLv;
      lvupEl.textContent='✦  Level '+newLv+'  ✦';
      lvupEl.style.animation='none';void lvupEl.offsetWidth;lvupEl.style.animation='';
      lvupEl.style.display='block';
      setTimeout(function(){lvupEl.style.display='none';},3600);
    }
    if(_saveNoticeT>0) _saveNoticeT-=dt;

    // DOM 更新
    _updateStatBars(); _updateExpBar(); _updateSkillBar();

    // HUD 文字
    var hr=Math.floor(DT*24),mn=Math.floor((DT*24-hr)*60);
    var phase=isDy>0.6?'☀ 白天':isDw>0.3?'🌅 日出':isSs>0.3?'🌇 日落':'🌙 夜晚';
    if(player.dead){
      hud.innerHTML='<span style="color:#FF4444;font-size:20px">☠ 已倒下</span><br><small>'+Math.ceil(player.respawnT)+'秒後重生…</small>';
    } else {
      hud.innerHTML=phase+' '+String(hr).padStart(2,'0')+':'+String(mn).padStart(2,'0')+
        ' ｜ <b>'+player.name+'</b> ['+player.className+']'+
        ' ('+player.x.toFixed(0)+','+player.z.toFixed(0)+')'+
        (_saveNoticeT>0?' <span style="color:#88FF88;font-size:10px">✔ 已存檔</span>':'')+
        '<br><small>移動:WASD ｜ 攻擊:空白/J ｜ 技能:Q/E ｜ 快用:Z ｜ 對話:T ｜ 採集:G ｜ 背包:I ｜ 任務:L ｜ 技能:K ｜ 製作:C ｜ 圖鑑:N ｜ 成就:H ｜ 聲望:R ｜ 倉庫:B(城鎮) ｜ 存檔:P</small>';
    }
  });
})(window.Game = window.Game || {});
