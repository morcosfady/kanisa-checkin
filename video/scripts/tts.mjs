// Voiceover per scene. ElevenLabs if ELEVENLABS_API_KEY is set, otherwise the offline Windows voice (placeholder quality).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const scenes = JSON.parse(fs.readFileSync("scenes.json", "utf8"));
const OUT = path.resolve("raw/audio");
fs.mkdirSync(OUT, { recursive: true });
const key = process.env.ELEVENLABS_API_KEY;
const voice = process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB"; // set your favourite calm voice id

for (const s of scenes) {
  const text = s.sentences.map((x) => x.en).join(" ");
  if (key) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.2 } }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
    fs.writeFileSync(path.join(OUT, `${s.id}.mp3`), Buffer.from(await res.arrayBuffer()));
  } else {
    const txt = path.join(OUT, `${s.id}.txt`);
    fs.writeFileSync(txt, text, "utf8");
    const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('Microsoft David Desktop'); $s.Rate = 0; $s.SetOutputToWaveFile('${path.join(OUT, s.id + ".wav")}'); $s.Speak([IO.File]::ReadAllText('${txt}')); $s.Dispose()`;
    execFileSync("powershell", ["-NoProfile", "-Command", ps]);
    fs.unlinkSync(txt);
  }
  console.log("voice", s.id);
}
