// Shared protein toolkit for the hero and research animations: build Cα traces from real
// secondary-structure geometry (α-helices, β-strands, loops) and draw them as cartoon ribbons.
// Units are ångström. Exposes window.Protein.
window.Protein = (function () {
  // ---- small 3D vector helpers
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => mul(a, 1 / (len(a) || 1));
  const rotAxis = (v, k, a) => {                       // Rodrigues rotation of v about unit axis k
    const c = Math.cos(a), s = Math.sin(a), kv = cross(k, v), kd = dot(k, v) * (1 - c);
    return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd];
  };
  const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  // ---- builders
  const perp = d => { const a = Math.abs(d[1]) < .9 ? [0, 1, 0] : [1, 0, 0], u = norm(cross(d, a)); return [u, cross(d, u)]; };
  function helix(start, dir, n) {                       // 2.3 Å radius, 1.5 Å rise, 100° per residue
    dir = norm(dir); const [u, v] = perp(dir), pts = [];
    for (let i = 0; i < n; i++) {
      const th = i * 1.745;
      pts.push(add(add(start, mul(dir, 1.5 * i)), add(mul(u, 2.3 * Math.cos(th)), mul(v, 2.3 * Math.sin(th)))));
    }
    return { ss: 'H', pts, dir };
  }
  function strand(start, dir, n, normal) {              // 3.3 Å rise with the characteristic pleat
    dir = norm(dir); const pts = [];
    for (let i = 0; i < n; i++) pts.push(add(add(start, mul(dir, 3.3 * i)), mul(normal, i % 2 ? .9 : -.9)));
    return { ss: 'E', pts, dir };
  }
  function loop(a, ta, b, tb) {                         // cubic Bézier between two element ends
    const d = len(sub(b, a)), k = Math.max(3, d * .45), c1 = add(a, mul(ta, k)), c2 = sub(b, mul(tb, k));
    const n = Math.max(2, Math.round(d / 3.8) - 1), pts = [];
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), u = 1 - t;
      pts.push([0, 1, 2].map(j => u * u * u * a[j] + 3 * u * u * t * c1[j] + 3 * u * t * t * c2[j] + t * t * t * b[j]));
    }
    return { ss: 'L', pts };
  }
  function chain(elements) {                            // elements -> residues [{p, ss}] with loops between
    const res = [];
    elements.forEach((el, i) => {
      if (i) {
        const prev = elements[i - 1];
        loop(prev.pts[prev.pts.length - 1], prev.dir, el.pts[0], el.dir).pts.forEach(p => res.push({ p, ss: 'L' }));
      }
      el.pts.forEach((p, j) => res.push({ p, ss: el.ss, head: el.ss === 'E' && j === el.pts.length - 2 }));
    });
    return res;
  }
  const centroid = r => mul(r.reduce((s, x) => add(s, x.p), [0, 0, 0]), 1 / r.length);
  const recenter = r => { const c = centroid(r); r.forEach(x => x.p = sub(x.p, c)); return r; };

  // ---- look
  const SUB = 5, P = 120, WIDTH = { H: 2.7, E: 3.6, L: .95 };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (c, k = 1, a = 1) => `rgba(${c[0] * k | 0},${c[1] * k | 0},${c[2] * k | 0},${a})`;
  const sprite = c => {                                 // soft blob used for the translucent surface
    const el = document.createElement('canvas'); el.width = el.height = 64;
    const g = el.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${c},1)`); gr.addColorStop(.55, `rgba(${c},.35)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return el;
  };
  // Perspective projection of camera-space points: returns [screenX, screenY, scale].
  const projector = (cx, cy, S) => q => { const f = P / (P + q[2]); return [cx + q[0] * S * f, cy + q[1] * S * f, f]; };

  // Catmull-Rom through camera-space Cα, SUB samples per residue. foldAt(t) in [0,1] optionally
  // blends the ribbon width from loop-thin (0) to full secondary-structure width (1).
  function spline(cam, owner, foldAt) {
    const out = [], n = cam.length;
    const sample = (q, ss, t, w) => ({ q, ss, t, w: foldAt ? WIDTH.L + (w - WIDTH.L) * foldAt(t) : w });
    for (let i = 0; i < n - 1; i++) {
      const p0 = cam[Math.max(i - 1, 0)], p1 = cam[i], p2 = cam[i + 1], p3 = cam[Math.min(i + 2, n - 1)];
      const a = owner[i], b = owner[i + 1], ss = a.ss === b.ss ? a.ss : 'L';
      for (let k = 0; k < SUB; k++) {
        const t = k / SUB, t2 = t * t, t3 = t2 * t;
        const q = [0, 1, 2].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3));
        out.push(sample(q, ss, (i + t) / (n - 1), a.head ? 6.6 * (1 - .93 * t) : WIDTH[ss]));
      }
    }
    out.push(sample(cam[n - 1], owner[n - 1].ss, 1, WIDTH[owner[n - 1].ss]));
    return out;
  }

  // Ribbon segments ready to paint. col is [startRGB, endRGB] or a function t -> RGB.
  function segments(cam, res, col, proj, S, foldAt) {
    const pts = spline(cam, res, foldAt).map(sm => ({ ...sm, s: proj(sm.q) })), segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], z = (a.q[2] + b.q[2]) / 2;
      segs.push({
        a: a.s, b: b.s, z, w: (a.w + b.w) / 2 * S * (a.s[2] + b.s[2]) / 2,
        c: typeof col === 'function' ? col(a.t) : mix(col[0], col[1], a.t), k: clamp(.86 - z * .02, .3, 1)
      });
    }
    return segs;
  }
  // Paint segments far-to-near so overlapping ribbons occlude correctly.
  function paint(ctx, segs) {
    segs.sort((p, q) => q.z - p.z);
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const { a, b, w, c, k } of segs) {
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.lineWidth = w; ctx.strokeStyle = rgb(c, k); ctx.stroke();
      if (w > 3) {                                      // specular streak gives the ribbon its roundness
        const o = w * .2;
        ctx.beginPath(); ctx.moveTo(a[0] - o, a[1] - o); ctx.lineTo(b[0] - o, b[1] - o);
        ctx.lineWidth = w * .34; ctx.strokeStyle = `rgba(255,255,255,${.3 * k * k})`; ctx.stroke();
      }
    }
  }

  return { add, sub, mul, dot, cross, len, norm, rotAxis, rotY, clamp, ease, helix, strand, loop, chain, centroid, recenter, mix, rgb, sprite, projector, segments, paint, WIDTH };
})();
