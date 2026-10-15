"""Natural neural voice per scene with exact word timings (used for the highlighted subtitles).
Free, no key. Voice: python scripts/tts_edge.py [voice]  (default en-US-AndrewMultilingualNeural)."""
import asyncio, json, sys, pathlib
import edge_tts

VOICE = sys.argv[1] if len(sys.argv) > 1 else "en-US-AndrewMultilingualNeural"
OUT = pathlib.Path("raw/audio")
OUT.mkdir(parents=True, exist_ok=True)
scenes = json.loads(pathlib.Path("scenes.json").read_text(encoding="utf8"))

async def one(s):
    text = " ".join(x["en"] for x in s["sentences"])
    comm = edge_tts.Communicate(text, VOICE, rate="+14%", pitch="+0Hz", boundary="WordBoundary")
    words, audio = [], bytearray()
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            words.append({"text": chunk["text"], "start": chunk["offset"] / 1e7, "end": (chunk["offset"] + chunk["duration"]) / 1e7})
    (OUT / f"{s['id']}.mp3").write_bytes(bytes(audio))
    (OUT / f"{s['id']}.words.json").write_text(json.dumps(words), encoding="utf8")
    print("voice", s["id"], len(words), "words")

async def main():
    for s in scenes:
        await one(s)

asyncio.run(main())
