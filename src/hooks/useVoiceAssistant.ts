import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = any;

function getRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/**
 * Voice interaction for the Company Assistant:
 * - listen(): speech-to-text via the browser Web Speech API
 * - speak(): reads assistant replies aloud (can be toggled off)
 */
export function useVoiceAssistant() {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  // Spoken replies are on by default — the assistant answers with voice too.
  const [voiceReplies, setVoiceReplies] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const onDoneRef = useRef<((text: string) => void) | null>(null);

  const supported = !!getRecognitionCtor();
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  }, []);

  const startListening = useCallback((onDone?: (text: string) => void) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return false;
    if (recognitionRef.current) stopListening();

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    finalRef.current = "";
    onDoneRef.current = onDone ?? null;
    setTranscript("");

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalRef.current += chunk;
        else interim += chunk;
      }
      setTranscript((finalRef.current + " " + interim).trim());
    };
    rec.onerror = () => { setListening(false); };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const text = finalRef.current.trim();
      if (text) onDoneRef.current?.(text);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
      return true;
    } catch {
      setListening(false);
      return false;
    }
  }, [stopListening]);

  const stopSpeaking = useCallback(() => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [speechSupported]);

  const speak = useCallback((text: string) => {
    if (!speechSupported || !text) return;
    // Strip markdown noise so it reads naturally
    const clean = text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[*_#>`|]/g, " ")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 900);
    if (!clean) return;

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "en-US";
    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [speechSupported]);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    supported,
    speechSupported,
    listening,
    speaking,
    transcript,
    voiceReplies,
    setVoiceReplies,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
