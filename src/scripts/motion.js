// Motion layer — WebGL fluid hero, custom cursor, magnetic buttons,
// headline line-reveal, scroll-velocity marquee.
// Every block is guarded: it no-ops on pages without its markup, on coarse
// pointers (touch), and when the user prefers reduced motion.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- Loading screen ---------- */
(function () {
  const loader = document.getElementById('loader');
  if (!loader) return;
  let seen = false;
  try { seen = !!sessionStorage.getItem('rtc-loaded'); } catch (e) {}
  if (seen) {
    loader.classList.add('gone'); // already shown this session
    return;
  }
  const MIN = reduce ? 300 : 1400; // let the animation play at least this long
  const started = performance.now();
  function dismiss() {
    const wait = Math.max(0, MIN - (performance.now() - started));
    setTimeout(() => {
      loader.classList.add('done');
      try { sessionStorage.setItem('rtc-loaded', '1'); } catch (e) {}
      loader.addEventListener('transitionend', () => loader.classList.add('gone'), { once: true });
      setTimeout(() => loader.classList.add('gone'), 900); // fallback
    }, wait);
  }
  if (document.readyState === 'complete') dismiss();
  else addEventListener('load', dismiss);
})();

/* ---------- Headline line reveal ---------- */
// .anim is added by JS so text stays visible without JS (crawlers/no-JS).
document.querySelectorAll('.reveal-lines').forEach((el) => {
  if (reduce) return;
  el.classList.add('anim');
  requestAnimationFrame(() => setTimeout(() => el.classList.add('in'), 80));
});

/* ---------- WebGL fluid background (light palette) ---------- */
const cv = document.getElementById('hero-fluid');
const gl = cv && (cv.getContext('webgl') || cv.getContext('experimental-webgl'));
if (cv && gl) {
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `
precision highp float;
uniform float u_time;uniform vec2 u_res;uniform vec2 u_mouse;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));vec2 u=f*f*(3.-2.*f);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*noise(p);p*=2.0;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res.xy;
  vec2 p=uv;p.x*=u_res.x/u_res.y;
  float t=u_time*0.05;
  vec2 m=(u_mouse/u_res-0.5);
  vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(p+2.0*q+vec2(1.7,9.2)+m*0.7),fbm(p+2.0*q+vec2(8.3,2.8)-m*0.7));
  float f=fbm(p+2.6*r+t*0.4);
  vec3 paper=vec3(0.961,0.965,0.980);
  vec3 blue=vec3(0.016,0.392,0.867);
  vec3 azure=vec3(0.224,0.573,1.0);
  vec3 lime=vec3(0.682,0.890,0.482);
  vec3 col=paper;
  col=mix(col,azure,smoothstep(0.35,0.95,f)*0.30);
  col=mix(col,blue,smoothstep(0.60,1.0,r.x)*0.22);
  col=mix(col,lime,smoothstep(0.86,1.0,q.y)*0.14);
  float d=distance(uv,u_mouse/u_res);
  col=mix(col,azure,0.12*smoothstep(0.42,0.0,d));
  col=mix(col,vec3(1.0),0.25*pow(1.0-distance(uv,vec2(0.5,0.7)),2.0));
  col+=(hash(gl_FragCoord.xy+u_time)-0.5)*0.012;
  gl_FragColor=vec4(col,1.0);
}`;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(prog, 'u_time');
  const uR = gl.getUniformLocation(prog, 'u_res');
  const uM = gl.getUniformLocation(prog, 'u_mouse');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  const host = cv.parentElement;
  const mouse = { x: 0, y: 0 };
  const tgt = { x: 0, y: 0 };
  function resize() {
    const r = host.getBoundingClientRect();
    cv.width = r.width * dpr;
    cv.height = r.height * dpr;
    gl.viewport(0, 0, cv.width, cv.height);
    mouse.x = tgt.x = cv.width / 2;
    mouse.y = tgt.y = cv.height / 2;
  }
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    tgt.x = (e.clientX - r.left) * dpr;
    tgt.y = (r.height - (e.clientY - r.top)) * dpr;
  });
  // Only render while the hero is on screen.
  let visible = true;
  new IntersectionObserver((es) => es.forEach((x) => (visible = x.isIntersecting))).observe(host);
  let start = null;
  function frame(ts) {
    if (start === null) start = ts;
    if (visible) {
      mouse.x += (tgt.x - mouse.x) * 0.06;
      mouse.y += (tgt.y - mouse.y) * 0.06;
      gl.uniform1f(uT, (ts - start) / 1000);
      gl.uniform2f(uR, cv.width, cv.height);
      gl.uniform2f(uM, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
  }
  if (!reduce) {
    requestAnimationFrame(frame);
  } else {
    // One static frame so the hero still gets the brand wash.
    requestAnimationFrame((ts) => {
      gl.uniform1f(uT, 0);
      gl.uniform2f(uR, cv.width, cv.height);
      gl.uniform2f(uM, cv.width / 2, cv.height / 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
  }
}

/* ---------- Custom cursor ---------- */
if (finePointer && !reduce) {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (dot && ring) {
    let mx = 0, my = 0, rx = 0, ry = 0, revealed = false;
    addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      if (!revealed) {
        // Reveal the custom cursor only once it has a real position.
        revealed = true;
        rx = mx; ry = my;
        document.body.classList.add('has-cursor');
      }
    });
    (function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, .svc-card').forEach((el) => {
      el.addEventListener('pointerenter', () => ring.classList.add('grow'));
      el.addEventListener('pointerleave', () => ring.classList.remove('grow'));
    });
  }
}

/* ---------- Magnetic buttons ---------- */
if (finePointer && !reduce) {
  document.querySelectorAll('.btn').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.2}px,${y * 0.25}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });
}

/* ---------- Scroll-velocity marquee ---------- */
// The strip drifts on its own; scrolling adds speed in the scroll direction.
const track = document.querySelector('.marquee-track');
if (track && !reduce) {
  let offset = 0;
  let vel = 0;
  let lastY = window.scrollY;
  addEventListener('scroll', () => {
    vel += (window.scrollY - lastY) * 0.06;
    lastY = window.scrollY;
  }, { passive: true });
  (function loop() {
    vel *= 0.92;                       // friction
    offset -= 0.5 + vel;               // base drift + scroll boost
    const half = track.scrollWidth / 2;
    if (half > 0) {
      offset = ((offset % half) + half) % half * -1; // wrap seamlessly
    }
    track.style.transform = `translateX(${offset}px)`;
    requestAnimationFrame(loop);
  })();
}
