import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useState } from 'react';
import * as fc from 'fast-check';
import { ChatWindow } from '../src/components/ChatWindow';
import type { ChatMessage } from '../src/types/types';

// Mock the api module
vi.mock('../src/services/api', () => ({
  queryWithChat: vi.fn(),
}));

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const noop = () => {};

// Helper: generate a ChatMessage arbitrary
const arbChatMessage = (role?: 'user' | 'bot') =>
  fc.record({
    id: fc.uuid(),
    role: role
      ? fc.constant(role)
      : fc.oneof(fc.constant('user' as const), fc.constant('bot' as const)),
    text: fc.string({ minLength: 1, maxLength: 200 }),
    timestamp: fc.date(),
    sources: fc.constant(undefined),
  });

// Wrapper component for Property 1 (toggle test)
function ToggleWrapper() {
  const [chatOpen, setChatOpen] = useState(false);
  return (
    <div>
      <button aria-label="Chat öffnen" onClick={() => setChatOpen((o) => !o)} />
      {chatOpen && (
        <ChatWindow
          language="en"
          onClose={() => setChatOpen(false)}
          messages={[]}
          onMessagesChange={noop}
        />
      )}
    </div>
  );
}

// Wrapper component for Property 11 (persistence test)
function PersistenceWrapper({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  return (
    <div>
      <button data-testid="toggle-btn" onClick={() => setChatOpen((o) => !o)} />
      {chatOpen && (
        <ChatWindow
          language="en"
          onClose={() => setChatOpen(false)}
          messages={messages}
          onMessagesChange={setMessages}
        />
      )}
    </div>
  );
}

describe('ChatWindow Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Feature: text-chatbot, Property 1: Chat-Button Toggle
  it('Property 1: Chat-Button Toggle – clicking inverts visibility, two clicks return to original state', async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (startOpen) => {
        cleanup();
        const { container } = render(<ToggleWrapper />);
        const btn = container.querySelector('[aria-label="Chat öffnen"]') as HTMLButtonElement;

        // Set initial state
        if (startOpen) {
          fireEvent.click(btn);
          await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeNull();
          });
        }

        const wasOpen = startOpen;

        // First click: should invert
        fireEvent.click(btn);
        if (wasOpen) {
          await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        } else {
          await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());
        }

        // Second click: should return to original
        fireEvent.click(btn);
        if (wasOpen) {
          await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());
        } else {
          await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: text-chatbot, Property 2: Chronologische Nachrichtenreihenfolge
  it('Property 2: Chronologische Nachrichtenreihenfolge – display order matches insertion order', () => {
    fc.assert(
      fc.property(fc.array(arbChatMessage(), { minLength: 1, maxLength: 20 }), (messages) => {
        cleanup();
        render(
          <ChatWindow language="en" onClose={noop} messages={messages} onMessagesChange={noop} />,
        );

        // Get all rendered message text elements
        const messageContainer = document.querySelector('.flex-1.overflow-y-auto');
        if (!messageContainer) return;

        const messageDivs = messageContainer.querySelectorAll('.rounded-2xl.px-4.py-2');
        const renderedTexts = Array.from(messageDivs).map((el) => el.textContent);

        // Each message text should appear in the same order as the input array
        messages.forEach((msg, i) => {
          expect(renderedTexts[i]).toBe(msg.text);
        });

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: text-chatbot, Property 3: Visuelle Unterscheidbarkeit von Nachrichten
  it('Property 3: Visuelle Unterscheidbarkeit – user messages get bg-blue-500, bot messages get bg-gray-100', () => {
    fc.assert(
      fc.property(fc.array(arbChatMessage(), { minLength: 1, maxLength: 20 }), (messages) => {
        cleanup();
        render(
          <ChatWindow language="en" onClose={noop} messages={messages} onMessagesChange={noop} />,
        );

        const messageContainer = document.querySelector('.flex-1.overflow-y-auto');
        if (!messageContainer) return;

        const messageDivs = messageContainer.querySelectorAll('.rounded-2xl.px-4.py-2');

        messages.forEach((msg, i) => {
          const el = messageDivs[i];
          if (!el) return;
          if (msg.role === 'user') {
            expect(el.classList.contains('bg-blue-500')).toBe(true);
            expect(el.classList.contains('bg-gray-100')).toBe(false);
          } else {
            expect(el.classList.contains('bg-gray-100')).toBe(true);
            expect(el.classList.contains('bg-blue-500')).toBe(false);
          }
        });

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: text-chatbot, Property 4: Absenden leert das Eingabefeld
  it('Property 4: Absenden leert das Eingabefeld – after submit, input is empty', async () => {
    const { queryWithChat } = await import('../src/services/api');
    const mockedQuery = vi.mocked(queryWithChat);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        async (inputText) => {
          cleanup();
          mockedQuery.mockResolvedValueOnce({ answer: 'ok', sources: [] });

          const messages: ChatMessage[] = [];
          const onMessagesChange = vi.fn();

          render(
            <ChatWindow
              language="en"
              onClose={noop}
              messages={messages}
              onMessagesChange={onMessagesChange}
            />,
          );

          const textarea = screen.getByPlaceholderText('Nachricht eingeben...');
          fireEvent.change(textarea, { target: { value: inputText } });
          expect((textarea as HTMLTextAreaElement).value).toBe(inputText);

          fireEvent.submit(textarea.closest('form')!);

          await waitFor(() => {
            expect((textarea as HTMLTextAreaElement).value).toBe('');
          });

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: text-chatbot, Property 5: Leere Eingaben werden abgelehnt
  it('Property 5: Leere Eingaben werden abgelehnt – whitespace-only inputs do not add messages', async () => {
    const { queryWithChat } = await import('../src/services/api');
    const mockedQuery = vi.mocked(queryWithChat);

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.constant(''), fc.stringMatching(/^\s+$/)),
        async (emptyInput) => {
          cleanup();
          mockedQuery.mockClear();

          const onMessagesChange = vi.fn();

          render(
            <ChatWindow
              language="en"
              onClose={noop}
              messages={[]}
              onMessagesChange={onMessagesChange}
            />,
          );

          const textarea = screen.getByPlaceholderText('Nachricht eingeben...');
          fireEvent.change(textarea, { target: { value: emptyInput } });
          fireEvent.submit(textarea.closest('form')!);

          // queryWithChat should NOT have been called
          expect(mockedQuery).not.toHaveBeenCalled();
          // onMessagesChange should NOT have been called
          expect(onMessagesChange).not.toHaveBeenCalled();

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: text-chatbot, Property 8: Quellenanzeige abhängig von sources-Länge
  it('Property 8: Quellenanzeige – sources shown when length > 0, hidden when length === 0', () => {
    const arbNonEmptyString = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);
    const arbSourceNonEmpty = () =>
      fc.record({
        documentId: fc.uuid(),
        filename: arbNonEmptyString,
        chunkText: arbNonEmptyString,
        similarity: fc.float({ min: 0, max: 1 }),
      });

    fc.assert(
      fc.property(
        fc.array(arbSourceNonEmpty(), { minLength: 0, maxLength: 5 }),
        arbNonEmptyString,
        (sources, answerText) => {
          cleanup();

          const botMessage: ChatMessage = {
            id: 'bot-1',
            role: 'bot',
            text: answerText,
            sources,
            timestamp: new Date(),
          };

          render(
            <ChatWindow
              language="en"
              onClose={noop}
              messages={[botMessage]}
              onMessagesChange={noop}
            />,
          );

          if (sources.length > 0) {
            // Sources section should be visible
            expect(screen.getByText('Quellen')).toBeInTheDocument();
            // Each source filename and chunkText should be rendered
            sources.forEach((source) => {
              expect(screen.getByText(source.filename.trim())).toBeInTheDocument();
              expect(screen.getByText(source.chunkText.trim())).toBeInTheDocument();
            });
          } else {
            // No sources section
            expect(screen.queryByText('Quellen')).not.toBeInTheDocument();
          }

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: text-chatbot, Property 10: Fehlerbehandlung reaktiviert Eingabe
  it('Property 10: Fehlerbehandlung reaktiviert Eingabe – after API error, input and button are re-enabled', async () => {
    const { queryWithChat } = await import('../src/services/api');
    const mockedQuery = vi.mocked(queryWithChat);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        async (inputText) => {
          cleanup();
          mockedQuery.mockRejectedValueOnce(new Error('API error'));

          const messages: ChatMessage[] = [];
          const onMessagesChange = vi.fn((newMessages: ChatMessage[]) => {
            messages.splice(0, messages.length, ...newMessages);
          });

          render(
            <ChatWindow
              language="en"
              onClose={noop}
              messages={messages}
              onMessagesChange={onMessagesChange}
            />,
          );

          const textarea = screen.getByPlaceholderText('Nachricht eingeben...');

          fireEvent.change(textarea, { target: { value: inputText } });
          fireEvent.submit(textarea.closest('form')!);

          // After error resolves, textarea should be re-enabled (isLoading = false)
          await waitFor(
            () => {
              expect(textarea).not.toBeDisabled();
            },
            { timeout: 2000 },
          );

          // Send button disabled state depends on input being empty (expected), not on isLoading
          // The key property is that isLoading is false (textarea not disabled)

          // Verify send button is re-enabled when input has content
          fireEvent.change(textarea, { target: { value: 'test' } });
          const sendButton = screen.getByRole('button', { name: 'Nachricht senden' });
          expect(sendButton).not.toBeDisabled();

          // An error message should have been added
          expect(onMessagesChange).toHaveBeenCalled();
          const lastCall = onMessagesChange.mock.calls[
            onMessagesChange.mock.calls.length - 1
          ][0] as ChatMessage[];
          const lastMsg = lastCall[lastCall.length - 1];
          expect(lastMsg.role).toBe('bot');
          expect(lastMsg.text).toContain('Fehler');

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  // Feature: text-chatbot, Property 11: Konversationsverlauf-Persistenz
  it('Property 11: Konversationsverlauf-Persistenz – messages persist after close and reopen', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbChatMessage(), { minLength: 1, maxLength: 10 }),
        async (messages) => {
          cleanup();

          const { getByTestId } = render(<PersistenceWrapper initialMessages={messages} />);

          // ChatWindow is open initially – verify dialog is shown
          expect(screen.queryByRole('dialog')).not.toBeNull();

          // Close the ChatWindow
          const toggleBtn = getByTestId('toggle-btn');
          fireEvent.click(toggleBtn);
          await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 1000 });

          // Reopen the ChatWindow
          fireEvent.click(toggleBtn);
          await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull(), {
            timeout: 1000,
          });

          // All messages should still be present
          const messageContainer = document.querySelector('.flex-1.overflow-y-auto');
          expect(messageContainer).not.toBeNull();
          const messageDivs = messageContainer!.querySelectorAll('.rounded-2xl.px-4.py-2');
          expect(messageDivs.length).toBe(messages.length);

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  // Feature: text-chatbot, Property 12: Löschen leert den Konversationsverlauf
  it('Property 12: Löschen leert den Konversationsverlauf – delete button empties message list', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbChatMessage(), { minLength: 1, maxLength: 20 }),
        async (messages) => {
          cleanup();

          const onMessagesChange = vi.fn();

          render(
            <ChatWindow
              language="en"
              onClose={noop}
              messages={messages}
              onMessagesChange={onMessagesChange}
            />,
          );

          const deleteBtn = screen.getByRole('button', { name: 'Konversation löschen' });
          fireEvent.click(deleteBtn);

          expect(onMessagesChange).toHaveBeenCalledWith([]);

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
