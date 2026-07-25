"use client";
import React, { useEffect, useRef } from "react";

interface ClapDetectorProps {
  onClap: () => void;
  enabled: boolean;
}

export function ClapDetector({ onClap, enabled }: ClapDetectorProps) {
  const onClapRef = useRef(onClap);
  useEffect(() => { onClapRef.current = onClap; }, [onClap]);

  useEffect(() => {
    if (!enabled) return;
    let audioCtx: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let stream: MediaStream;
    let clapCount = 0;
    let lastClapTime = 0;
    let animationFrameId: number;

    const initClapDetection = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.2;
        microphone = audioCtx.createMediaStreamSource(stream);
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const detectClap = () => {
          analyser.getByteFrequencyData(dataArray);
          // Calculate average energy in high frequencies
          let sum = 0;
          for (let i = 50; i < 100; i++) { sum += dataArray[i]; }
          const average = sum / 50;

          const now = Date.now();
          if (average > 150) { // Amplitude Threshold
            if (now - lastClapTime > 200 && now - lastClapTime < 800) {
              clapCount++;
              lastClapTime = now;
              if (clapCount === 1) { // Second clap detected
                clapCount = 0;
                onClapRef.current(); // Trigger wake up
              }
            } else if (now - lastClapTime >= 800) {
              clapCount = 0;
              lastClapTime = now;
            }
          }
          animationFrameId = requestAnimationFrame(detectClap);
        };
        detectClap();
      } catch (err) { console.warn("Clap detection microphone access denied or failed", err); }
    };

    initClapDetection();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioCtx) audioCtx.close();
    };
  }, [enabled]);

  return null; // Hidden component
}
