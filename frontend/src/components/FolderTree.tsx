import React, { useState } from 'react';
import type { Folder } from '../types/types';

interface FolderTreeProps {
  folders: Folder[];
  selectedFolderId?: string;
  onSelect: (folder: Folder) => void;
  onCreateFolder: (name: string, parentId?: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
}

interface FolderNodeProps {
  folder: Folder;
  allFolders: Folder[];
  depth?: number;
  selectedFolderId?: string;
  onSelect: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => Promise<void>;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  allFolders,
  depth = 0,
  selectedFolderId,
  onSelect,
  onDeleteFolder,
}) => {
  const children = allFolders.filter((f) => f.parentFolderId === folder.id);
  const isSelected = folder.id === selectedFolderId;

  return (
    <li>
      <div
        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer group
          ${isSelected ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'}`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        onClick={() => onSelect(folder)}
      >
        <svg className="h-4 w-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
        <span className="text-sm truncate flex-1">{folder.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); void onDeleteFolder(folder.id); }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
          aria-label={`Delete folder ${folder.name}`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              allFolders={allFolders}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onSelect,
  onCreateFolder,
  onDeleteFolder,
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  const rootFolders = folders.filter((f) => f.parentFolderId === null);

  const handleCreate = async (): Promise<void> => {
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      await onCreateFolder(newFolderName.trim(), selectedFolderId);
      setNewFolderName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Folders</h3>

      <ul className="space-y-0.5 mb-4">
        {rootFolders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            allFolders={folders}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            onDeleteFolder={onDeleteFolder}
          />
        ))}
        {folders.length === 0 && (
          <li className="text-sm text-gray-400 py-2 text-center">No folders yet</li>
        )}
      </ul>

      {/* Create folder */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
          placeholder="New folder name"
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          onClick={() => void handleCreate()}
          disabled={creating || !newFolderName.trim()}
          className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  );
};
