/* =====================================================================
   ANATOMY RANGE — MAXIMUM GORE ADD-ON
   Load AFTER the last game <script>:   <script src="gore-max.js"></script>
   Hooks the game's own damage functions (bleed, gore, hurt, cut, die,
   odie, gibHead, expl, addW, hitP, tick). All visuals are cosmetic and
   safe in multiplayer: only the host ever severs limbs, clients just
   see the extra spray.
   ===================================================================== */
(()=>{
if(window.__arMaxGore)return;window.__arMaxGore=true;

/* ---------- settings (saved in this browser) ---------- */
const KEY='ar_maxgore_v1',KEYI='ar_maxgore_int_v1';
let on=true,lvl=3;
try{const s=localStorage.getItem(KEY);if(s!==null)on=s==='1';const i=+localStorage.getItem(KEYI);if(i>=1&&i<=3)lvl=i}catch(e){}
const MUL=[0,1,1.8,2.8],        // particle / decal multiplier
      LIMB=[0,200,130,80],      // damage needed to rip a limb off
      GIB=[0,260,200,120],      // damage needed to pop a head
      TORSO=[0,9999,360,240];   // damage needed to tear a torso in half
const M=()=>MUL[lvl];
const isCl=()=>typeof window.__isClient==='function'&&!!window.__isClient();

const PAL=[0x7a0c12,0x9c1118,0x5d080d,0xb5161e,0xd01a24,0x3a0407];
const GUTS=[0xe3a1a8,0xc7777f,0xc9a35a,0x7a5a2a,0xd8a49c,0x8a1219];
const RED=new T.Color(0x5e060c),vt=V();
const pick=a=>a[(R()*a.length)|0];
let budget=0;                    // per-frame particle budget (protects framerate)

/* ---------- building blocks ---------- */
// Blood droplets. Hitting the floor they leave persistent decals.
function spray(p,d,n,sp,sz){
 n=Math.min(n|0,budget);if(n<=0)return;budget-=n;
 for(let i=0;i<n;i++)
  part(p.x,p.y,p.z,
   d.x*sp*rr(.3,1.4)+rr(-1.6,1.6),
   d.y*sp*rr(.3,1.3)+rr(0,3.4),
   d.z*sp*rr(.3,1.4)+rr(-1.6,1.6),
   rr(1.2,3),sz*rr(.5,1.7),pick(PAL),-7,0);
}
// Fine red mist that hangs in the air and shrinks away.
function mist(p,d,n){
 n=Math.min(n|0,budget);if(n<=0)return;budget-=n;
 for(let i=0;i<n;i++)
  part(p.x,p.y,p.z,d.x*rr(1,5)+rr(-1,1),d.y*rr(0,3)+rr(0,1.5),d.z*rr(1,5)+rr(-1,1),
   rr(.3,.9),rr(.04,.1),pick(PAL),-1.2,2);
}
// Persistent chunks of meat / bone / organ that bounce and smear the floor.
function chunks(p,n,cols,sp){
 n=Math.min(n|0,budget);if(n<=0)return;budget-=n;
 for(let i=0;i<n;i++){
  const big=R()<.12,c=R()<.72?pick(cols):pick(FLESH);
  part(p.x+rr(-.1,.1),p.y+rr(-.05,.15),p.z+rr(-.1,.1),
   rr(-sp,sp),rr(.5,sp*1.2),rr(-sp,sp),90,
   big?rr(.07,.13):rr(.025,.07),c,-9.8,1);
 }
}
function floorSplats(cx,cz,spread,n,s0,s1){
 for(let i=0;i<n;i++)dec(cx+rr(-spread,spread),cz+rr(-spread,spread),rr(s0,s1),pick(PAL));
}

/* ---------- blood on the camera lens ---------- */
const scv=document.createElement('canvas');
scv.id='ar-gore-screen';
scv.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:5';
document.body.appendChild(scv);
const sctx=scv.getContext('2d');
let sd=[],srun=false,slast=0;
const fit=()=>{scv.width=Math.max(1,innerWidth);scv.height=Math.max(1,innerHeight)};
fit();addEventListener('resize',fit);
function screenSplat(n,big){
 if(!on)return;
 for(let i=0;i<n&&sd.length<160;i++){
  const y=rr(.05,.85)*scv.height;
  sd.push({x:rr(.08,.92)*scv.width,y,sy:y,r:rr(10,38)*big,age:0,life:rr(7,14),
           vy:rr(2,9),a:rr(.65,.95),c:R()<.7?'#8a0f17':'#5a080d'});
 }
 if(!srun){srun=true;slast=performance.now();requestAnimationFrame(sloop)}
}
function sloop(t){
 const dt=Math.min(.05,(t-slast)/1000);slast=t;
 const menu=document.getElementById('menu');
 scv.style.visibility=(menu&&menu.style.display!=='none')?'hidden':'visible';
 sctx.clearRect(0,0,scv.width,scv.height);
 for(let i=sd.length-1;i>=0;i--){
  const q=sd[i];q.age+=dt;
  if(q.age>q.life){sd.splice(i,1);continue}
  const f=q.age/q.life,al=q.a*(f>.7?1-(f-.7)/.3:1);
  q.y+=q.vy*dt*(1-f*.8)*(q.r/30);
  sctx.globalAlpha=al;
  sctx.strokeStyle=q.c;sctx.lineCap='round';sctx.lineWidth=q.r*.38*(1-f*.5);
  sctx.beginPath();sctx.moveTo(q.x,q.sy);sctx.lineTo(q.x,q.y);sctx.stroke();
  const g=sctx.createRadialGradient(q.x,q.y,0,q.x,q.y,q.r);
  g.addColorStop(0,q.c);g.addColorStop(.7,q.c);g.addColorStop(1,'rgba(90,6,12,0)');
  sctx.fillStyle=g;sctx.beginPath();sctx.arc(q.x,q.y,q.r,0,6.283);sctx.fill();
 }
 sctx.globalAlpha=1;
 if(sd.length)requestAnimationFrame(sloop);
 else{srun=false;sctx.clearRect(0,0,scv.width,scv.height)}
}

/* ---------- impact gore (every hit on a body) ---------- */
const _bleed=bleed;           // original chain: particles + wall splatter
bleed=function(p,d,n,sp,c){
 _bleed.apply(this,arguments);
 if(!on||!p||!d)return;
 try{
  const m=M(),k=n<3?.5:1;
  spray(p,d,Math.min(40,Math.round(n*2.2*m*k)),Math.min(9,(sp||2)*1.3),.03);
  if(n>=4)mist(p,d,Math.min(30,Math.round(n*m*1.5)));
 }catch(x){}
};

const _gore=gore;
gore=function(p,n,cols,sp,sz){
 _gore.apply(this,arguments);
 if(!on||!p)return;
 try{chunks(p,Math.min(60,Math.round(n*2*M())),cols&&cols.length?cols:FLESH,sp||4)}catch(x){}
};

function impactGore(e,si,pt,d,D,ty,tt,s){
 const m=M(),k=Math.min(3,D/35)*m,dir=d.clone().normalize();
 spray(pt,dir,Math.round(8+k*14),3+k*2.2,.035);                       // exit spray
 spray(pt,dir.clone().negate(),Math.round(4+k*7),2+k*1.2,.028);       // back-spatter
 if(D>=12)mist(pt,dir,Math.round(4+k*8));
 if(D>=22)chunks(pt,Math.round(1+k*3),FLESH,2+k*1.5);
 if(s&&s.open&&D>=18)chunks(pt,Math.round(k*2),BONE,3);
 if(D>=30){const g=e.pts[3].p;floorSplats(g.x,g.z,1.4+k*.4,Math.min(10,Math.round(2+k*2)),.15,.55+k*.1)}
 if(D>=45)_bleed(pt,dir,Math.min(18,Math.round(6+k*3)),4,0);          // extra wall splatter
 if(D>=15&&R()<.5)sfx('squelch',pt.clone(),Math.min(1.4,.6+D/80));
 // blood on the lens when it happens near you
 cam.getWorldPosition(vt);
 const dc=vt.distanceTo(pt);
 if(dc<3.6&&D>=8)screenSplat(Math.min(10,Math.round((1+D/25)*(1+m*.4)*(1-dc/4.2))),1+m*.15);
 // dismemberment (host / solo only)
 if(isCl()||e.net!=null)return;
 if(si===0&&!s.gone&&D>=GIB[lvl]&&ty!=='f'){gibHead(e);return}
 if(si>2&&!s.cut&&!s.gone&&D>=LIMB[lvl]&&(ty==='b'||ty==='x'||ty==='e')){cut(e,si,'torn apart',tt);return}
 if(si<3&&si>0&&!s.cut&&!s.gone&&D>=TORSO[lvl]&&(ty==='b'||ty==='x'||ty==='e'))cut(e,si,'torn in half',tt);
}
const _hurt=hurt;
hurt=function(e,si,pt,d,D,ty,imp,tt){
 const s=e&&e.seg&&e.seg[si],gone0=s&&(s.gone||s.cut);
 const r=_hurt.apply(this,arguments);
 if(on&&e&&e.seg&&pt&&d&&ty!=='f'&&D>=4&&!gone0){try{impactGore(e,si,pt,d,D,ty,tt,s)}catch(x){}}
 return r;
};

/* ---------- severing, gibbing, death ---------- */
const _cut=cut;
cut=function(e,si,why,tt){
 const s=e&&e.seg&&e.seg[si],was=s&&(s.cut||s.gone);
 const r=_cut.apply(this,arguments);
 if(on&&s&&!was&&s.cut){
  try{
   const[,ia,ib]=SD[si],p=e.pts[ia].p.clone().lerp(e.pts[ib].p,s.ct||.5),m=M();
   spray(p,V(rr(-1,1),rr(.2,1),rr(-1,1)).normalize(),Math.round(60*m),7,.04);
   mist(p,Y,Math.round(18*m));
   chunks(p,Math.round(14*m),FLESH.concat(BONE),5);
   floorSplats(p.x,p.z,1.2,Math.round(4*m),.2,.7);
   sfx('squelch',p.clone(),1.4);shake=Math.max(shake,.3);
  }catch(x){}
 }
 return r;
};

const _gibHead=gibHead;
gibHead=function(e){
 const was=e.seg&&e.seg[0]&&e.seg[0].gone,p=e.pts[0].p.clone();
 const r=_gibHead.apply(this,arguments);
 if(on&&!was){try{
  const m=M();
  spray(p,Y,Math.round(120*m),9,.05);
  mist(p,Y,Math.round(40*m));
  chunks(p,Math.round(28*m),GUTS.concat(BONE),7);
  floorSplats(p.x,p.z,1.8,Math.round(8*m),.25,.9);
  sfx('squelch',p.clone(),1.5);shake=Math.max(shake,.45);
  cam.getWorldPosition(vt);if(vt.distanceTo(p)<5)screenSplat(Math.round(6+m*3),1.6);
 }catch(x){}}
 return r;
};

const _odie=odie;
odie=function(e,s,o){
 const col=o&&o.m?o.m.material.color.getHex():0xaa3040;
 const r=_odie.apply(this,arguments);
 if(on){try{chunks(s.G.position.clone(),Math.round(10*M()),[col,col,0x8a1219],4)}catch(x){}}
 return r;
};

function deathBurst(e){
 const p=e.pts[1].p.clone(),m=M();
 spray(p,Y,Math.round(50*m),6,.04);
 mist(p,Y,Math.round(24*m));
 chunks(p,Math.round(12*m),FLESH,4);
 floorSplats(e.pts[3].p.x,e.pts[3].p.z,1.2,Math.round(4*m),.2,.6);
 sfx('squelch',p.clone(),1.2);
 e._pool=(e._pool||0)+10;
}
const _die=die;
die=function(e,why){
 const was=e&&e.alive,r=_die.apply(this,arguments);
 if(on&&was&&e.net==null){try{deathBurst(e)}catch(x){}}
 return r;
};

// Longer-lasting wounds = more blood, longer bleeds.
const _addW=addW;
addW=function(e,pt,tw,f,rate,vol,art){
 return _addW.call(this,e,pt,tw,f,rate,on?vol*(1+M()*.5):vol,art);
};

/* ---------- explosions turn bodies into confetti ---------- */
const _expl=expl;
expl=function(x,y,z,Rd,dm){
 const r=_expl.apply(this,arguments);
 if(on&&Rd>=3){try{gibBlast(x,y,z,Rd,dm)}catch(e){}}
 return r;
};
function gibBlast(x,y,z,Rd,dm){
 const c=V(x,y,z),m=M(),cl=isCl();let any=0;
 for(const e of ents){
  if(!e.pts||e.net!=null)continue;
  const tp=e.pts[3].p,d=tp.distanceTo(c);if(d>=Rd)continue;
  any=1;const f=1-d/Rd,out=tp.clone().sub(c).normalize();
  if(!cl&&dm>=80){
   const pr=Math.min(1,f*1.6*(m/2)+.15);
   for(let si=0;si<SD.length;si++){const s=e.seg[si];if(s&&!s.cut&&!s.gone&&R()<pr)cut(e,si,'blown apart',R())}
  }
  spray(tp,out,Math.round(40*f*m+10),8+Rd*.5,.045);
  chunks(tp,Math.round(20*f*m+4),GUTS.concat(FLESH,BONE),6+Rd*.4);
  mist(tp,out,Math.round(14*m));
 }
 if(any){
  floorSplats(x,z,Rd*.8,Math.round(14*m),.4,1.7);
  shake=Math.max(shake,.5);
  cam.getWorldPosition(vt);
  if(vt.distanceTo(c)<Rd*1.2)screenSplat(Math.round(8+m*3),1.7);
 }
}

/* ---------- you get hit: blood on the screen ---------- */
const _hitP=hitP;
hitP=function(d){
 const r=_hitP.apply(this,arguments);
 try{if(on&&d>=2&&pl.dead<=0)screenSplat(Math.min(8,Math.round(d/6)+1),1.2)}catch(x){}
 return r;
};

/* ---------- per-frame: pooling blood, trails, blood-soaked skin ---------- */
function soak(e,m){
 for(const w of e.wounds){
  if(w.vol<=0)continue;
  const s=e.seg[PS[w.pt]];if(s&&s.mat)s.mat.color.lerp(RED,.05*m);
  const j=e.jm[w.pt];if(j&&j.material)j.material.color.lerp(RED,.05*m);
 }
}
function goreTick(dt){
 const m=M();
 for(const e of ents){
  if(!e||!e.wounds||!e.pts)continue;
  e._gt=(e._gt||0)+dt;e._gs=(e._gs||0)+dt;
  if(e._gt>=.14){
   e._gt=0;
   let act=0;for(const w of e.wounds)if(w.vol>0&&e.blood>0)act++;
   if(act&&(e._pc||0)<320){
    const hp=e.pts[3].p,stand=e.alive&&e.c>.5&&e.stun<=0&&!e.prone;
    e._pool=(e._pool||0)+act*.6;
    const spread=stand?.25:Math.min(1.6,.5+e._pool*.02);
    const sz=(stand?rr(.1,.24):rr(.22,.5)+Math.min(.9,e._pool*.012))*(.8+m*.2);
    dec(hp.x+rr(-spread,spread),hp.z+rr(-spread,spread),sz,pick(PAL));
    if(!stand&&R()<.5)dec(hp.x+rr(-spread,spread),hp.z+rr(-spread,spread),sz*.5,pick(PAL));
    e._pc=(e._pc||0)+1;
   }
  }
  if(e._gs>=.6){e._gs=0;soak(e,m)}
 }
}
const _tick=tick;
tick=function(dt){
 budget=Math.round(700*M());
 _tick.apply(this,arguments);
 if(on&&!edit){try{goreTick(dt)}catch(x){}}
};

/* ---------- menu controls ---------- */
const host=document.querySelector('#damage-settings');
if(host){
 const w=document.createElement('div');
 w.style.cssText='margin-top:12px;padding-top:10px;border-top:1px solid #414b52';
 w.innerHTML=
  '<label style="display:flex;align-items:center;gap:10px;font-weight:700;cursor:pointer">'+
  '<input id="maxgore-toggle" type="checkbox" style="width:18px;height:18px;accent-color:#d21e2b"> MAXIMUM GORE '+
  '<span style="margin-left:auto;font-size:12px;color:#9aa5ab">ON by default</span></label>'+
  '<small style="display:block;color:#aeb8be;margin:5px 0 0 28px">Arterial spray, blood mist, gibs, pooling blood and trails, '+
  'blood-soaked bodies, dismemberment, exploding bodies and blood on the screen.</small>'+
  '<div style="margin:8px 0 0 28px;display:flex;align-items:center;gap:8px"><span style="color:#aeb8be">Intensity</span>'+
  '<select id="maxgore-int" style="font:600 15px \'Barlow Condensed\',sans-serif;color:#f2f0eb;background:#1d2327;border:1px solid #414b52;padding:4px 6px">'+
  '<option value="1">Heavy</option><option value="2">Extreme</option><option value="3">Absolute maximum</option></select></div>';
 host.appendChild(w);
 const tg=w.querySelector('#maxgore-toggle'),lv=w.querySelector('#maxgore-int');
 tg.checked=on;lv.value=String(lvl);
 tg.onchange=()=>{on=tg.checked;try{localStorage.setItem(KEY,on?'1':'0')}catch(e){}if(typeof toast==='function')toast(on?'Maximum gore enabled':'Maximum gore disabled')};
 lv.onchange=()=>{lvl=+lv.value||3;try{localStorage.setItem(KEYI,String(lvl))}catch(e){}};
}
})();
