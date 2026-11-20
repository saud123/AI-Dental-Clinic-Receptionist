import * as React from "react";
import { Volume2, VolumeX, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatBubbleProps {
  sender: "bot" | "patient" | "system" | "doctor";
  content: string;
  timestamp?: string;
  isVoice?: boolean;
  isPlaying?: boolean;
  onPlayVoice?: () => void;
  onPlayAudio?: () => void;
  voiceDisabled?: boolean;
  voiceTooltip?: string;
  className?: string;
}

export function ChatBubble({
  sender,
  content,
  timestamp,
  isVoice,
  isPlaying,
  onPlayVoice,
  onPlayAudio,
  voiceDisabled = false,
  voiceTooltip,
  className,
}: ChatBubbleProps) {
  const handlePlay = onPlayAudio || onPlayVoice;

  if (sender === "system") {
    return (
      <div className={cn("flex flex-col items-center justify-center my-3 text-center", className)}>
        <span className="text-caption text-ink-muted bg-neutral-gray px-3 py-1 rounded-pill border border-border-default text-xs">
          {content}
        </span>
        {timestamp && (
          <span className="text-[10px] text-text-muted mt-1">
            {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    );
  }

  const isPatient = sender === "patient";

  return (
    <div
      className={cn(
        "flex flex-col mb-4 max-w-[80%]",
        isPatient ? "ml-auto items-end" : "mr-auto items-start",
        className
      )}
    >
      <div
        className={cn(
          "px-4 py-3 text-sm relative group leading-relaxed",
          isPatient
            ? "bg-gradient-to-br from-teal-50 to-teal-100 text-navy border border-teal-200 shadow-sm rounded-[14px_14px_4px_14px]"
            : "bg-white shadow-sm border border-gray-100 text-navy rounded-[14px_14px_14px_4px]"
        )}
      >
        <div className="whitespace-pre-wrap">{content}</div>

        {!isPatient && handlePlay && (
          <button
            type="button"
            onClick={handlePlay}
            disabled={voiceDisabled}
            title={voiceTooltip || (isPlaying ? "Stop audio" : "Listen to response")}
            aria-label="Play audio"
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:text-navy font-semibold transition-colors",
              voiceDisabled && "opacity-40 cursor-not-allowed",
              isPlaying && "animate-pulse text-navy"
            )}
          >
            {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Playing..." : "Audio"}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-1 px-1">
        {timestamp && (
          <span className="text-[11px] text-text-muted">
            {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        {isVoice && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-accent bg-mint-soft px-1.5 py-0.2 rounded-pill font-medium">
            <Mic className="w-2.5 h-2.5" /> Voice
          </span>
        )}
      </div>
    </div>
  );
}
