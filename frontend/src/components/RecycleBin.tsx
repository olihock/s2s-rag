import React, { useState } from 'react';
import type { RecycleBinItem } from '../types/types';
import { restoreRecycleBinItem, permanentDeleteRecycleBinItem } from '../services/api';

interface RecycleBinProps {
  items: RecycleBinItem[];
  onItemsChanged: () => void;
}

export const RecycleBin: React.FC<RecycleBinProps> = ({ items, onItemsChanged }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async (id: string): Promise<void> => {
    setLoading(id);
    setError(null);
    try {
      await restoreRecycleBinItem(id);
      onItemsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return;
    setLoading(id);
    setError(null);
    try {
      await permanentDeleteRecycleBinItem(id);
      onItemsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (date: Date | string): string =>
    new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' });

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Recycle Bin
        <span className="ml-auto text-xs text-gray-400">Deleted items kept 30 days</span>
      </h3>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Recycle bin is empty</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2.5">
              <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {item.itemType === 'folder' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                )}
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{item.itemId}</p>
                <p className="text-xs text-gray-400">
                  Deleted {formatDate(item.deletedAt)} · {item.itemType}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleRestore(item.id)}
                  disabled={loading === item.id}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                >
                  Restore
                </button>
                <button
                  onClick={() => void handleDelete(item.id)}
                  disabled={loading === item.id}
                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
