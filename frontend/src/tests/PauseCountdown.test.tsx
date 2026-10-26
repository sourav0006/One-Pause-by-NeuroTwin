import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { PauseCountdown, COUNTDOWN_AUDIO_TRACKS } from '../components/common/PauseCountdown';
import { WelcomePage, INITIAL_PAUSE_SESSION_KEY } from '../pages/WelcomePage';
import { SituationEntryPage } from '../pages/SituationEntryPage';
import { apiClient } from '../api/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    apiClient: {
      post: vi.fn(),
      get: vi.fn(),
    },
  };
});

describe('PauseCountdown Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders countdown timer starting at 8 seconds with calming philosophy and circular progress', async () => {
    const onComplete = vi.fn();
    render(
      <PauseCountdown
        durationSeconds={8}
        onComplete={onComplete}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/Before you respond,/i)).toBeInTheDocument();
    expect(screen.getByText('pause.')).toBeInTheDocument();
    expect(screen.getByText('0:08')).toBeInTheDocument();
    expect(screen.getByText(/Breathe in slowly/i)).toBeInTheDocument();
  });

  it('transitions breath guidance through inhale (8-5s), exhale (4-1s), and ready (0s) phases', async () => {
    const onComplete = vi.fn();
    render(
      <PauseCountdown
        durationSeconds={8}
        onComplete={onComplete}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Initial phase at 8s: Inhale
    expect(screen.getByText(/Breathe in slowly/i)).toBeInTheDocument();

    // Advance 4 seconds (down to 4s) -> Exhale phase
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('0:04')).toBeInTheDocument();
    expect(screen.getByText(/Exhale gently/i)).toBeInTheDocument();

    // Advance remaining 4 seconds (down to 0s) -> Ready phase
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText(/Welcome. Entering ONE PAUSE/i)).toBeInTheDocument();

    // Transition delay
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('allows user to skip countdown via Skip pause button', async () => {
    const onSkip = vi.fn();
    render(
      <PauseCountdown
        durationSeconds={8}
        onComplete={vi.fn()}
        onSkip={onSkip}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    const skipBtn = screen.getByRole('button', { name: /Skip pause/i });
    fireEvent.click(skipBtn);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

describe('PauseCountdown Audio Playback', () => {
  let mockAudioInstances: any[] = [];
  const originalAudio = window.Audio;

  class MockAudio {
    src: string;
    volume: number = 1;
    loop: boolean = false;
    currentTime: number = 0;
    play = vi.fn().mockResolvedValue(undefined);
    pause = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    onerror: ((error: any) => void) | null = null;

    constructor(src?: string) {
      this.src = src || '';
      mockAudioInstances.push(this);
    }
  }

  beforeEach(() => {
    vi.useFakeTimers();
    mockAudioInstances = [];
    window.Audio = MockAudio as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.Audio = originalAudio;
  });

  it('contains the exact three audio filenames from public/audio/', () => {
    expect(COUNTDOWN_AUDIO_TRACKS).toEqual([
      '/audio/clam-1.mp3',
      '/audio/calm-2.mp3',
      '/audio/calm-3.mp3',
    ]);
  });

  it('randomly selects a track from the three audio files and initiates playback at ~30% volume without looping', async () => {
    const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.4); // index 1: calm-2.mp3
    render(<PauseCountdown durationSeconds={8} onComplete={vi.fn()} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockAudioInstances).toHaveLength(1);
    const audio = mockAudioInstances[0];
    expect(audio.src).toBe('/audio/calm-2.mp3');
    expect(audio.volume).toBeCloseTo(0.3, 2);
    expect(audio.loop).toBe(false);
    expect(audio.play).toHaveBeenCalledTimes(1);

    mathRandomSpy.mockRestore();
  });

  it('selects first track when Math.random returns 0 and third track when near 1', async () => {
    const randomSpy = vi.spyOn(Math, 'random');

    randomSpy.mockReturnValue(0);
    const { unmount: unmount1 } = render(<PauseCountdown durationSeconds={8} onComplete={vi.fn()} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockAudioInstances[0].src).toBe('/audio/clam-1.mp3');
    unmount1();

    randomSpy.mockReturnValue(0.99);
    const { unmount: unmount2 } = render(<PauseCountdown durationSeconds={8} onComplete={vi.fn()} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockAudioInstances[1].src).toBe('/audio/calm-3.mp3');
    unmount2();

    randomSpy.mockRestore();
  });

  it('handles audio.play() promise rejection gracefully without disrupting countdown progression', async () => {
    // Simulate browser autoplay policy blocking playback
    const rejectedPlay = vi.fn().mockRejectedValue(new Error('NotAllowedError: play() failed'));
    class RejectingAudio extends MockAudio {
      play = rejectedPlay;
    }
    window.Audio = RejectingAudio as any;

    const onComplete = vi.fn();
    render(<PauseCountdown durationSeconds={8} onComplete={onComplete} />);

    expect(rejectedPlay).toHaveBeenCalledTimes(1);

    // Fast-forward countdown 8 seconds
    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getByText('Ready')).toBeInTheDocument();

    // Fast-forward completion delay (500ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('stops and resets audio immediately when 8-second countdown finishes', async () => {
    const onComplete = vi.fn();
    render(<PauseCountdown durationSeconds={8} onComplete={onComplete} />);

    await act(async () => {
      await Promise.resolve();
    });

    const audio = mockAudioInstances[0];
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.pause).not.toHaveBeenCalled();

    // Advance 8 seconds to reach 0s
    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(audio.currentTime).toBe(0);
  });

  it('stops and resets audio immediately when Skip Pause is clicked', async () => {
    const onSkip = vi.fn();
    render(<PauseCountdown durationSeconds={8} onComplete={vi.fn()} onSkip={onSkip} />);

    await act(async () => {
      await Promise.resolve();
    });

    const audio = mockAudioInstances[0];
    expect(audio.pause).not.toHaveBeenCalled();

    const skipBtn = screen.getByRole('button', { name: /Skip pause/i });
    fireEvent.click(skipBtn);

    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(audio.currentTime).toBe(0);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('stops and resets audio when component unmounts before countdown finishes', async () => {
    const { unmount } = render(<PauseCountdown durationSeconds={8} onComplete={vi.fn()} />);

    await act(async () => {
      await Promise.resolve();
    });

    const audio = mockAudioInstances[0];
    expect(audio.pause).not.toHaveBeenCalled();

    unmount();

    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(audio.currentTime).toBe(0);
  });

  it('handles audio error event without breaking or delaying the countdown', async () => {
    const onComplete = vi.fn();
    render(<PauseCountdown durationSeconds={8} onComplete={onComplete} />);

    await act(async () => {
      await Promise.resolve();
    });

    const audio = mockAudioInstances[0];
    // Trigger error event on audio element
    if (audio.onerror) {
      act(() => {
        audio.onerror(new Event('error'));
      });
    }

    // Countdown advances 8 seconds
    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getByText('Ready')).toBeInTheDocument();

    // Transition delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('displays Enable sound fallback control when autoplay is blocked and starts playback on user click', async () => {
    let playCallCount = 0;
    const playMock = vi.fn().mockImplementation(() => {
      playCallCount++;
      if (playCallCount === 1) {
        // First automatic attempt: blocked by browser policy
        return Promise.reject(new Error('NotAllowedError: play() failed'));
      }
      // Second attempt from user interaction: succeeds
      return Promise.resolve();
    });

    class AutoplayBlockedAudio extends MockAudio {
      play = playMock;
    }
    window.Audio = AutoplayBlockedAudio as any;

    render(<PauseCountdown durationSeconds={8} onComplete={vi.fn()} />);

    // Allow promise rejection to flush
    await act(async () => {
      await Promise.resolve();
    });

    // An unobtrusive "Enable sound" button is displayed
    const enableSoundBtn = screen.getByRole('button', { name: /Enable sound/i });
    expect(enableSoundBtn).toBeInTheDocument();

    // Advance 3 seconds of the countdown (down to 5s)
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('0:05')).toBeInTheDocument();

    // User clicks "Enable sound" directly
    await act(async () => {
      fireEvent.click(enableSoundBtn);
      await Promise.resolve();
    });

    // Audio playback was initiated directly from the user interaction
    expect(playMock).toHaveBeenCalledTimes(2);
    // Button is now hidden since sound is playing
    expect(screen.queryByRole('button', { name: /Enable sound/i })).not.toBeInTheDocument();

    // Countdown does NOT restart; still at 0:05 and continues normally
    expect(screen.getByText('0:05')).toBeInTheDocument();

    // Advance remaining 5 seconds to 0s
    const audio = mockAudioInstances[0];
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(audio.currentTime).toBe(0);
  });

  it('stops user-enabled audio immediately if user clicks Skip Pause', async () => {
    let playCallCount = 0;
    const playMock = vi.fn().mockImplementation(() => {
      playCallCount++;
      if (playCallCount === 1) {
        return Promise.reject(new Error('NotAllowedError'));
      }
      return Promise.resolve();
    });

    class AutoplayBlockedAudio extends MockAudio {
      play = playMock;
    }
    window.Audio = AutoplayBlockedAudio as any;

    const onSkip = vi.fn();
    render(<PauseCountdown durationSeconds={8} onComplete={vi.fn()} onSkip={onSkip} />);

    await act(async () => {
      await Promise.resolve();
    });

    const enableSoundBtn = screen.getByRole('button', { name: /Enable sound/i });
    await act(async () => {
      fireEvent.click(enableSoundBtn);
      await Promise.resolve();
    });

    const audio = mockAudioInstances[0];
    expect(audio.pause).not.toHaveBeenCalled();

    // User clicks Skip Pause
    const skipBtn = screen.getByRole('button', { name: /Skip pause/i });
    fireEvent.click(skipBtn);

    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(audio.currentTime).toBe(0);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('plays unmuted audio automatically when browser permits it without asking for user interaction', async () => {
    const playSuccessMock = vi.fn().mockResolvedValue(undefined);
    class PermittedAudio extends MockAudio {
      play = playSuccessMock;
    }
    window.Audio = PermittedAudio as any;

    render(<PauseCountdown durationSeconds={8} onComplete={vi.fn()} />);

    await act(async () => {
      await Promise.resolve();
    });

    // Automatic playback was initiated immediately
    expect(playSuccessMock).toHaveBeenCalledTimes(1);

    // No "Enable sound" button is rendered since playback succeeded
    expect(screen.queryByRole('button', { name: /Enable sound/i })).not.toBeInTheDocument();

    // Volume is set around ~30% and not muted
    const audio = mockAudioInstances[0];
    expect(audio.volume).toBeCloseTo(0.3, 2);
    expect(audio.loop).toBe(false);
  });

  it('does not display Enable sound button when playback error is an AbortError from interruption', async () => {
    const abortError = new Error('The play() request was interrupted by a call to pause()');
    abortError.name = 'AbortError';
    const playAbortMock = vi.fn().mockRejectedValue(abortError);

    class AbortedAudio extends MockAudio {
      play = playAbortMock;
    }
    window.Audio = AbortedAudio as any;

    render(<PauseCountdown durationSeconds={8} onComplete={vi.fn()} />);

    await act(async () => {
      await Promise.resolve();
    });

    // An AbortError must not be treated as an autoplay policy block
    expect(screen.queryByRole('button', { name: /Enable sound/i })).not.toBeInTheDocument();
  });
});

describe('Initial-Entry Flow (WelcomePage) & Session State', () => {
  beforeEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('shows PauseCountdown immediately when user first opens the app, and reveals homepage upon completion', async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <WelcomePage />
        </BrowserRouter>
      </AuthProvider>
    );

    // Initial 8-second countdown is shown immediately before homepage
    expect(screen.getByRole('region', { name: /Cognitive Pause Countdown/i })).toBeInTheDocument();
    expect(screen.getByText('0:08')).toBeInTheDocument();
    expect(screen.getByText(/Before you respond,/i)).toBeInTheDocument();

    // Homepage content is NOT visible yet
    expect(screen.queryByText(/Show, Don't Lecture/i)).not.toBeInTheDocument();

    // User clicks Skip pause (or waits for timer)
    const skipBtn = screen.getByRole('button', { name: /Skip pause/i });
    fireEvent.click(skipBtn);

    // Homepage is now revealed
    await waitFor(() => {
      expect(screen.getByText(/Show, Don't Lecture/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/ONE PAUSE is an AI-assisted reflective tool/i)).toBeInTheDocument();
    expect(sessionStorage.getItem(INITIAL_PAUSE_SESSION_KEY)).toBe('true');
  });

  it('does not repeat countdown on subsequent visits to the homepage in the same session', () => {
    // Simulate user having completed initial pause in this session
    sessionStorage.setItem(INITIAL_PAUSE_SESSION_KEY, 'true');

    render(
      <AuthProvider>
        <BrowserRouter>
          <WelcomePage />
        </BrowserRouter>
      </AuthProvider>
    );

    // Homepage is shown immediately without countdown
    expect(screen.queryByRole('region', { name: /Cognitive Pause Countdown/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Show, Don't Lecture/i)).toBeInTheDocument();
  });
});

describe('Situation Submission Flow', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not show countdown on situation submission; proceeds directly to analysis transition', async () => {
    const apiPromise = new Promise(() => {});
    (apiClient.post as any).mockReturnValue(apiPromise);

    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    const demoBtn = screen.getByRole('button', { name: /Fill Demo Scenario: Workload & Priorities/i });
    fireEvent.click(demoBtn);

    const submitBtn = screen.getByRole('button', { name: /Continue to Reflection Questions/i });
    fireEvent.click(submitBtn);

    // BrainToMapTransition is displayed, NOT the 8-second countdown
    expect(screen.queryByRole('region', { name: /Cognitive Pause Countdown/i })).not.toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });
});
