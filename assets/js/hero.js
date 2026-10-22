// Hero animation: a ligand protein (teal) tumbles in, aligns with a receptor (amber), docks,
// lights up the contact interface, then releases. Built on the shared toolkit in protein.js.
(function () {
  const cv = document.getElementById('c');
  if (!cv || !window.Protein) return;
  const { add, sub, mul, len, norm, rotAxis, rotY, clamp, ease, helix, strand, chain, recenter, sprite, projector, segments, paint } = Protein;
  const ctx = cv.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Receptor: four-helix bundle with a three-stranded antiparallel sheet on one side.
  const receptor = recenter(chain([
    helix([-6, -12, -6], [0, 1, 0], 17), helix([6, 12, -6], [0, -1, 0], 17),
    helix([6, -12, 6], [0, 1, 0], 17), helix([-6, 12, 6], [0, -1, 0], 17),
    strand([-15, -10, -3], [0, 1, 0], 7, [1, 0, 0]), strand([-15, 10, 1.8], [0, -1, 0], 7, [1, 0, 0]),
    strand([-15, -10, 6.6], [0, 1, 0], 7, [1, 0, 0])
  ]));
  // Ligand: smaller three-helix bundle, tilted so its helices cross the receptor's at an angle.
  const ligand = recenter(chain([
    helix([0, -8, -5], [0, 1, 0], 11), helix([8, 8, 0], [0, -1, 0], 11), helix([0, -8, 5], [0, 1, 0], 11)
  ]));
  const tiltAxis = norm([.3, .2, 1]);
  ligand.forEach(x => x.p = rotAxis(x.p, tiltAxis, .5));

  // Dock: push the ligand along -x until its closest Cα is 6.2 Å from the receptor.
  const minDist = ofs => {
    let m = 1e9;
    for (const a of receptor) for (const b of ligand) m = Math.min(m, len(sub(a.p, add(b.p, ofs))));
    return m;
  };
  let dx = 70; while (dx > 0 && minDist([dx, 2, 0]) > 6.2) dx -= .25;
  const L0 = [dx, 2, 0], dockDir = norm(L0), mid = mul(L0, .5);
  // Interface: ligand residues with a receptor neighbour within 9 Å in the docked pose.
  const pairs = [];
  ligand.forEach((b, j) => {
    let best = -1, bd = 9;
    receptor.forEach((a, i) => { const d = len(sub(a.p, add(b.p, L0))); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) pairs.push([best, j]);
  });
  receptor.forEach(x => x.iface = false); ligand.forEach(x => x.iface = false);
  pairs.forEach(([i, j]) => { receptor[i].iface = true; ligand[j].iface = true; });

  const COL = { r: [[255, 214, 140], [226, 134, 44]], l: [[132, 246, 236], [30, 152, 162]] };
  const SPR = { r: sprite('255,190,100'), l: sprite('80,225,215'), i: sprite('255,236,200') };

  let W, H, dpr, S, cx, cy, wide, running = true, raf = 0;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; wide = W > 800;
    S = wide ? Math.min(W * .0056, H * .0105) : W * .0105;
    cx = W * (wide ? .77 : .5); cy = H * (wide ? .5 : .8);
    if (still) draw(22 * .56);
  }
  addEventListener('resize', size);

  const T = 22;                                         // seconds per dock/release cycle
  const schedule = u => u < .1 ? 0 : u < .42 ? ease((u - .1) / .32) : u < .7 ? 1 : u < .9 ? 1 - ease((u - .7) / .2) : 0;
  const baseRot = p => rotAxis(rotAxis(p, [1, 0, 0], .25), [0, 0, 1], -.5);   // dock axis runs diagonally
  const liftAxis = norm([.6, .8, .3]);

  function draw(t) {
    const u = (t % T) / T, s = schedule(u), g = clamp((s - .8) / .2, 0, 1);
    const spin = t * .22, far = (1 - s) * 18;
    const lift = (1 - s) * (2.3 + .5 * Math.sin(t * .8)) + (1 - s) * .1 * Math.sin(t * 6);
    const lc = add(L0, mul(dockDir, far));
    const place = (p, i, k) => {                        // complex frame -> camera space, with thermal jitter
      const j = [Math.sin(t * 1.7 + i * 1.3 + k), Math.sin(t * 1.3 + i * 2.1 + k), Math.sin(t * 1.9 + i * .7 + k)];
      return rotY(baseRot(sub(add(p, mul(j, .22)), mid)), spin);
    };
    const recCam = receptor.map((r, i) => place(r.p, i, 0));
    const ligCam = ligand.map((r, i) => place(add(lc, rotAxis(r.p, liftAxis, lift)), i, 5));
    const proj = projector(cx, cy, S);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);

    // translucent surface: additive soft blobs around every Cα
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .075;
    [[recCam, SPR.r], [ligCam, SPR.l]].forEach(([cam, spr]) => cam.forEach(q => {
      const [x, y, f] = proj(q), r = 6.4 * S * f; ctx.drawImage(spr, x - r, y - r, 2 * r, 2 * r);
    }));
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    paint(ctx, segments(recCam, receptor, COL.r, proj, S).concat(segments(ligCam, ligand, COL.l, proj, S)));

    // interface: contact lines and glowing residues once docked
    if (g > 0) {
      ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.strokeStyle = `rgba(255,240,210,${.6 * g})`;
      ctx.beginPath();
      pairs.forEach(([i, j]) => { const a = proj(recCam[i]), b = proj(ligCam[j]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); });
      ctx.stroke(); ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .28 * g * (.8 + .2 * Math.sin(t * 3));
      [[recCam, receptor], [ligCam, ligand]].forEach(([cam, res]) => cam.forEach((q, i) => {
        if (!res[i].iface) return;
        const [x, y, f] = proj(q), r = 3.6 * S * f; ctx.drawImage(SPR.i, x - r, y - r, 2 * r, 2 * r);
      }));
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  function tick(ms) { raf = 0; draw(ms / 1000 + 4); if (running && !still) raf = requestAnimationFrame(tick); }
  const kick = () => { if (!raf && !still) raf = requestAnimationFrame(tick); };
  new IntersectionObserver(e => { running = e[0].isIntersecting; if (running) kick(); }).observe(cv);
  size(); kick();
})();
