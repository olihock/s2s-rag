import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { FolderTree } from '../../src/components/FolderTree';
import type { Folder } from '../../src/types/types';

describe('FolderTree', () => {
  const mockOnSelect = vi.fn();
  const mockOnCreateFolder = vi.fn();
  const mockOnDeleteFolder = vi.fn();

  const folders: Folder[] = [
    { id: 'f1', name: 'Work', ownerId: 'user-1', parentFolderId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'f2', name: 'Personal', ownerId: 'user-1', parentFolderId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'f3', name: 'SubWork', ownerId: 'user-1', parentFolderId: 'f1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render top-level folders', () => {
    render(
      <FolderTree
        folders={folders}
        selectedFolderId={undefined}
        onSelect={mockOnSelect}
        onCreateFolder={mockOnCreateFolder}
        onDeleteFolder={mockOnDeleteFolder}
      />,
    );
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Personal')).toBeTruthy();
  });

  it('should call onSelect when folder is clicked', () => {
    render(
      <FolderTree
        folders={folders}
        selectedFolderId={undefined}
        onSelect={mockOnSelect}
        onCreateFolder={mockOnCreateFolder}
        onDeleteFolder={mockOnDeleteFolder}
      />,
    );
    fireEvent.click(screen.getByText('Work'));
    expect(mockOnSelect).toHaveBeenCalledWith(folders[0]);
  });

  it('should render nested folders under parent', () => {
    render(
      <FolderTree
        folders={folders}
        selectedFolderId={undefined}
        onSelect={mockOnSelect}
        onCreateFolder={mockOnCreateFolder}
        onDeleteFolder={mockOnDeleteFolder}
      />,
    );
    expect(screen.getByText('SubWork')).toBeTruthy();
  });

  it('should call onCreateFolder when new folder button clicked', async () => {
    mockOnCreateFolder.mockResolvedValue(undefined);
    render(
      <FolderTree
        folders={folders}
        selectedFolderId={undefined}
        onSelect={mockOnSelect}
        onCreateFolder={mockOnCreateFolder}
        onDeleteFolder={mockOnDeleteFolder}
      />,
    );

    const addButton = screen.getByTitle(/new folder/i);
    fireEvent.click(addButton);

    const input = await screen.findByPlaceholderText(/folder name/i);
    fireEvent.change(input, { target: { value: 'New Folder' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockOnCreateFolder).toHaveBeenCalledWith('New Folder', undefined);
    });
  });

  it('should call onDeleteFolder when delete is triggered', async () => {
    mockOnDeleteFolder.mockResolvedValue(undefined);
    render(
      <FolderTree
        folders={folders}
        selectedFolderId="f2"
        onSelect={mockOnSelect}
        onCreateFolder={mockOnCreateFolder}
        onDeleteFolder={mockOnDeleteFolder}
      />,
    );

    const deleteButtons = screen.getAllByTitle(/delete folder/i);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockOnDeleteFolder).toHaveBeenCalled();
    });
  });
});
