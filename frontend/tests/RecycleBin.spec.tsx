import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RecycleBin } from '../../src/components/RecycleBin';
import * as api from '../../src/services/api';
import type { RecycleBinItem } from '../../src/types/types';

vi.mock('../../src/services/api', () => ({
  restoreRecycleBinItem: vi.fn(),
  permanentDeleteRecycleBinItem: vi.fn(),
}));

describe('RecycleBin', () => {
  const mockOnItemsChanged = vi.fn();

  const items: RecycleBinItem[] = [
    {
      id: 'rb-1',
      itemId: 'doc-1',
      itemType: 'DOCUMENT',
      ownerId: 'user-1',
      deletedAt: new Date().toISOString(),
    },
    {
      id: 'rb-2',
      itemId: 'f1',
      itemType: 'FOLDER',
      ownerId: 'user-1',
      deletedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render recycle bin items', () => {
    render(<RecycleBin items={items} onItemsChanged={mockOnItemsChanged} />);
    expect(screen.getByText(/rb-1|doc-1|DOCUMENT/i)).toBeTruthy();
  });

  it('should call restoreRecycleBinItem when restore is clicked', async () => {
    vi.mocked(api.restoreRecycleBinItem).mockResolvedValue(undefined);
    render(<RecycleBin items={items} onItemsChanged={mockOnItemsChanged} />);

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(api.restoreRecycleBinItem).toHaveBeenCalledWith('rb-1');
      expect(mockOnItemsChanged).toHaveBeenCalledOnce();
    });
  });

  it('should call permanentDeleteRecycleBinItem when delete is clicked', async () => {
    vi.mocked(api.permanentDeleteRecycleBinItem).mockResolvedValue(undefined);
    render(<RecycleBin items={items} onItemsChanged={mockOnItemsChanged} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(api.permanentDeleteRecycleBinItem).toHaveBeenCalledWith('rb-1');
      expect(mockOnItemsChanged).toHaveBeenCalledOnce();
    });
  });

  it('should show empty state when no items', () => {
    render(<RecycleBin items={[]} onItemsChanged={mockOnItemsChanged} />);
    expect(screen.getByText(/empty|no items/i)).toBeTruthy();
  });

  it('should show 30-day retention notice', () => {
    render(<RecycleBin items={items} onItemsChanged={mockOnItemsChanged} />);
    expect(screen.getByText(/30.day|auto.delete/i)).toBeTruthy();
  });
});
