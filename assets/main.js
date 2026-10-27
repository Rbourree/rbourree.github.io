(() => {
  const motionOK = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;

  /* ---------- scroll helpers (live measurements, no cached offsets) ---------- */
  function onceVisible(el, fn, margin = "0px 0px -15% 0px") {
    new IntersectionObserver(([e], obs) => {
      if (e.isIntersecting) { obs.disconnect(); fn(); }
    }, { rootMargin: margin }).observe(el);
  }
  // Progress (0 → 1) of a sticky element through its taller track.
  function scrollStory(track, sticky, onProgress) {
    let queued = false;
    const update = () => {
      queued = false;
      const r = track.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(sticky).top) || 0;
      const range = r.height - sticky.offsetHeight;
      onProgress(range > 0 ? Math.min(1, Math.max(0, (top - r.top) / range)) : 0);
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    document.addEventListener("scroll", queue, { passive: true, capture: true });
    addEventListener("resize", queue);
    update();
    // Scroll position matching a given progress.
    return p => {
      const r = track.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(sticky).top) || 0;
      return scrollY + r.top - top + (r.height - sticky.offsetHeight) * p;
    };
  }

  /* ---------- toast ---------- */
  const toastEl = document.getElementById("toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 3200);
  }

  /* ---------- cursor ring ---------- */
  const ring = document.querySelector(".cursor");
  if (finePointer && motionOK) {
    let mx = -100, my = -100, rx = -100, ry = -100;
    addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; ring.classList.add("is-on"); });
    document.addEventListener("pointerleave", () => ring.classList.remove("is-on"));
    document.addEventListener("pointerover", e => ring.classList.toggle("is-hover", !!e.target.closest("a, button")));
    (function follow() {
      rx += (mx - rx) * .2; ry += (my - ry) * .2;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(follow);
    })();
  }

  /* ---------- split name ---------- */
  const letters = [];
  document.querySelectorAll("[data-split]").forEach(row => {
    const txt = row.textContent.trim();
    row.textContent = "";
    for (const c of txt) {
      const s = document.createElement("span");
      s.className = "ch"; s.textContent = c; s.setAttribute("aria-hidden", "true");
      row.appendChild(s); letters.push(s);
    }
  });
  if (finePointer && motionOK) {
    addEventListener("pointermove", e => {
      if (scrollY > innerHeight) return;
      for (const l of letters) {
        const r = l.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        const k = Math.max(0, 1 - d / 320);
        l.style.fontVariationSettings = `"wght" ${Math.round(600 + k * 200)}, "wdth" ${Math.round(100 - k * 22)}`;
        l.classList.toggle("is-near", k > .55);
      }
    });
  }

  /* ---------- agent swarm ---------- */
  const hero = document.querySelector(".hero");
  const cv = document.getElementById("swarm");
  const ctx = cv.getContext("2d");
  const LABELS = ["/grill-me", "/tdd", "/to-spec", "/code-review", "/to-tickets", "/implement", "/prototype", "/pr", "ADR", "/diagnosing-bugs"];
  const TAU = Math.PI * 2;
  let W = 0, H = 0, agents = [], running = true;
  const mouse = { x: 0, y: 0, active: false };

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn(n) {
    const start = agents.length;
    for (let i = 0; i < n; i++) {
      const idx = start + i;
      agents.push({
        x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
        a: Math.random() * TAU,
        r: 40 + Math.random() * Math.min(190, W * .18),
        sp: (.25 + Math.random() * .7) * (Math.random() < .5 ? -1 : 1),
        label: idx % 3 === 0 ? LABELS[(idx / 3 | 0) % LABELS.length] : null,
        s: 1.5 + Math.random() * 1.8
      });
    }
  }
  size();
  spawn(W < 600 ? 21 : 36);

  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = e.pointerType === "mouse";
  });
  hero.addEventListener("pointerleave", () => { mouse.active = false; });
  hero.addEventListener("pointerdown", e => {
    const r = hero.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    for (const a of agents) {
      const dx = a.x - px, dy = a.y - py, d = Math.hypot(dx, dy) || 1;
      const f = 22 * Math.max(.25, 1 - d / 500);
      a.vx += dx / d * f; a.vy += dy / d * f;
    }
  });

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const cx = mouse.active ? mouse.x : W * (W < 700 ? .5 : .74) + Math.cos(t / 2600) * 50;
    const cy = mouse.active ? mouse.y : H * (W < 700 ? .9 : .48) + Math.sin(t / 2100) * 30;
    for (const a of agents) {
      a.a += a.sp * .012;
      const tx = cx + Math.cos(a.a) * a.r, ty = cy + Math.sin(a.a) * a.r * .7;
      a.vx = (a.vx + (tx - a.x) * .005) * .93;
      a.vy = (a.vy + (ty - a.y) * .005) * .93;
      a.x += a.vx; a.y += a.vy;
    }
    // separation keeps labelled agents readable instead of piling up
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const p = agents[i], q = agents[j];
        const min = p.label && q.label ? 56 : 18;
        const dx = q.x - p.x, dy = (q.y - p.y) * (p.label && q.label ? 2.2 : 1), d = Math.hypot(dx, dy) || 1;
        if (d < min) {
          const f = (min - d) / min * .25;
          p.vx -= dx / d * f; p.vy -= dy / d * f;
          q.vx += dx / d * f; q.vy += dy / d * f;
        }
      }
    }
    // links between nearby agents
    ctx.lineWidth = 1;
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const p = agents[i], q = agents[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 90) {
          ctx.strokeStyle = `rgba(107,147,255,${(1 - d / 90) * .35})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
    // orchestration lines from the cursor to labelled agents
    if (mouse.active) {
      ctx.setLineDash([3, 5]);
      for (const a of agents) if (a.label) {
        ctx.strokeStyle = "rgba(255,159,67,.25)";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(a.x, a.y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    ctx.font = "600 10px 'JetBrains Mono', monospace";
    ctx.textBaseline = "middle";
    for (const a of agents) {
      if (a.label) {
        const w = ctx.measureText(a.label).width + 14;
        ctx.fillStyle = "rgba(17,20,29,.9)";
        ctx.strokeStyle = "#ff9f43";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(a.x - w / 2, a.y - 10, w, 20, 10); else ctx.rect(a.x - w / 2, a.y - 10, w, 20);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ff9f43";
        ctx.fillText(a.label, a.x - w / 2 + 7, a.y + .5);
      } else {
        ctx.fillStyle = "rgba(107,147,255,.85)";
        ctx.beginPath(); ctx.arc(a.x, a.y, a.s, 0, TAU); ctx.fill();
      }
    }
  }
  function loop(t) {
    if (running) draw(t);
    requestAnimationFrame(loop);
  }
  if (motionOK) {
    new IntersectionObserver(([e]) => { running = e.isIntersecting; }).observe(hero);
    requestAnimationFrame(loop);
  } else {
    for (let i = 0; i < 200; i++) draw(i * 16);
  }
  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { size(); if (!motionOK) draw(0); }, 120);
  });

  /* ---------- easter egg: type "claude" ---------- */
  let buffer = "";
  addEventListener("keydown", e => {
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-6);
    if (buffer === "claude") {
      spawn(36);
      toast(`Mode essaim : ${agents.length} agents au travail. Ils ne prennent pas de RTT.`);
      if (scrollY > innerHeight) scrollTo({ top: 0, behavior: motionOK ? "smooth" : "auto" });
    }
  });

  /* ---------- flow: request → product ---------- */
  const flow = document.getElementById("flow");
  const panels = [...flow.querySelectorAll(".panel")];
  const stepBtns = [...flow.querySelectorAll(".flow-steps button")];
  const testsPanel = flow.querySelector("[data-tests]");
  const bar = flow.querySelector(".flow-progress i");
  let current = -1;

  function setStep(i) {
    if (i === current) return;
    current = i;
    panels.forEach((p, k) => {
      p.classList.toggle("is-active", k === i);
      p.classList.toggle("is-past", k < i);
    });
    stepBtns.forEach((b, k) => {
      b.classList.toggle("is-active", k === i);
      b.classList.toggle("is-done", k < i);
      b.setAttribute("aria-current", k === i ? "step" : "false");
    });
    testsPanel.classList.toggle("run", i >= 4 && panels[4].classList.contains("is-active"));
  }

  const wideFlow = matchMedia("(min-width: 960px) and (min-height: 640px)");
  wideFlow.addEventListener("change", () => location.reload());
  if (motionOK && wideFlow.matches) {
    const STEPS = panels.length;
    flow.style.setProperty("--steps", STEPS);
    flow.classList.add("is-live");
    setStep(0);
    const scrollFor = scrollStory(flow, flow.querySelector(".flow-inner"), p => {
      setStep(Math.min(STEPS - 1, Math.floor(p * STEPS)));
      bar.style.transform = `scaleX(${p})`;
    });
    stepBtns.forEach((b, k) => b.addEventListener("click", () => {
      scrollTo({ top: scrollFor((k + .5) / STEPS), behavior: "smooth" });
    }));
  } else {
    new IntersectionObserver(([e], obs) => {
      if (e.isIntersecting) { testsPanel.classList.add("run"); obs.disconnect(); }
    }, { threshold: .6 }).observe(testsPanel);
  }

  document.querySelectorAll(".restore").forEach(b => b.addEventListener("click", () => {
    b.textContent = "Révoqué ✓"; b.classList.add("is-done");
    toast("Lien révoqué. Plus personne ne l’ouvrira.");
  }));

  /* ---------- terminal typing ---------- */
  const term = document.getElementById("term");
  if (motionOK) {
    const lines = [...term.querySelectorAll(".tl")];
    const texts = lines.map(l => l.innerHTML);
    lines.forEach(l => l.classList.add("is-hidden"));
    onceVisible(term, async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          l.classList.remove("is-hidden");
          if (l.classList.contains("cmd")) {
            const full = l.textContent;
            l.textContent = "";
            for (let c = 1; c <= full.length; c++) { l.textContent = full.slice(0, c); await wait(22); }
            await wait(180);
          } else {
            l.innerHTML = texts[i];
            await wait(l.classList.contains("ok") ? 260 : 140);
          }
        }
    }, "0px 0px -25% 0px");
  }


  /* ---------- career chart ---------- */
  const career = document.getElementById("career");
  const svg = document.getElementById("careerSvg");
  const stageEls = [...career.querySelectorAll(".stage")];
  const specEl = document.getElementById("spectrum");
  const NS = "http://www.w3.org/2000/svg";
  const Y0 = 2009, Y1 = 2026.8;
  let cum = 0;
  const stages = stageEls.map(el => {
    const skills = el.dataset.skills.split(",");
    const start = cum; cum += skills.length;
    el.querySelector(".stage-new").innerHTML =
      `<span>+${skills.length}</span>` + skills.map(k => `<span>${k}</span>`).join("");
    return { el, from: +el.dataset.from, skills, start, cum };
  });
  const TOTAL = cum;
  specEl.innerHTML = stages.flatMap(s => s.skills).map(k => `<span>${k}</span>`).join("");
  const chips = [...specEl.children];
  const X = y => 50 + (y - Y0) / (Y1 - Y0) * 900;
  const Y = c => 340 - c / 40 * 310;
  const mk = (tag, attrs, parent = svg) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n); return n;
  };
  const defs = mk("defs", {});
  const pat = mk("pattern", { id: "hatch", width: 8, height: 8, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  mk("rect", { width: 8, height: 8, fill: "rgba(255,159,67,.05)" }, pat);
  mk("line", { x1: 0, y1: 0, x2: 0, y2: 8, stroke: "rgba(255,159,67,.35)", "stroke-width": 1.5 }, pat);
  const clip = mk("clipPath", { id: "careerClip" }, defs);
  const clipRect = mk("rect", { x: 0, y: 0, width: 1000, height: 380 }, clip);
  for (let c = 0; c <= 30; c += 10) {
    mk("line", { class: "grid", x1: 50, x2: 950, y1: Y(c), y2: Y(c) });
    mk("text", { x: 40, y: Y(c) + 4, "text-anchor": "end" }).textContent = c;
  }
  mk("line", { class: "axis", x1: 50, x2: 950, y1: 340, y2: 340 });
  for (let y = 2010; y <= 2026; y += 2) {
    mk("line", { class: "axis", x1: X(y), x2: X(y), y1: 340, y2: 346 });
    mk("text", { x: X(y), y: 366, "text-anchor": "middle" }).textContent = y;
  }
  mk("text", { x: 50, y: 12 }).textContent = "compétences clés ↑";
  let d = `M${X(Y0)} ${Y(0)}`;
  stages.forEach(s => { d += ` L${X(s.from)} ${Y(s.start)} L${X(s.from)} ${Y(s.cum)}`; });
  d += ` L${X(Y1)} ${Y(TOTAL)}`;
  const g = mk("g", { "clip-path": "url(#careerClip)" });
  mk("path", { class: "area", d: d + ` L${X(Y1)} 340 L${X(Y0)} 340 Z` }, g);
  mk("path", { class: "step", d }, g);
  const scan = mk("line", { class: "scan", y1: 20, y2: 340 });
  const scanLabel = mk("text", { class: "scan-label", y: 30, "text-anchor": "middle" });
  const nodes = stages.map((s, i) => {
    const x = X(s.from), y = Y(s.cum);
    const n = mk("rect", { class: "nd", x: x - 7, y: y - 7, width: 14, height: 14, transform: `rotate(45 ${x} ${y})`, tabindex: 0 });
    const lbl = mk("text", { class: "nd-label", x: x + 12, y: y - 10 });
    lbl.textContent = s.el.querySelector(".stage-meta b").textContent;
    return { n, lbl };
  });

  let activeStage = -1;
  function renderCareer(f, live) {
    const i = Math.min(stages.length - 1, Math.floor(f));
    const frac = Math.min(1, f - i);
    const next = i < stages.length - 1 ? stages[i + 1].from : Y1;
    const year = live ? stages[i].from + frac * (next - stages[i].from) : Y1;
    const x = X(year);
    clipRect.setAttribute("width", x + 7);
    scan.setAttribute("x1", x); scan.setAttribute("x2", x);
    scan.style.display = live ? "" : "none";
    scanLabel.setAttribute("x", Math.min(930, Math.max(70, x)));
    scanLabel.textContent = live ? Math.floor(year) : "";
    if (!live) {
      nodes.forEach(({ n }) => n.classList.add("is-past"));
      chips.forEach(c => c.classList.add("is-on"));
      return;
    }
    if (i === activeStage) return;
    activeStage = i;
    nodes.forEach(({ n, lbl }, k) => {
      n.classList.toggle("is-past", k < i);
      n.classList.toggle("is-active", k === i);
      lbl.classList.toggle("is-active", k === i);
    });
    stageEls.forEach((el, k) => {
      el.classList.toggle("is-active", k === i);
      el.classList.toggle("is-past", k < i);
    });
    chips.forEach((c, k) => {
      c.classList.toggle("is-on", k < stages[i].cum);
      c.classList.toggle("is-new", k >= stages[i].start && k < stages[i].cum);
    });
  }

  const wideCareer = matchMedia("(min-width: 960px) and (min-height: 680px)");
  wideCareer.addEventListener("change", () => location.reload());
  if (motionOK && wideCareer.matches) {
    const N = stages.length;
    const track = document.createElement("div");
    track.style.height = `calc(100svh + ${N * 28}svh)`;
    career.before(track);
    track.appendChild(career);
    career.classList.add("is-live");
    renderCareer(0, true);
    const scrollFor = scrollStory(track, career, p => renderCareer(Math.min(N - .001, p * N), true));
    nodes.forEach(({ n }, k) => {
      const go = () => scrollTo({ top: scrollFor((k + .5) / N), behavior: "smooth" });
      n.addEventListener("click", go);
      n.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    });
  } else {
    renderCareer(stages.length - 1, false);
  }

  /* ---------- blueprint cursor reveal ---------- */
  const bp = document.querySelector(".blueprint");
  bp.addEventListener("pointermove", e => {
    const r = bp.getBoundingClientRect();
    bp.style.setProperty("--mx", e.clientX - r.left + "px");
    bp.style.setProperty("--my", e.clientY - r.top + "px");
  });

  /* ---------- scroll animations ---------- */
  if (motionOK) {
    document.querySelectorAll("[data-reveal]").forEach(el => {
      el.classList.add("is-pending");
      onceVisible(el, () => {
        el.classList.add("is-revealing");
        el.classList.remove("is-pending");
        setTimeout(() => el.classList.remove("is-revealing"), 1000);
      }, "0px 0px -10% 0px");
    });
    document.querySelectorAll(".count").forEach(el => {
      const to = +el.dataset.to;
      onceVisible(el, () => {
        const t0 = performance.now();
        (function tick(t) {
          const k = Math.min(1, (t - t0) / 1600);
          el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString("fr-FR");
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      });
    });
  }

  /* ---------- tilt cards ---------- */
  if (finePointer && motionOK) {
    document.querySelectorAll(".tilt").forEach(card => {
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--ry", (px - .5) * 12 + "deg");
        card.style.setProperty("--rx", (.5 - py) * 12 + "deg");
        card.style.setProperty("--gx", px * 100 + "%");
        card.style.setProperty("--gy", py * 100 + "%");
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- marquee driven by scroll velocity ---------- */
  const track = document.querySelector(".marquee-track");
  track.innerHTML += track.innerHTML;
  if (motionOK) {
    let x = 0, dir = -1, boost = 0, lastY = scrollY;
    (function tick() {
      const dy = scrollY - lastY; lastY = scrollY;
      if (dy) dir = dy > 0 ? -1 : 1;
      boost = Math.min(18, boost * .9 + Math.abs(dy) * .08);
      x += dir * (.6 + boost);
      const half = track.scrollWidth / 2;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translateX(${x}px)`;
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer && motionOK) {
    document.querySelectorAll(".magnetic").forEach(el => {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * .25}px, ${dy * .35}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- son's age, kept current from his birth date ---------- */
  document.querySelectorAll("[data-born]").forEach(el => {
    const born = new Date(el.dataset.born + "T00:00:00");
    const now = new Date();
    let months = (now.getFullYear() - born.getFullYear()) * 12 + now.getMonth() - born.getMonth();
    if (now.getDate() < born.getDate()) months--;
    if (months < 0) return;
    el.textContent = months < 24 ? `${months} mois` : `${Math.floor(months / 12)} ans`;
  });

  /* ---------- kindle progress ---------- */
  const kindle = document.querySelector(".kindle");
  if (motionOK) new IntersectionObserver(([e], obs) => {
    if (e.isIntersecting) { kindle.classList.add("is-in"); obs.disconnect(); }
  }, { threshold: .8 }).observe(kindle);

  /* ---------- copy email ---------- */
  const mail = document.getElementById("mail");
  const copied = document.getElementById("copied");
  mail.addEventListener("click", () => {
    const addr = "romain.bourree@gmail.com";
    const done = () => { copied.textContent = "Adresse copiée. À toi de jouer."; };
    const fallback = () => {
      const sel = getSelection(), range = document.createRange();
      range.selectNodeContents(document.querySelector(".mail-big")); sel.removeAllRanges(); sel.addRange(range);
      copied.textContent = "Adresse sélectionnée, il ne reste qu’à copier.";
    };
    try {
      navigator.clipboard.writeText(addr).then(done, fallback);
    } catch (err) { fallback(); }
  });

  /* ---------- active nav link ---------- */
  const links = [...document.querySelectorAll(".nav-links a")];
  const sections = links.map(a => document.querySelector(a.getAttribute("href")));
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach(s => s && navObserver.observe(s));

})();
