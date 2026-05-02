import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// ─── Constants ────────────────────────────────────────────────
const FIELD_RADIUS   = 8;
const MAX_NODES      = 40;
const PARTICLE_COUNT = 3000;
const ATTRACTOR_POS  = new THREE.Vector3(0, 0, 0);

// ─── Helpers ──────────────────────────────────────────────────
function scoreToColor(score) {
  const lo  = new THREE.Color(0x1a3a8f);
  const mid = new THREE.Color(0x0d7a9f);
  const hi  = new THREE.Color(0x4af0c4);
  if (score < 0.5) return lo.clone().lerp(mid, score * 2);
  return mid.clone().lerp(hi, (score - 0.5) * 2);
}

function parsePH(phRange) {
  if (!phRange) return 4;
  const parts = String(phRange).split(/[–\-]/);
  const vals  = parts.map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
  if (!vals.length) return 4;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ─── Simplex noise GLSL (shared by shaders) ───────────────────
const SNOISE_GLSL = `
  vec3 _mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 _mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 _permute(vec4 x){return _mod289v4((x*34.+1.)*x);}
  vec4 _taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);
    const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=_mod289v3(i);
    vec4 p=_permute(_permute(_permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.+1.;
    vec4 s1=floor(b1)*2.+1.;
    vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=_taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
    m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`;

// ─── Scene builders ───────────────────────────────────────────
function buildEnergyField(scene) {
  const geo = new THREE.SphereGeometry(FIELD_RADIUS, 80, 80);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBestScore: { value: 0 } },
    vertexShader: `
      ${SNOISE_GLSL}
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying float vNoise;
      uniform float uTime;
      void main(){
        vNormal=normalMatrix*normal;
        float n=snoise(normal*2.2+uTime*.12)*.35;
        float n2=snoise(normal*5.5+uTime*.08)*.1;
        vec3 d=position+normal*(n+n2);
        vWorldPos=d;vNoise=n;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(d,1.);
      }`,
    fragmentShader: `
      varying vec3 vNormal;varying vec3 vWorldPos;varying float vNoise;
      uniform float uTime;uniform float uBestScore;
      void main(){
        vec3 n=normalize(vNormal);
        float rim=pow(1.-abs(dot(n,vec3(0.,0.,1.))),2.2);
        float dist=length(vWorldPos);
        float bands=pow(sin(dist*2.8-uTime*1.2)*.5+.5,3.);
        vec3 coldColor=vec3(.02,.12,.35);
        vec3 hotColor=vec3(.02,.62,.56);
        vec3 base=mix(coldColor,hotColor,uBestScore);
        float fresnel=rim*.7+bands*.15+(vNoise+1.)*.08;
        vec3 color=base+vec3(.1,.9,.7)*fresnel*uBestScore;
        gl_FragColor=vec4(color,fresnel*.22);
      }`,
    side: THREE.BackSide, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return mesh;
}

function buildAttractorCore(scene) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScore: { value: 0 } },
    vertexShader: `varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      varying vec3 vPos;uniform float uTime;uniform float uScore;
      void main(){
        float d=length(vPos);
        float glow=exp(-d*2.5)*(.4+uScore*.6);
        float pulse=.85+.15*sin(uTime*3.);
        vec3 col=mix(vec3(.05,.4,.5),vec3(.2,1.,.8),uScore);
        gl_FragColor=vec4(col*glow*pulse,glow*pulse);
      }`,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.FrontSide,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 32), mat);
  scene.add(core);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.9 + i * 0.55, 0.015, 8, 80),
      new THREE.MeshBasicMaterial({ color: 0x4af0c4, transparent: true, opacity: 0.15 - i * 0.04 }),
    );
    ring.rotation.x = Math.PI / 2 + i * 0.3;
    core.add(ring);
  }
  return core;
}

function buildConstraintRings(scene) {
  const rings = [];
  [
    { radius: FIELD_RADIUS * 0.82, thickness: 0.04, color: 0xff4d6d, opacity: 0.18, tilt: 0.4 },
    { radius: FIELD_RADIUS * 0.72, thickness: 0.03, color: 0xff7f50, opacity: 0.12, tilt: -0.6 },
  ].forEach(cd => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(cd.radius, cd.thickness, 8, 160),
      new THREE.MeshBasicMaterial({ color: cd.color, transparent: true, opacity: cd.opacity, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    ring.rotation.x = cd.tilt;
    ring.rotation.z = cd.tilt * 0.5;
    scene.add(ring);
    rings.push(ring);
  });
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const pts = [];
    for (let t = 0; t <= 1; t += 0.05) {
      const r = FIELD_RADIUS * (0.05 + t * 0.92);
      pts.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle * 0.5) * r * 0.3, Math.sin(angle) * r));
    }
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x0d2040, transparent: true, opacity: 0.25 }),
    ));
  }
  return rings;
}

function buildParticleField(scene) {
  const pos    = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes  = new Float32Array(PARTICLE_COUNT);
  const phases = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = Math.pow(Math.random(), 0.5) * FIELD_RADIUS;
    pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i*3+2] = r * Math.cos(phi);
    colors[i*3]   = 0.05 + Math.random() * 0.1;
    colors[i*3+1] = 0.25 + Math.random() * 0.35;
    colors[i*3+2] = 0.35 + Math.random() * 0.45;
    sizes[i]  = 0.5 + Math.random() * 2.0;
    phases[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('phase',    new THREE.BufferAttribute(phases, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBestScore: { value: 0 } },
    vertexShader: `
      attribute float size;attribute float phase;
      varying vec3 vColor;varying float vAlpha;
      uniform float uTime;uniform float uBestScore;
      void main(){
        vColor=color;
        float dist=length(position);
        float centrality=1.-dist/8.5;
        float pulse=sin(uTime*1.5+phase)*.5+.5;
        vAlpha=(.05+centrality*uBestScore*.4)*(.6+pulse*.4);
        vec4 mvPos=modelViewMatrix*vec4(position,1.);
        gl_PointSize=size*(280./-mvPos.z)*(.6+uBestScore*.4);
        gl_Position=projectionMatrix*mvPos;
      }`,
    fragmentShader: `
      varying vec3 vColor;varying float vAlpha;
      void main(){
        float d=length(gl_PointCoord-.5)*2.;
        float circle=1.-smoothstep(.3,1.,d);
        float glow=exp(-d*2.5)*.6;
        gl_FragColor=vec4(vColor+.3,(circle+glow)*vAlpha);
      }`,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, vertexColors: true,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return points;
}

function mapParamsToPosition(params, score, iterIndex) {
  const acidOffset = { 'H₂SO₄': 0, 'HCl': 1.1, 'HNO₃': 2.2, 'HF': 3.3 };
  const pH_norm    = ((params.pH || 4) - 1) / 13;
  const temp_norm  = ((params.temperature || 60) - 20) / 80;
  const acid_rot   = acidOffset[params.acid_type] ?? 0;
  const radial     = (1.0 - score) * FIELD_RADIUS * 0.82;
  const angle      = acid_rot + iterIndex * 0.42;
  return new THREE.Vector3(
    Math.cos(angle) * radial * (0.5 + pH_norm * 0.5) + (pH_norm - 0.5) * 2,
    (temp_norm - 0.5) * 5,
    Math.sin(angle) * radial * (0.5 + pH_norm * 0.5),
  );
}

function spawnIterationNode(iterData, scene, nodesRef, coreRef, fieldRef, particlesRef, onHUDUpdate, onLogEntry) {
  const { iteration, parameters, score, delta, status } = iterData;
  const pos      = mapParamsToPosition(parameters, score, iteration);
  const startPos = pos.clone().multiplyScalar(1.5);
  const col      = scoreToColor(score);

  const geo = new THREE.SphereGeometry(0.18 + score * 0.22, 16, 16);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 }, uAge:   { value: 0 },
      uScore: { value: score }, uColor: { value: col }, uHover: { value: 0 },
    },
    vertexShader: `varying vec3 vNormal;void main(){vNormal=normalMatrix*normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      varying vec3 vNormal;
      uniform float uTime;uniform float uAge;uniform float uScore;uniform vec3 uColor;uniform float uHover;
      void main(){
        vec3 n=normalize(vNormal);
        float rim=pow(1.-abs(dot(n,vec3(0.,0.,1.))),1.8);
        float pulse=.85+.15*sin(uTime*4.+uScore*6.28);
        float decay=max(.1,1.-uAge*.012);
        float hb=1.+uHover*.8;
        vec3 color=uColor*(.7+rim*.3)*pulse*hb;
        gl_FragColor=vec4(color,(.5+rim*.5)*decay*hb);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(startPos);
  scene.add(mesh);

  // Halo
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.45 + score * 0.35, 12, 12),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.04 + score * 0.06, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  mesh.add(halo);

  // Trail from previous node
  let trailLine = null;
  const prev = nodesRef.current[nodesRef.current.length - 1];
  if (prev) {
    const trailGeo = new THREE.BufferGeometry().setFromPoints([prev.mesh.position.clone(), startPos.clone()]);
    trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(trailLine);
  }

  const node = { mesh, trailLine, data: iterData, targetPos: pos.clone(), startPos, age: 0, travelT: 0, orbitPhase: Math.random() * Math.PI * 2, orbitRadius: (1 - score) * 0.15 + 0.03 };
  nodesRef.current.push(node);

  // Evict oldest
  if (nodesRef.current.length > MAX_NODES) {
    const old = nodesRef.current.shift();
    scene.remove(old.mesh);
    old.mesh.geometry.dispose();
    old.mesh.material.dispose();
    if (old.trailLine) { scene.remove(old.trailLine); old.trailLine.geometry.dispose(); }
  }

  // Sync score uniforms
  if (coreRef.current)     coreRef.current.material.uniforms.uScore.value     = score;
  if (fieldRef.current)    fieldRef.current.material.uniforms.uBestScore.value = score;
  if (particlesRef.current) particlesRef.current.material.uniforms.uBestScore.value = score;

  // Update HUD state
  onHUDUpdate({
    score,
    ph:   parameters.pH,
    temp: parameters.temperature,
    iter: iteration,
    statusText: score > 0.85 ? 'Convergence Detected' : score > 0.6 ? 'Exploitation Mode' : 'Exploration Phase',
  });
  onLogEntry({ iteration, parameters, score, delta, status });
}

// ─── React component ──────────────────────────────────────────
export default function OptimizerViz({ iterations }) {
  const containerRef     = useRef(null);
  const sceneRef         = useRef(null);
  const rendererRef      = useRef(null);
  const cameraRef        = useRef(null);
  const clockRef         = useRef(null);
  const animFrameRef     = useRef(null);
  const fieldRef         = useRef(null);
  const coreRef          = useRef(null);
  const particlesRef     = useRef(null);
  const ringsRef         = useRef([]);
  const nodesRef         = useRef([]);
  const cameraAngleRef   = useRef(0);
  const processedRef     = useRef(0);

  const [hud, setHud]       = useState({ score: 0, ph: null, temp: null, iter: 0, statusText: 'Awaiting Iterations' });
  const [log, setLog]       = useState([]);

  // ── Initialize Three.js scene ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000810, 0.045);
    sceneRef.current = scene;

    const clock = new THREE.Clock();
    clockRef.current = clock;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping    = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 200);
    camera.position.set(14, 8, 18);
    camera.lookAt(ATTRACTOR_POS);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0x000810, 2));
    const key = new THREE.PointLight(0x4af0c4, 3, 30);
    key.position.set(0, 5, 0);
    scene.add(key);

    fieldRef.current    = buildEnergyField(scene);
    coreRef.current     = buildAttractorCore(scene);
    ringsRef.current    = buildConstraintRings(scene);
    particlesRef.current = buildParticleField(scene);

    const onResize = () => {
      if (!el || !renderer.domElement.parentNode) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t  = clock.getElapsedTime();

      cameraAngleRef.current += 0.016 * dt;
      const ang = cameraAngleRef.current;
      camera.position.lerp(new THREE.Vector3(Math.cos(ang) * 22, 8 + Math.sin(ang * 0.4) * 3, Math.sin(ang) * 22), 0.004);
      camera.lookAt(ATTRACTOR_POS);

      if (fieldRef.current)     fieldRef.current.material.uniforms.uTime.value = t;
      if (coreRef.current) {
        coreRef.current.rotation.y = t * 0.35;
        coreRef.current.rotation.z = t * 0.18;
        coreRef.current.material.uniforms.uTime.value = t;
        coreRef.current.scale.setScalar(1 + 0.04 * Math.sin(t * 3));
      }
      ringsRef.current.forEach((r, i) => {
        r.rotation.y = t * (0.08 + i * 0.04);
        r.rotation.x = Math.sin(t * 0.12) * 0.6 + (i === 0 ? 0.4 : -0.6);
      });
      if (particlesRef.current) {
        particlesRef.current.material.uniforms.uTime.value = t;
        particlesRef.current.rotation.y = t * 0.012;
      }
      nodesRef.current.forEach(node => {
        node.age += dt;
        if (node.travelT < 1) {
          node.travelT = Math.min(1, node.travelT + dt * 1.2);
          const ease = 1 - Math.pow(1 - node.travelT, 3);
          node.mesh.position.lerpVectors(node.startPos, node.targetPos, ease);
        } else {
          const or = node.orbitRadius, op = node.orbitPhase + t * 0.6;
          node.mesh.position.set(
            node.targetPos.x + Math.cos(op) * or,
            node.targetPos.y + Math.sin(op * 0.7) * or * 0.5,
            node.targetPos.z + Math.sin(op) * or,
          );
        }
        if (node.trailLine) {
          const pts = node.trailLine.geometry.attributes.position;
          pts.setXYZ(1, node.mesh.position.x, node.mesh.position.y, node.mesh.position.z);
          pts.needsUpdate = true;
          node.trailLine.material.opacity = Math.max(0, 0.35 * (1 - node.age * 0.008));
        }
        node.mesh.material.uniforms.uTime.value = t;
        node.mesh.material.uniforms.uAge.value  = node.age;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // ── Feed new iterations ──
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const newItems = iterations.slice(processedRef.current);
    let prevScore = processedRef.current > 0
      ? Math.min(1, (iterations[processedRef.current - 1]?.yield_pct ?? 0) / 100)
      : 0;

    newItems.forEach((iter, offset) => {
      const score = Math.min(1, Math.max(0, (iter.yield_pct ?? 0) / 100));
      const delta = score - prevScore;
      prevScore   = score;

      spawnIterationNode(
        {
          iteration:  iter.iteration ?? (processedRef.current + offset + 1),
          parameters: { pH: parsePH(iter.pH_range), temperature: iter.temperature_C ?? 90 },
          score,
          delta,
          status: iter.status ?? null,
        },
        scene, nodesRef, coreRef, fieldRef, particlesRef,
        (newHud) => setHud(newHud),
        (entry)  => setLog(prev => [entry, ...prev].slice(0, 12)),
      );
    });
    processedRef.current = iterations.length;
  }, [iterations]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: 420, borderRadius: 12, overflow: 'hidden', background: '#000810' }}>
      {/* Three.js canvas target */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Scanlines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)' }} />

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 50%,transparent 50%,rgba(0,0,0,0.65) 100%)' }} />

      {/* ── Bottom-left metrics ── */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {[
          { label: 'YIELD %', val: hud.score > 0 ? (hud.score * 100).toFixed(1) + '%' : '0.0%', pct: hud.score * 100 },
          { label: 'pH',          val: hud.ph   != null ? Number(hud.ph).toFixed(1)   : '—', pct: hud.ph   != null ? ((hud.ph - 1) / 13) * 100   : 0 },
          { label: 'TEMP °C',     val: hud.temp != null ? Math.round(hud.temp)         : '—', pct: hud.temp != null ? ((hud.temp - 20) / 80) * 100 : 0 },
        ].map(({ label, val, pct }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', color: 'rgba(74,240,196,0.55)', width: 76 }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#4af0c4', minWidth: 44 }}>{val}</span>
            <div style={{ width: 100, height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: 'linear-gradient(90deg,#0d7a5f,#4af0c4)', boxShadow: '0 0 6px #4af0c4', transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', color: 'rgba(74,240,196,0.55)', width: 76 }}>ITERATION</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#4af0c4' }}>{hud.iter}</span>
        </div>
      </div>

      {/* ── Top-right iteration log ── */}
      {log.length > 0 && (
        <div style={{ position: 'absolute', top: 16, right: 16, width: 210, pointerEvents: 'none' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.28em', color: 'rgba(255,255,255,0.28)', textAlign: 'right', marginBottom: 6, textTransform: 'uppercase' }}>Iteration History</p>
          {log.map((entry, i) => {
            const scoreColor  = entry.score > 0.75 ? '#4af0c4' : entry.score > 0.5 ? '#7fbfff' : '#8899aa';
            const deltaColor  = (entry.delta ?? 0) > 0 ? '#4af0c4' : '#ff6b8a';
            const statusColor = entry.status === 'converged' ? '#a78bfa'
              : entry.status === 'improved'  ? '#4af0c4'
              : entry.status === 'violation' ? '#ff6b8a'
              : 'rgba(255,255,255,0.35)';
            return (
              <div key={entry.iteration} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: Math.max(0.15, 1 - i * 0.08) }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'rgba(255,255,255,0.3)' }}>#{String(entry.iteration).padStart(2, '0')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: statusColor }}>{entry.status ?? '—'}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: scoreColor }}>{(entry.score * 100).toFixed(1)}%</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: deltaColor }}>
                  {(entry.delta ?? 0) > 0 ? '+' : ''}{((entry.delta ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom-center status ── */}
      <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4af0c4', boxShadow: '0 0 0 0 rgba(74,240,196,0.4)', animation: 'pulse 1.8s ease infinite' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'rgba(74,240,196,0.6)', textTransform: 'uppercase' }}>{hud.statusText}</span>
      </div>

      {/* ── Bottom-right legend ── */}
      <div style={{ position: 'absolute', bottom: 20, right: 16, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', pointerEvents: 'none' }}>
        {[
          { label: 'Optimal Basin',    color: '#4af0c4' },
          { label: 'Exploration',      color: '#3a7bd5' },
          { label: 'Constraint Field', color: '#ff4d6d' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{label}</span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}` }} />
          </div>
        ))}
      </div>

      {/* ── Empty state overlay ── */}
      {iterations.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, pointerEvents: 'none' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(74,240,196,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Energy Field Initialized</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>Awaiting optimizer telemetry...</p>
        </div>
      )}
    </div>
  );
}
