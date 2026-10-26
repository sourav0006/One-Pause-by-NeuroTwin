import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './Logo';
import { ArrowLeft, FastForward, CheckCircle2, Volume2 } from 'lucide-react';

export const COUNTDOWN_AUDIO_TRACKS: readonly string[] = [
  '/audio/clam-1.mp3',
  '/audio/calm-2.mp3',
  '/audio/calm-3.mp3',
];

export interface PauseCountdownProps {
  /** Total countdown duration in seconds (strictly 8 seconds: 8 to 0) */
  durationSeconds?: number;
  /** Callback fired when countdown completes */
  onComplete: () => void;
  /** Optional callback when user clicks Skip */
  onSkip?: () => void;
  /** Optional callback when user clicks Cancel */
  onCancel?: () => void;
  /** Optional list of audio tracks to randomly select from */
  audioTracks?: readonly string[];
  /** Optional volume between 0 and 1 (approx 25–35%, defaults to 0.30) */
  audioVolume?: number;
}

export const PauseCountdown: React.FC<PauseCountdownProps> = ({
  durationSeconds = 8,
  onComplete,
  onSkip,
  onCancel,
  audioTracks = COUNTDOWN_AUDIO_TRACKS,
  audioVolume = 0.3,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [phase, setPhase] = useState<'inhale' | 'exhale' | 'ready'>('inhale');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isAudioAutoplayBlocked, setIsAudioAutoplayBlocked] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const isCompletedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stably select one track once per countdown session so re-renders/Strict Mode use the same track
  const selectedTrackRef = useRef<string | null>(null);
  if (!selectedTrackRef.current && audioTracks.length > 0) {
    const randomIndex = Math.floor(Math.random() * audioTracks.length);
    selectedTrackRef.current = audioTracks[randomIndex];
  }

  // Keep onComplete ref up-to-date to prevent re-triggering completion effects on callback identity changes
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Stop and reset audio immediately
  const stopAndResetAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Safe catch for environments/browsers where pause/currentTime throws
      }
    }
    audioRef.current = null;
    setIsPlayingAudio(false);
  };

  // Play a randomly selected gentle audio track automatically during countdown
  useEffect(() => {
    if (durationSeconds <= 0 || audioTracks.length === 0 || typeof Audio === 'undefined') {
      return;
    }

    let isMounted = true;
    const selectedTrack = selectedTrackRef.current || audioTracks[0];

    let audio: HTMLAudioElement | null = null;
    try {
      audio = new Audio(selectedTrack);
      audio.preload = 'auto';
      audio.volume = Math.max(0, Math.min(1, audioVolume));
      audio.loop = false;
      audioRef.current = audio;

      // Clean up audio if file fails to load or decode
      audio.onerror = () => {
        if (isMounted) {
          stopAndResetAudio();
        }
      };

      // Attempt automatic unmuted playback immediately as countdown begins
      const playPromise = audio.play();
      if (playPromise !== undefined && typeof playPromise.catch === 'function') {
        playPromise
          .then(() => {
            if (isMounted) {
              setIsPlayingAudio(true);
              setIsAudioAutoplayBlocked(false);
            }
          })
          .catch((err) => {
            // AbortError occurs when playback is paused/interrupted during cleanup or skip;
            // it is NOT an autoplay policy rejection. Never flag autoplay as blocked on AbortError.
            if (err?.name === 'AbortError') {
              return;
            }
            console.debug('Countdown audio automatic playback prevented or rejected:', err);
            if (isMounted && !isCompletedRef.current) {
              setIsAudioAutoplayBlocked(true);
              setIsPlayingAudio(false);
            }
          });
      } else {
        if (isMounted) {
          setIsPlayingAudio(true);
          setIsAudioAutoplayBlocked(false);
        }
      }
    } catch (err) {
      console.debug('Failed to initialize countdown audio:', err);
      if (isMounted && !isCompletedRef.current) {
        setIsAudioAutoplayBlocked(true);
        setIsPlayingAudio(false);
      }
    }

    return () => {
      isMounted = false;
      // Stop and clean up on unmount (guarantees Strict Mode re-mounts do not leak playback)
      if (audio) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
      }
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, []);

  // Check user preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Dedicated countdown timer strictly from durationSeconds (8) down to 0
  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        // Pacing across 8 seconds:
        // 8 to 5 (first half): Inhale & Grounding
        // 4 to 1 (second half): Exhale & Creating Space
        // 0: Ready
        if (next > Math.floor(durationSeconds / 2)) {
          setPhase('inhale');
        } else if (next > 0) {
          setPhase('exhale');
        } else {
          setPhase('ready');
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [durationSeconds, secondsLeft]);

  // Trigger completion once countdown reaches 0
  useEffect(() => {
    if (secondsLeft === 0 && !isCompletedRef.current) {
      isCompletedRef.current = true;
      stopAndResetAudio();
      const timeout = setTimeout(() => {
        onCompleteRef.current();
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [secondsLeft]);

  // User-initiated sound enable fallback (when browser blocks autoplay)
  const handleEnableSound = () => {
    if (secondsLeft <= 0 || isCompletedRef.current) return;

    let audio = audioRef.current;
    if (!audio) {
      if (audioTracks.length === 0 || typeof Audio === 'undefined') return;
      const selectedTrack = selectedTrackRef.current || audioTracks[0];
      audio = new Audio(selectedTrack);
      audio.preload = 'auto';
      audio.volume = Math.max(0, Math.min(1, audioVolume));
      audio.loop = false;
      audioRef.current = audio;
      audio.onerror = () => {
        stopAndResetAudio();
      };
    }

    try {
      const playPromise = audio.play();
      if (playPromise !== undefined && typeof playPromise.catch === 'function') {
        playPromise
          .then(() => {
            setIsPlayingAudio(true);
            setIsAudioAutoplayBlocked(false);
          })
          .catch((err) => {
            console.debug('User-initiated audio playback prevented or failed:', err);
          });
      } else {
        setIsPlayingAudio(true);
        setIsAudioAutoplayBlocked(false);
      }
    } catch (err) {
      console.debug('Error calling audio.play():', err);
    }
  };

  const handleSkip = () => {
    stopAndResetAudio();
    setSecondsLeft(0);
    setPhase('ready');
    if (onSkip) {
      onSkip();
    } else if (!isCompletedRef.current) {
      isCompletedRef.current = true;
      onComplete();
    }
  };

  const handleCancel = () => {
    stopAndResetAudio();
    if (onCancel) {
      onCancel();
    }
  };

  // SVG circular progress calculation
  // Circumference for r=68 is 2 * PI * 68 = 427.2566
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.max(0, Math.min(1, secondsLeft / durationSeconds));
  const strokeDashoffset = circumference * (1 - progressRatio);

  // Calming guidance text based on countdown phase
  const getGuidanceText = () => {
    if (secondsLeft === 0) {
      return 'Welcome. Entering ONE PAUSE...';
    }
    if (secondsLeft > Math.floor(durationSeconds / 2)) {
      return 'Breathe in slowly... Notice your initial reaction.';
    }
    return 'Exhale gently... Giving yourself space before responding.';
  };

  return (
    <div
      role="region"
      aria-label="Cognitive Pause Countdown"
      className="flex flex-col items-center justify-center p-6 sm:p-8 space-y-6 text-center select-none"
    >
      {/* Visual Countdown & Breathing Ring */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Soft breathing pulse ring (respects reduced motion) */}
        {!prefersReducedMotion && (
          <div
            className={`absolute rounded-full border border-sage-200 transition-all duration-1000 ease-in-out ${
              phase === 'inhale'
                ? 'w-44 h-44 opacity-60 scale-105 bg-sage-50/40'
                : 'w-36 h-36 opacity-30 scale-95 bg-transparent'
            }`}
          />
        )}

        {/* Circular SVG Countdown Progress */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 transform"
          viewBox="0 0 160 160"
        >
          {/* Background Track Circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#ECE7DD"
            strokeWidth="5"
          />
          {/* Animated Progress Circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#648572"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={prefersReducedMotion ? '' : 'transition-all duration-1000 ease-linear'}
          />
        </svg>

        {/* Central Logo & Numerical Badge */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <Logo size={76} variant="badge" className="shadow-xs" />
          <div
            aria-live="polite"
            className="mt-2 text-xs font-mono font-semibold text-charcoal-700 bg-white/95 border border-paper-200 px-2.5 py-0.5 rounded-full shadow-xs"
          >
            {secondsLeft > 0 ? (
              <span>0:0{secondsLeft}</span>
            ) : (
              <span className="flex items-center gap-1 text-sage-800 font-sans text-[11px] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-sage-700" />
                <span>Ready</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Calming Philosophy & Guidance Message */}
      <div className="space-y-2 max-w-sm">
        <h3 className="font-serif text-xl sm:text-2xl font-medium text-charcoal-900 tracking-tight">
          Before you respond, <span className="italic text-sage-900">pause.</span>
        </h3>
        <p
          aria-live="polite"
          className="text-xs sm:text-sm text-charcoal-600 leading-relaxed min-h-[40px] flex items-center justify-center font-sans"
        >
          {getGuidanceText()}
        </p>
      </div>

      {/* User Agency Controls */}
      <div className="flex items-center justify-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-500 hover:text-charcoal-800 px-3 py-1.5 rounded-md hover:bg-paper-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}

        {isAudioAutoplayBlocked && !isPlayingAudio && secondsLeft > 0 && (
          <button
            type="button"
            onClick={handleEnableSound}
            className="inline-flex items-center gap-1.5 text-xs text-sage-800 hover:text-sage-900 font-medium px-3 py-1.5 rounded-md bg-sage-50 hover:bg-sage-100 transition-colors border border-sage-200"
            title="Enable countdown music"
            aria-label="Enable sound"
          >
            <Volume2 className="w-3.5 h-3.5 text-sage-700" />
            <span>Enable sound</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleSkip}
          className="inline-flex items-center gap-1 text-xs text-sage-800 hover:text-sage-900 font-medium px-3 py-1.5 rounded-md hover:bg-sage-50 transition-colors border border-transparent hover:border-sage-200"
          title="Skip the countdown and enter ONE PAUSE"
        >
          <span>Skip pause</span>
          <FastForward className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
