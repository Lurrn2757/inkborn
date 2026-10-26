/* INKBORN creative asset — see ASSETS-LICENSE.md */

export const CHAMBER_PERFORMANCE = {
  awakeningSeconds: 6.2,
  endingSeconds: 3,
  idleBob: 5,
  idleBreath: .012,
  idleTilt: .012,
  hitRecoil: 15,
  attackTravel: 42,
} as const;

/** Original engraved alchemist's chamber. Coordinates describe a 1000 × 760 composition. */
export function paintChamber(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.scale(width / 1000, height / 760);
  const wash = ctx.createLinearGradient(0, 0, 0, 760);
  wash.addColorStop(0, '#15121c');
  wash.addColorStop(.6, '#17151c');
  wash.addColorStop(1, '#100f15');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 1000, 760);

  const light = ctx.createRadialGradient(500, 330, 20, 500, 330, 430);
  light.addColorStop(0, '#756b4933');
  light.addColorStop(.55, '#44404715');
  light.addColorStop(1, '#100f1500');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, 1000, 760);
  // A layered pointed arch and recessed stonework frame the living ink.
  for (let i = 0; i < 5; i++) {
    const inset = i * 22;
    ctx.beginPath();
    ctx.moveTo(148 + inset, 590);
    ctx.lineTo(148 + inset, 274);
    ctx.bezierCurveTo(148 + inset, 174, 342, 52 + inset * .35, 500, 10 + inset * .62);
    ctx.bezierCurveTo(658, 52 + inset * .35, 852 - inset, 174, 852 - inset, 274);
    ctx.lineTo(852 - inset, 590);
    ctx.strokeStyle = i % 2 ? '#bd985719' : '#ede3cd0a';
    ctx.lineWidth = i === 0 ? 9 : 1;
    ctx.stroke();
  }
  // Slender ribs, candle niches and low pillars.
  for (const x of [76, 120, 880, 924]) {
    ctx.fillStyle = '#0c0b11a8';
    ctx.fillRect(x - 14, 115, 28, 520);
    ctx.strokeStyle = '#bd98571b';
    ctx.strokeRect(x - 16, 115, 32, 520);
    for (const y of [150, 510, 617]) {
      ctx.fillStyle = '#302a2d';
      ctx.fillRect(x - 22, y, 44, 7);
    }
  }
  for (const x of [196, 804]) {
    ctx.fillStyle = '#bd985733';
    ctx.fillRect(x - 2, 343, 4, 106);
    ctx.fillRect(x - 16, 447, 32, 4);
    ctx.fillStyle = '#d9c8a5';
    ctx.fillRect(x - 4, 324, 8, 33);
    const glow = ctx.createRadialGradient(x, 316, 0, x, 316, 91);
    glow.addColorStop(0, '#dca66d42');
    glow.addColorStop(1, '#dca66d00');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 91, 225, 182, 182);
    ctx.beginPath();
    ctx.ellipse(x, 316, 3, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f6d5a6';
    ctx.fill();
  }
  // The ground plane is deliberately quiet beneath the engraved summoning seal.
  const floor = ctx.createLinearGradient(0, 500, 0, 760);
  floor.addColorStop(0, '#100f1500');
  floor.addColorStop(1, '#282029');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 500, 1000, 260);
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(500 + i * 38, 482);
    ctx.lineTo(500 + i * 185, 760);
    ctx.strokeStyle = '#d9c8a509';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const y of [552, 600, 677, 757]) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y);
    ctx.strokeStyle = '#d9c8a509'; ctx.stroke();
  }
  ctx.save();
  ctx.translate(500, 575);
  ctx.scale(1, .32);
  const ringGlow = ctx.createRadialGradient(0, 0, 40, 0, 0, 370);
  ringGlow.addColorStop(0, '#bd98570b');
  ringGlow.addColorStop(.78, '#bd98571c');
  ringGlow.addColorStop(1, '#bd985700');
  ctx.fillStyle = ringGlow;
  ctx.beginPath(); ctx.arc(0, 0, 370, 0, Math.PI * 2); ctx.fill();
  for (const radius of [245, 267, 315, 323, 349]) {
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = radius === 315 ? '#bd985766' : '#bd985730';
    ctx.lineWidth = radius === 315 ? 2 : 1;
    ctx.stroke();
  }
  for (let i = 0; i < 36; i++) {
    const a = i * Math.PI / 18;
    ctx.save(); ctx.rotate(a);
    ctx.strokeStyle = '#bd985748';
    ctx.beginPath();
    ctx.moveTo(0, -273); ctx.lineTo(0, -299);
    ctx.moveTo(-6, -285); ctx.lineTo(6, -285);
    if (i % 3 === 0) { ctx.moveTo(-8, -294); ctx.lineTo(0, -306); ctx.lineTo(8, -294); }
    ctx.stroke(); ctx.restore();
  }
  for (const angle of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) {
    ctx.save(); ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -232); ctx.lineTo(201, 116); ctx.lineTo(-201, 116); ctx.closePath();
    ctx.strokeStyle = '#bd98571b'; ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  // Sparse dust is fixed in the architecture; moving motes belong to the renderer.
  for (let i = 0; i < 78; i++) {
    const x = ((i * 347 + 29) % 997);
    const y = ((i * 173 + 53) % 749);
    ctx.fillStyle = i % 4 === 0 ? '#bd985722' : '#ede3cd09';
    ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, 1);
  }
  const vignette = ctx.createRadialGradient(500, 360, 160, 500, 360, 630);
  vignette.addColorStop(0, '#100f1500');
  vignette.addColorStop(1, '#09080eb3');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, 1000, 760);
  ctx.restore();
}

/** The three released concepts close the summoning seal; the creature itself remains source ink. */
export function evaluateReleaseSeal(age: number, reducedMotion: boolean, style: 'dominant' | 'scarred' = 'dominant') {
  const progress = Math.max(0, Math.min(1, age / CHAMBER_PERFORMANCE.endingSeconds));
  const alpha = Math.sin(progress * Math.PI) * (style === 'dominant' ? .85 : .6);
  const radius = .55 + (reducedMotion ? 0 : progress * .45);
  const fragments = reducedMotion ? [] : Array.from({ length: style === 'dominant' ? 54 : 36 }, (_, index) => {
    const angle = index * 2.399963;
    const travel = .48 + progress * (.4 + index % 5 * .07);
    return { x: Math.cos(angle) * travel, y: Math.sin(angle) * travel - progress * .17, color: index % 4 === 0 ? 0x8ac8bd : 0xe2c38c };
  });
  return { alpha, radius, fragments };
}
