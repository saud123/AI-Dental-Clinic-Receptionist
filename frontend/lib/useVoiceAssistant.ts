
import {
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";

export function useVoiceAssistant(sessionId: number | null) {
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Microphone and audio references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Recording data
  const audioChunksRef = useRef<Blob[]>([]);

  // Voice activity detection
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const speechFramesRef = useRef(0);

  // Conversation control
  const isActiveRef = useRef(false);
  const isStartingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isDisposedRef = useRef(false);

  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackUrlRef = useRef<string | null>(null);

  // --------------------------------------------------
  // 1. Clear silence timer
  // --------------------------------------------------

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  // --------------------------------------------------
  // 2. Clear VAD animation loop
  // --------------------------------------------------

  const clearVADLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // --------------------------------------------------
  // 3. Play AI audio response
  // --------------------------------------------------

  const playAudio = useCallback(async (blob: Blob): Promise<void> => {
    // Remove previous playback URL
    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
    }

    const url = URL.createObjectURL(blob);
    playbackUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;

    return new Promise<void>((resolve) => {
      let finished = false;

      const cleanup = () => {
        if (finished) return;
        finished = true;

        audio.onended = null;
        audio.onerror = null;
        audio.onabort = null;

        audioRef.current = null;

        if (playbackUrlRef.current === url) {
          URL.revokeObjectURL(url);
          playbackUrlRef.current = null;
        }

        resolve();
      };

      audio.onended = cleanup;
      audio.onerror = cleanup;
      audio.onabort = cleanup;

      audio.play().catch((err) => {
        console.error("Audio playback failed:", err);
        cleanup();
      });
    });
  }, []);

  // --------------------------------------------------
  // 4. Stop current recording (NOT microphone)
  // --------------------------------------------------

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    clearVADLoop();

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  }, [clearSilenceTimer, clearVADLoop]);

  // --------------------------------------------------
  // 5. Start recording a patient speaking turn
  // --------------------------------------------------

  const startRecording = useCallback(async () => {
    if (
      !sessionId ||
      !isActiveRef.current ||
      isStartingRef.current ||
      isProcessingRef.current
    ) {
      return;
    }

    // Prevent duplicate recording initialization
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      return;
    }

    isStartingRef.current = true;

    try {
      setError(null);

      let stream = streamRef.current;

      // Request microphone only once per call
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        // User may have ended the call while permission was pending
        if (!isActiveRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
      }

      // Create AudioContext only once
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as any).webkitAudioContext;

        const audioContext = new AudioContextClass();

        audioContextRef.current = audioContext;

        const source =
          audioContext.createMediaStreamSource(stream);

        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 512;

        analyserRef.current = analyser;

        source.connect(analyser);
      }

      // Browser may suspend AudioContext
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      if (!isActiveRef.current) return;

      // New recorder, same microphone stream
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      hasSpokenRef.current = false;
      speechFramesRef.current = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // --------------------------------------------------
      // 6. Recording stopped: send audio to backend
      // --------------------------------------------------

      mediaRecorder.onstop = async () => {
        clearSilenceTimer();
        clearVADLoop();

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        // If user never actually spoke, don't spam backend with ambient noise
        if (!hasSpokenRef.current || audioBlob.size < 1200) {
          if (isActiveRef.current) {
            startRecording();
          }
          return;
        }

        if (!isActiveRef.current) return;

        isProcessingRef.current = true;
        setIsProcessing(true);

        try {
          const formData = new FormData();

          formData.append(
            "audio",
            audioBlob,
            "recording.webm"
          );

          const res = await fetch(
            `/api/proxy/voice-chat/${sessionId}`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!res.ok) {
            throw new Error(
              `Voice chat failed: ${res.status}`
            );
          }

          console.log("User:", res.headers.get("X-User-Text"));
          console.log("AI:", res.headers.get("X-Bot-Text"));
          console.log("TTS:", res.headers.get("X-Provider"));

          const audioResponse = await res.blob();

          if (!isActiveRef.current) return;

          await playAudio(audioResponse);

        } catch (err: unknown) {
          console.error("Voice chat error:", err);

          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Something went wrong during voice chat.");
          }

        } finally {
          isProcessingRef.current = false;
          setIsProcessing(false);

          // Listen again after AI response
          if (isActiveRef.current) {
            startRecording();
          }
        }
      };

      // --------------------------------------------------
      // 7. Voice Activity Detection
      // --------------------------------------------------

      const checkSilence = () => {
        if (
          !isActiveRef.current ||
          !analyserRef.current ||
          mediaRecorder.state !== "recording"
        ) {
          animationFrameRef.current = null;
          return;
        }

        const analyser = analyserRef.current;

        const dataArray = new Uint8Array(
          analyser.frequencyBinCount
        );

        analyser.getByteFrequencyData(dataArray);

        let sum = 0;

        // Focus on selected vocal frequency bins (approx 300Hz - 3400Hz)
        for (let i = 2; i <= 45; i++) {
          sum += dataArray[i];
        }

        const average = sum / 44;

        // Speech detected (require vocal energy above room baseline across consecutive frames)
        if (average > 24) {
          speechFramesRef.current += 1;
          if (speechFramesRef.current >= 3) {
            hasSpokenRef.current = true;
            clearSilenceTimer();
          }
        } else if (hasSpokenRef.current && average < 18) {
          // Detect silence only AFTER verified speech has occurred
          speechFramesRef.current = 0;
          if (!silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              silenceTimeoutRef.current = null;

              if (
                mediaRecorder.state === "recording" &&
                isActiveRef.current
              ) {
                stopRecording();
              }
            }, 2200); // 2.2s natural pause threshold
          }
        }

        animationFrameRef.current =
          requestAnimationFrame(checkSilence);
      };

      // Start recording
      mediaRecorder.start();

      isStartingRef.current = false;

      checkSilence();

    } catch (err: unknown) {
      console.error("Microphone error:", err);

      if (isActiveRef.current) {
        setError("Please allow microphone access and try again.");
        isActiveRef.current = false;
        setIsActive(false);
      }

    } finally {
      isStartingRef.current = false;
    }
  }, [
    sessionId,
    clearSilenceTimer,
    clearVADLoop,
    stopRecording,
    playAudio,
  ]);

  // --------------------------------------------------
  // 8. Start complete voice conversation
  // --------------------------------------------------

  const start = useCallback(() => {
    if (!sessionId || isActiveRef.current) return;

    isDisposedRef.current = false;

    isActiveRef.current = true;

    setError(null);
    setIsActive(true);

    startRecording();
  }, [sessionId, startRecording]);

  // --------------------------------------------------
  // 9. End complete voice conversation
  // --------------------------------------------------

  const stop = useCallback(() => {
    isActiveRef.current = false;

    setIsActive(false);

    isStartingRef.current = false;

    stopRecording();

    // Stop microphone only when call ends
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    analyserRef.current = null;

    // Stop AI audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
    }

    audioChunksRef.current = [];
    hasSpokenRef.current = false;
  }, [stopRecording]);

  // --------------------------------------------------
  // 10. Manual Send (Push to Talk / Done Speaking)
  // --------------------------------------------------

  const sendNow = useCallback(() => {
    hasSpokenRef.current = true;
    stopRecording();
  }, [stopRecording]);

  // --------------------------------------------------
  // 11. Cleanup when component unmounts
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      isDisposedRef.current = true;
      stop();
    };
  }, [stop]);

  // --------------------------------------------------
  // 12. Return hook values
  // --------------------------------------------------

  return {
    isActive,
    isProcessing,
    error,
    start,
    stop,
    sendNow,
  };
}
