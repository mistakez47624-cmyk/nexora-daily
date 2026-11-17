
import { useEffect, useRef, useState } from "react";

export function AtmospherePlayer() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(35);

  const audioRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const gainRef = useRef<GainNode | null>(null);

  function stopSound() {
    nodesRef.current.forEach((node) => {
      try {
        if ("stop" in node && typeof node.stop === "function") {
          node.stop();
        }
        node.disconnect();
      } catch {}
    });

    nodesRef.current = [];

    audioRef.current?.close();
    audioRef.current = null;
    gainRef.current = null;

    setPlaying(false);
  }

  async function startSound() {
    if (playing) {
      stopSound();
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    audioRef.current = ctx;

    await ctx.resume();

    const master = ctx.createGain();
    master.gain.value = volume / 100 * 0.12;
    master.connect(ctx.destination);
    gainRef.current = master;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;
    filter.connect(master);

    const frequencies = [55, 82.4, 110, 164.8];

    frequencies.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const layer = ctx.createGain();

      oscillator.type = index === 1 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index % 2 === 0 ? -4 : 4;

      layer.gain.value = index === 3 ? 0.08 : 0.2;

      oscillator.connect(layer);
      layer.connect(filter);

      oscillator.start();

      nodesRef.current.push(oscillator, layer);
    });

    // Slow, gentle cosmic breathing effect
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    lfo.frequency.value = 0.045;
    lfoGain.gain.value = 0.012;

    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();

    nodesRef.current.push(lfo, lfoGain, filter);
    setPlaying(true);
  }

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.setTargetAtTime(
        volume / 100 * 0.12,
        audioRef.current!.currentTime,
        0.15
      );
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      nodesRef.current.forEach((node) => {
        try {
          if ("stop" in node && typeof node.stop === "function") {
            node.stop();
          }
          node.disconnect();
        } catch {}
      });

      audioRef.current?.close();
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Deep Space</p>
          <p className="text-xs text-muted-foreground">
            {playing ? "Atmosphere active" : "Explore the silence"}
          </p>
        </div>

        <button
          onClick={startSound}
          className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:bg-white/10"
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>Volume</span>
          <span>{volume}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          className="w-full accent-violet-500"
          aria-label="Atmosphere volume"
        />
      </div>
    </div>
  );
}
