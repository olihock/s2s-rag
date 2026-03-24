import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ChatWindow } from '../src/components/ChatWindow';
import type { ChatMessage } from '../src/types/types';

// Mock the api module
vi.mock('../src/services/api', () => ({
  queryWithChat: vi.fn(),
}));

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const noop = () => {};

describe('ChatWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Chat button in DOM with aria-label (rendered in App)
  it('should render chat button with aria-label="Chat öffnen" in App', async () => {
    const { default: App } = await import('../src/App');

    // Mock API calls that App makes on mount
    vi.mock('../src/services/api', () => ({
      queryWithChat: vi.fn(),
      listDocuments: vi.fn().mockResolvedValue([]),
      listFolders: vi.fn().mockResolvedValue([]),
      listRecycleBin: vi.fn().mockResolvedValue([]),
      login: vi.fn(),
      register: vi.fn(),
    }));

    // Simulate logged-in state
    localStorage.setItem('accessToken', 'test-token');

    render(<App />);

    const chatButton = await screen.findByRole('button', { name: 'Chat öffnen' });
    expect(chatButton).toBeInTheDocument();

    localStorage.removeItem('accessToken');
  });

  // Test 2: Empty message list → placeholder text visible
  it('should show placeholder text when messages list is empty', () => {
    render(<ChatWindow language="en" onClose={noop} messages={[]} onMessagesChange={noop} />);

    expect(screen.getByText('Stellen Sie eine Frage...')).toBeInTheDocument();
  });

  // Test 3: Close button present
  it('should render close button with aria-label="Chat schließen"', () => {
    render(<ChatWindow language="en" onClose={noop} messages={[]} onMessagesChange={noop} />);

    expect(screen.getByRole('button', { name: 'Chat schließen' })).toBeInTheDocument();
  });

  // Test 4: Delete/clear button present
  it('should render delete button with aria-label="Konversation löschen"', () => {
    render(<ChatWindow language="en" onClose={noop} messages={[]} onMessagesChange={noop} />);

    expect(screen.getByRole('button', { name: 'Konversation löschen' })).toBeInTheDocument();
  });

  // Test 5: Loading state → input and button disabled, loading indicator visible
  it('should disable input and send button and show loading indicator while loading', async () => {
    const { queryWithChat } = await import('../src/services/api');
    const mockedQuery = vi.mocked(queryWithChat);

    // Never resolves during the test so we stay in loading state
    mockedQuery.mockImplementation(() => new Promise(() => {}));

    render(<ChatWindow language="en" onClose={noop} messages={[]} onMessagesChange={noop} />);

    const textarea = screen.getByPlaceholderText('Nachricht eingeben...');
    const sendButton = screen.getByRole('button', { name: 'Nachricht senden' });

    // Type a message and submit
    fireEvent.change(textarea, { target: { value: 'Hallo' } });
    fireEvent.submit(textarea.closest('form')!);

    // After submit, loading state should be active
    await waitFor(() => {
      expect(textarea).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    // Loading indicator (animated dots) should be visible
    const loadingDots = document.querySelectorAll('.animate-bounce');
    expect(loadingDots.length).toBeGreaterThan(0);
  });

  // Test 6: Answer without sources → no sources section
  it('should not render sources section when bot message has empty sources array', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        role: 'bot',
        text: 'Das ist eine Antwort ohne Quellen.',
        sources: [],
        timestamp: new Date(),
      },
    ];

    render(<ChatWindow language="en" onClose={noop} messages={messages} onMessagesChange={noop} />);

    expect(screen.getByText('Das ist eine Antwort ohne Quellen.')).toBeInTheDocument();
    expect(screen.queryByText('Quellen')).not.toBeInTheDocument();
  });
});
