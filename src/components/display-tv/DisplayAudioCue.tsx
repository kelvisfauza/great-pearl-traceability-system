import { useEffect, useRef } from "react";
import type { CoffeeHeadline } from "@/components/display-tv/types";

interface DisplayAudioCueProps {
  slideId: string;
  enabled: boolean;
  headlines: CoffeeHeadline[];
}

const AFRICA_KEYWORDS = /(africa|uganda|ethiopia|kenya|tanzania|rwanda)/i;

const DisplayAudioCue = ({ slideId, enabled, headlines }: DisplayAudioCueProps) => {
  const lastSlideRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!enabled || lastSlideRef.current === slideId) return;
    lastSlideRef.current = slideId;

    const playPattern = async (tones: number[]) => {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;

      audioContextRef.current ??= new AudioContextClass();
      const context = audioContextRef.current;

      if (context.state === "suspended") {
        await context.resume().catch(() => undefined);
      }

      const start = context.currentTime + 0.02;

      tones.forEach((tone, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = tone;
        gain.gain.setValueAtTime(0.0001, start + index * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.04, start + index * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.18 + 0.16);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start + index * 0.18);
        oscillator.stop(start + index * 0.18 + 0.18);
      });
    };

    const speakHeadline = (text: string) => {
      if (!("speechSynthesis" in window) || !text) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 0.75;
      utterance.lang = "en-US";

      timeoutRef.current = window.setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 700);
    };

    if (slideId === "news-global" || slideId === "news-africa") {
      void playPattern([784, 988]);
      const relevantHeadline = slideId === "news-africa"
        ? headlines.find((headline) => headline.region === "africa" || AFRICA_KEYWORDS.test(`${headline.title} ${headline.source}`))
        : headlines.find((headline) => headline.region !== "africa");

      if (relevantHeadline) {
        const prefix = slideId === "news-africa" ? "Africa coffee news. " : "Coffee market news. ";
        speakHeadline(`${prefix}${relevantHeadline.title}`);
      }
      return;
    }

    if (["pulse", "upside", "downside"].includes(slideId)) {
      void playPattern([523.25, 659.25]);
    }
  }, [enabled, headlines, slideId]);

  return null;
};

export default DisplayAudioCue;
