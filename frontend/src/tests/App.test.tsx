import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('ONE PAUSE Application Shell', () => {
  it('renders ONE PAUSE wordmark and tagline in header and hero', () => {
    render(<App />);
    expect(screen.getByText('ONE PAUSE')).toBeInTheDocument();
    const taglines = screen.getAllByText(/Before you respond,/i);
    expect(taglines.length).toBeGreaterThanOrEqual(1);
  });

  it('renders call to action buttons and principles', () => {
    render(<App />);
    expect(screen.getByText('Start a Pause')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText("Show, Don't Lecture")).toBeInTheDocument();
    expect(screen.getByText("Ask, Don't Diagnose")).toBeInTheDocument();
    expect(screen.getByText('Preserve Uncertainty')).toBeInTheDocument();
  });
});
