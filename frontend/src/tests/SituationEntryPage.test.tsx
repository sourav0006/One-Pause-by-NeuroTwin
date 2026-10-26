import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SituationEntryPage } from '../pages/SituationEntryPage';
import { apiClient } from '../api/client';

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

describe('SituationEntryPage Component — Phase 2 Journey', () => {
  it('renders situation entry form with character counters and guidelines', () => {
    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Describe the Situation')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/My manager assigned an urgent project/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Privacy & AI Disclosure:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to Reflection Questions/i })).toBeInTheDocument();
  });

  it('populates realistic workplace scenario and optional context when Fill Demo Scenario clicked', () => {
    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    const demoBtn = screen.getByRole('button', { name: /Fill Demo Scenario: Workload & Priorities/i });
    fireEvent.click(demoBtn);

    const textarea = screen.getByDisplayValue(/My manager asked me to take on an urgent project/i);
    expect(textarea).toBeInTheDocument();

    const contextArea = screen.getByDisplayValue(/Maintaining a reputation for reliable delivery without burnout/i);
    expect(contextArea).toBeInTheDocument();
  });

  it('guides user through the three behavioural questions one at a time and submits answers', async () => {
    (apiClient.post as any).mockImplementation((url: string) => {
      if (url === '/reflections/questions') {
        return Promise.resolve({
          data: {
            questions: [
              {
                id: 'q1',
                theme: 'Immediate Focus & Trigger',
                question: 'What shaped your immediate reaction most?',
                options: ['Urgent deadline', 'Tone of request', 'None of these'],
                placeholder: 'e.g. Sudden urgency...',
              },
              {
                id: 'q2',
                theme: 'Influencing Factors',
                question: 'Might personal or workload factors have influenced you?',
                options: ['Heavy workload', 'Fatigue', 'None of these'],
                placeholder: 'e.g. Sleep debt...',
              },
              {
                id: 'q3',
                theme: 'Prior Response Patterns',
                question: 'How do you typically tend to respond in similar moments?',
                options: ['Saying yes quickly', 'Delaying', 'None of these'],
                placeholder: 'e.g. Habit of agreeing...',
              },
            ],
          },
        });
      }
      if (url === '/reflections/analyze') {
        return Promise.resolve({
          data: {
            id: 'mock-session-123',
            initial_situation: 'Test situation details with enough characters.',
            status: 'in_progress',
            is_saved: false,
            state: {
              encounter: { description: 'Test encounter' },
              reported_facts: [],
              hypotheses: [],
              unknowns: [],
              goals: [],
              possible_responses: [],
              connections: [],
              behavioural_answers: [],
            },
          },
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    // 1. Enter situation
    const textarea = screen.getByPlaceholderText(/My manager assigned an urgent project/i);
    fireEvent.change(textarea, {
      target: { value: 'My manager assigned an urgent project while my calendar is completely packed.' },
    });

    // 2. Click continue to questions
    const continueBtn = screen.getByRole('button', { name: /Continue to Reflection Questions/i });
    fireEvent.click(continueBtn);

    // 3. Question 1 presented
    await waitFor(() => {
      expect(screen.getByText('What shaped your immediate reaction most?')).toBeInTheDocument();
      expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    });

    // Select suggestion pill "Urgent deadline"
    const pill1 = screen.getByRole('button', { name: /Urgent deadline/i });
    fireEvent.click(pill1);

    // Click Next Question
    const nextBtn1 = screen.getByRole('button', { name: /Next Question/i });
    fireEvent.click(nextBtn1);

    // 4. Question 2 presented
    await waitFor(() => {
      expect(screen.getByText('Might personal or workload factors have influenced you?')).toBeInTheDocument();
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
    });

    // Select suggestion pill "Heavy workload"
    const pill2 = screen.getByRole('button', { name: /Heavy workload/i });
    fireEvent.click(pill2);

    // Click Next Question
    const nextBtn2 = screen.getByRole('button', { name: /Next Question/i });
    fireEvent.click(nextBtn2);

    // 5. Question 3 presented
    await waitFor(() => {
      expect(screen.getByText('How do you typically tend to respond in similar moments?')).toBeInTheDocument();
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();
    });

    // Select suggestion pill "Saying yes quickly"
    const pill3 = screen.getByRole('button', { name: /Saying yes quickly/i });
    fireEvent.click(pill3);

    // Final submit button: Generate Reflection Map
    const generateBtn = screen.getByRole('button', { name: /Generate Reflection Map/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/reflections/analyze', expect.objectContaining({
        situation: 'My manager assigned an urgent project while my calendar is completely packed.',
        behavioural_answers: expect.arrayContaining([
          expect.objectContaining({ question_id: 'q1', answer: 'Urgent deadline' }),
          expect.objectContaining({ question_id: 'q2', answer: 'Heavy workload' }),
          expect.objectContaining({ question_id: 'q3', answer: 'Saying yes quickly' }),
        ]),
      }));
    });
  });

  it('renders clear error message when analyze call fails', async () => {
    (apiClient.post as any).mockImplementation((url: string) => {
      if (url === '/reflections/questions') {
        return Promise.resolve({
          data: {
            questions: [
              { id: 'q1', theme: 'Theme 1', question: 'Q1?', options: ['Option 1'], placeholder: '' },
              { id: 'q2', theme: 'Theme 2', question: 'Q2?', options: ['Option 2'], placeholder: '' },
              { id: 'q3', theme: 'Theme 3', question: 'Q3?', options: ['Option 3'], placeholder: '' },
            ],
          },
        });
      }
      if (url === '/reflections/analyze') {
        return Promise.reject({
          response: {
            status: 503,
            data: {
              detail: {
                code: 'AI_PROVIDER_NOT_CONFIGURED',
                message: 'AI provider is not configured. Please configure GEMINI_API_KEY.',
              },
            },
          },
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    const textarea = screen.getByPlaceholderText(/My manager assigned an urgent project/i);
    fireEvent.change(textarea, {
      target: { value: 'My colleague criticized my architecture proposal publicly in front of team.' },
    });

    const continueBtn = screen.getByRole('button', { name: /Continue to Reflection Questions/i });
    fireEvent.click(continueBtn);

    // Q1
    await waitFor(() => expect(screen.getByText('Q1?')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Option 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next Question/i }));

    // Q2
    await waitFor(() => expect(screen.getByText('Q2?')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Option 2/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next Question/i }));

    // Q3
    await waitFor(() => expect(screen.getByText('Q3?')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Option 3/i }));

    // Generate
    const submitBtn = screen.getByRole('button', { name: /Generate Reflection Map/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('AI provider is not configured. Please configure GEMINI_API_KEY.')
      ).toBeInTheDocument();
    });
  });
});

describe('SituationEntryPage — Speech-to-Text Dictation', () => {
  let mockRecognitionInstances: MockSpeechRecognition[] = [];
  const originalSpeechRecognition = (window as any).SpeechRecognition;
  const originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition;

  class MockSpeechRecognition {
    continuous = true;
    interimResults = true;
    lang = 'en-US';
    onstart: ((event: Event) => void) | null = null;
    onresult: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    onend: ((event: Event) => void) | null = null;

    start = vi.fn().mockImplementation(() => {
      if (this.onstart) {
        this.onstart(new Event('start'));
      }
    });

    stop = vi.fn().mockImplementation(() => {
      if (this.onend) {
        this.onend(new Event('end'));
      }
    });

    abort = vi.fn().mockImplementation(() => {
      if (this.onend) {
        this.onend(new Event('end'));
      }
    });

    constructor() {
      mockRecognitionInstances.push(this);
    }

    simulateResult(transcript: string, isFinal = true) {
      if (this.onresult) {
        const item = [{ transcript }];
        (item as any).isFinal = isFinal;
        const event = {
          resultIndex: 0,
          results: [item],
        };
        this.onresult(event);
      }
    }

    simulateError(error: string) {
      if (this.onerror) {
        this.onerror({ error } as any);
      }
    }
  }

  beforeEach(() => {
    mockRecognitionInstances = [];
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (window as any).SpeechRecognition = originalSpeechRecognition;
    (window as any).webkitSpeechRecognition = originalWebkitSpeechRecognition;
  });

  it('renders dictate microphone button alongside the situation textarea label', () => {
    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    const dictateBtn = screen.getByRole('button', { name: /Dictate situation with microphone/i });
    expect(dictateBtn).toBeInTheDocument();
    expect(dictateBtn).toHaveTextContent('Dictate');
  });

  it('starts and stops speech recognition via microphone button with clear listening indicator', () => {
    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    const dictateBtn = screen.getByRole('button', { name: /Dictate situation with microphone/i });
    fireEvent.click(dictateBtn);

    expect(mockRecognitionInstances).toHaveLength(1);
    const recognition = mockRecognitionInstances[0];
    expect(recognition.start).toHaveBeenCalledTimes(1);

    // Active listening state is displayed
    const stopBtn = screen.getByRole('button', { name: /Stop voice dictation/i });
    expect(stopBtn).toBeInTheDocument();
    expect(stopBtn).toHaveTextContent(/Listening... \(Click to stop\)/i);

    // User clicks stop
    fireEvent.click(stopBtn);
    expect(recognition.stop).toHaveBeenCalledTimes(1);

    // Returns to idle state
    expect(screen.getByRole('button', { name: /Dictate situation with microphone/i })).toBeInTheDocument();
  });

  it('transcribes recognized speech into the situation textarea and updates character counter', () => {
    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    const dictateBtn = screen.getByRole('button', { name: /Dictate situation with microphone/i });
    fireEvent.click(dictateBtn);

    const recognition = mockRecognitionInstances[0];
    act(() => {
      recognition.simulateResult('I was asked to lead an urgent client escalations meeting.');
    });

    const textarea = screen.getByPlaceholderText(/My manager assigned an urgent project/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('I was asked to lead an urgent client escalations meeting.');

    // Character counter updates accurately
    expect(screen.getByText(/57 \/ 4000/)).toBeInTheDocument();
  });

  it('sensibly appends dictated speech to existing typed text without duplicate text', () => {
    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    const textarea = screen.getByPlaceholderText(/My manager assigned an urgent project/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: 'My calendar was already completely booked for the day.' },
    });

    // Start dictation
    const dictateBtn = screen.getByRole('button', { name: /Dictate situation with microphone/i });
    fireEvent.click(dictateBtn);

    const recognition = mockRecognitionInstances[0];
    act(() => {
      recognition.simulateResult('Then my director scheduled an unannounced review.');
    });

    // Appended smoothly with a space separator
    expect(textarea.value).toBe(
      'My calendar was already completely booked for the day. Then my director scheduled an unannounced review.'
    );

    // Stop recording
    const stopBtn = screen.getByRole('button', { name: /Stop voice dictation/i });
    fireEvent.click(stopBtn);
  });

  it('allows user to edit the transcribed text before continuing to behavioural questions', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: {
        questions: [
          { id: 'q1', theme: 'T', question: 'Q?', options: ['O'], placeholder: '' },
        ],
      },
    });

    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    // Dictate initial speech
    fireEvent.click(screen.getByRole('button', { name: /Dictate situation with microphone/i }));
    act(() => {
      mockRecognitionInstances[0].simulateResult('Raw speech transcription with minor typo');
    });

    const stopBtn = screen.getByRole('button', { name: /Stop voice dictation/i });
    fireEvent.click(stopBtn);

    const textarea = screen.getByPlaceholderText(/My manager assigned an urgent project/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Raw speech transcription with minor typo');

    // User edits and corrects the transcript in the textarea
    fireEvent.change(textarea, {
      target: { value: 'Corrected speech transcription: My manager assigned an urgent priority project.' },
    });

    // User submits the form to continue
    const continueBtn = screen.getByRole('button', { name: /Continue to Reflection Questions/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/reflections/questions',
        expect.objectContaining({
          situation: 'Corrected speech transcription: My manager assigned an urgent priority project.',
        })
      );
    });
  });

  it('handles unsupported browsers gracefully with clear message and does not enter recording state', () => {
    // Delete SpeechRecognition support
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    const dictateBtn = screen.getByRole('button', { name: /Dictate situation with microphone/i });
    fireEvent.click(dictateBtn);

    // Informative message displayed
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Speech recognition is not supported in this browser/i)).toBeInTheDocument();

    // Not in recording state
    expect(screen.queryByRole('button', { name: /Stop voice dictation/i })).not.toBeInTheDocument();

    // User can dismiss the message
    const dismissBtn = screen.getByRole('button', { name: /Dismiss speech recognition error/i });
    fireEvent.click(dismissBtn);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('handles microphone permission denial (not-allowed) gracefully and resets recording state', () => {
    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    const dictateBtn = screen.getByRole('button', { name: /Dictate situation with microphone/i });
    fireEvent.click(dictateBtn);

    expect(screen.getByRole('button', { name: /Stop voice dictation/i })).toBeInTheDocument();

    // Browser fires not-allowed error
    act(() => {
      mockRecognitionInstances[0].simulateError('not-allowed');
    });

    // Recording stops and clear permission error is shown
    expect(screen.queryByRole('button', { name: /Stop voice dictation/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Microphone access was denied. Please allow microphone permissions in your browser./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dictate situation with microphone/i })).toBeInTheDocument();
  });

  it('handles no-speech error gracefully without freezing the UI', () => {
    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Dictate situation with microphone/i }));
    expect(screen.getByRole('button', { name: /Stop voice dictation/i })).toBeInTheDocument();

    act(() => {
      mockRecognitionInstances[0].simulateError('no-speech');
    });

    expect(screen.getByText(/No speech was detected. Please try speaking into your microphone again./i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Stop voice dictation/i })).not.toBeInTheDocument();
  });

  it('stops and cleans up speech recognition when component unmounts', () => {
    const { unmount } = render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Dictate situation with microphone/i }));
    const recognition = mockRecognitionInstances[0];
    expect(recognition.abort).not.toHaveBeenCalled();

    unmount();

    // Abort called to prevent memory leaks and background listening
    expect(recognition.abort).toHaveBeenCalledTimes(1);
  });
});
