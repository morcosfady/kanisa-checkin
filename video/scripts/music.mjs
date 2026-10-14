// Original ambient pad + soft bell notes, generated here (no third-party music, nothing to license).
import fs from "node:fs";
const SR = 32000, LEN = 200; // seconds
const n = SR * LEN;
const data = new Float32Array(n);
const chords = [[110, 130.81, 164.81, 220], [87.31, 110, 130.81, 174.61], [98, 130.81, 164.81, 196], [98, 123.47, 146.83, 196]]; // Am F C G
const BAR = 8;
for (let t = 0; t < n; t++) {
  const sec = t / SR, bar = Math.floor(sec / BAR), ph = (sec % BAR) / BAR;
  const env = Math.min(1, ph * 6) * Math.min(1, (1 - ph) * 6); // soft attack and release per chord
  const ch = chords[bar % chords.length];
  let v = 0;
  for (const f of ch) v += Math.sin(2 * Math.PI * f * sec) * 0.5 + Math.sin(2 * Math.PI * f * 2.003 * sec) * 0.12;
  data[t] = (v / ch.length) * env * 0.5;
}
// gentle bell notes
const scale = [440, 523.25, 659.25, 783.99, 880];
for (let k = 0; k < LEN / 2; k++) {
  const start = Math.floor((k * 2 + 0.7 + (k % 3) * 0.4) * SR), f = scale[(k * 3 + (k >> 2)) % scale.length];
  for (let i = 0; i < SR * 2.2 && start + i < n; i++) {
    const e = Math.exp(-i / (SR * 0.7));
    data[start + i] += Math.sin(2 * Math.PI * f * (i / SR)) * e * 0.06;
  }
}
// fade in and out
for (let i = 0; i < SR * 3; i++) { data[i] *= i / (SR * 3); data[n - 1 - i] *= i / (SR * 3); }
const buf = Buffer.alloc(44 + n * 2);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(data[i] * 32767))), 44 + i * 2);
fs.mkdirSync("raw/audio", { recursive: true });
fs.writeFileSync("raw/audio/music.wav", buf);
console.log("music.wav", (buf.length / 1e6).toFixed(1), "MB");
