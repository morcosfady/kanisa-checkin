# Amoinee explainer video

Everything is in this folder; the app code is untouched.

1. `node scripts/record.mjs` : screen recordings of the app in demo mode (start the app first, see the top of the file).
2. `node scripts/images.mjs` : animated-style pictures with Nano Banana (needs `GEMINI_API_KEY`). `node scripts/images.mjs clips` makes the Veo clip.
3. `python scripts/tts_edge.py` : natural voiceover per scene with word timings (needs `pip install edge-tts`, no key).
4. `node scripts/music.mjs` : original music bed.
5. `node scripts/prepare.mjs` : timing, subtitles (`out/amoinee-en.srt`, `out/amoinee-ar.srt`), storyboard, Google Vids pack.
6. `node scripts/render.mjs` (`full`, `vertical`, `still`) : final files in `out/`.

`scenes.json` is the single source for words, prompts and timing. Pictures that are missing show a clear placeholder, so the video always renders; just drop the finished file into `raw/images/` and run steps 5 and 6 again.
