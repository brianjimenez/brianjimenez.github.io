// Research animation: a designed protein folds from a random coil into a β-sheet packed with
// helices, collapsing N→C, while its amino-acid sequence lights up residue by residue.
// Built on the shared toolkit in protein.js.
(function () {
  const cv = document.getElementById('fold');
  if (!cv || !window.Protein) return;
  const { add, sub, mul, norm, len, rotAxis, rotY, clamp, ease, helix, strand, chain, recenter, mix, rgb, sprite, projector, segments, paint } = Protein;
  const ctx = cv.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Folded state: four antiparallel strands (a sheet in the y–z plane) with a helix on either face.
  const folded = recenter(chain([
    strand([0, -10, -7.2], [0, 1, 0], 7, [1, 0, 0]), strand([0, 10, -2.4], [0, -1, 0], 7, [1, 0, 0]),
    strand([0, -10, 2.4], [0, 1, 0], 7, [1, 0, 0]), strand([0, 10, 7.2], [0, -1, 0], 7, [1, 0, 0]),
    helix([9, -11, 4], [0, 1, 0], 15), helix([9, 12, -4], [0, -1, 0], 15),
    helix([-9, -11, 4], [0, 1, 0], 15)
  ]));
  const N = folded.length;

  // Unfolded state: a confined, persistent random walk with 3.8 Å steps (seeded, so it is stable).
  let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const coil = [];
  { let pos = [0, 0, 0], dir = norm([1, .3, -.4]);
    for (let i = 0; i < N; i++) {
      coil.push(pos);
      const pull = mul(norm(pos), -Math.pow(len(pos) / 30, 2) * .9);
      dir = norm(add(add(mul(dir, .7), mul([rnd() - .5, rnd() - .5, rnd() - .5], 1.5)), pull));
      pos = add(pos, mul(dir, 3.8));
    }
    const c = mul(coil.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / N);
    coil.forEach((p, i) => coil[i] = sub(p, c));
    const r = Math.max(...coil.map(len)), k = 36 / r;       // spread the coil to fill the panel
    coil.forEach((p, i) => coil[i] = mul(p, k));
  }

  // Sequence: residue letters drawn from pools typical for each secondary-structure type.
  const POOL = { H: 'AELKQRMAELK', E: 'VIYFTWVIVT', L: 'GPNDSGPDN' };
  const seq = folded.map(r => { const p = POOL[r.ss]; return p[Math.floor(rnd() * p.length)]; });

  const COL = t => t < .5 ? mix([255, 196, 104], [252, 238, 210], t * 2) : mix([252, 238, 210], [64, 214, 204], (t - .5) * 2);
  const SPR = sprite('255,206,130'), SPR2 = sprite('90,225,215');
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

  let W, H, dpr, running = true, raf = 0;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    if (still) draw(16 * .6);
  }
  new ResizeObserver(size).observe(cv);

  const T = 16;                                         // seconds per fold/unfold cycle
  const schedule = u => u < .08 ? 0 : u < .5 ? ease((u - .08) / .42) : u < .82 ? 1 : u < .95 ? 1 - ease((u - .82) / .13) : 0;
  const tilt = p => rotAxis(p, [1, 0, 0], .3);

  function draw(t) {
    const s = schedule((t % T) / T);
    // Residue i folds once the wave (sweeping N→C) reaches it; 0 = random coil, 1 = native.
    const fi = x => ease((s - .5 * (x / (N - 1))) / .5);
    const meanF = folded.reduce((m, _, i) => m + fi(i), 0) / N;
    // The camera eases in as the chain compacts, so the folded structure fills the panel.
    const spin = t * .3, S = Math.min(W, H * .84) / 92 * (1 + .85 * ease(meanF)), cx = W / 2, cy = H * .44;
    const proj = projector(cx, cy, S);
    const cam = folded.map((r, i) => {
      const f = fi(i), a = .2 + 1.5 * (1 - f), ph = t * 1.6 + i * 1.7;
      const p = add(mix(coil[i], r.p, f), [a * Math.sin(ph), a * Math.sin(ph * .8 + 2), a * Math.sin(ph * 1.2 + 4)]);
      return rotY(tilt(p), spin);
    });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);

    // translucent surface appears as the chain compacts
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .015 + .07 * meanF * meanF;
    cam.forEach((q, i) => {
      const [x, y, f] = proj(q), r = 6.4 * S * f;
      ctx.drawImage(i / N < .5 ? SPR : SPR2, x - r, y - r, 2 * r, 2 * r);
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    paint(ctx, segments(cam, folded, COL, proj, S, x => fi(x * (N - 1))));

    // sequence strip: each letter lights up in its ribbon colour once that residue has folded
    const M = Math.min(34, Math.floor(W / 12)), fs = Math.max(10, Math.min(15, W / (M * .72))), step = Math.min(W - 24, M * fs * .78) / M;
    ctx.font = `600 ${fs}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = H - Math.max(26, H * .075), x0 = W / 2 - step * (M - 1) / 2;
    ctx.fillStyle = 'rgba(147,160,184,.7)'; ctx.font = `500 ${Math.max(9, fs * .72)}px ${MONO}`;
    ctx.fillText('SEQUENCE → STRUCTURE', W / 2, y - fs * 1.7);
    ctx.font = `600 ${fs}px ${MONO}`;
    for (let j = 0; j < M; j++) {
      const i = Math.round(j / (M - 1) * (N - 1)), f = fi(i);
      ctx.fillStyle = f > .5 ? rgb(COL(i / (N - 1)), 1, .55 + .45 * f) : 'rgba(147,160,184,.45)';
      ctx.fillText(seq[i], x0 + j * step, y);
    }
  }

  function tick(ms) { raf = 0; draw(ms / 1000 + T * .1); if (running && !still) raf = requestAnimationFrame(tick); }
  const kick = () => { if (!raf && !still) raf = requestAnimationFrame(tick); };
  new IntersectionObserver(e => { running = e[0].isIntersecting; if (running) kick(); }).observe(cv);
  size(); kick();
})();
