import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/services/api', () => ({
  updateLanguagePreference: vi.fn(),
}));

describe('LanguageSettings Component (US1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render language selection options', async () => {
    const { LanguageSettings } = await import('../../src/components/LanguageSettings');

    render(<LanguageSettings currentLanguage='en' onLanguageChange={vi.fn()} />);

    expect(screen.getByText(/english/i)).toBeInTheDocument();
    expect(screen.getByText(/german|deutsch/i)).toBeInTheDocument();
  });

  it('should call onLanguageChange when language is selected', async () => {
    const user = userEvent.setup();
    const onLanguageChange = vi.fn();
    const { LanguageSettings } = await import('../../src/components/LanguageSettings');

    render(<LanguageSettings currentLanguage='en' onLanguageChange={onLanguageChange} />);

    const germanOption = screen.getByRole('radio', { name: /german|deutsch/i });
    await user.click(germanOption);

    expect(onLanguageChange).toHaveBeenCalledWith('de');
  });
});
