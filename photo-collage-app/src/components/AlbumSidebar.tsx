import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, ALLOWED_EMAILS } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

interface Album {
  id: string;
  name: string;
  createdAt: any;
  createdBy: string;
  sharedWith: string[];
}

interface AlbumSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAlbum: Album | null;
  onSelectAlbum: (album: Album) => void;
}

export const AlbumSidebar: React.FC<AlbumSidebarProps> = ({
  isOpen,
  onClose,
  selectedAlbum,
  onSelectAlbum,
}) => {
  const { currentUser } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!currentUser?.email) return;

    // Query albums where user is creator or shared with
    const q = query(
      collection(db, 'albums'),
      where('sharedWith', 'array-contains', currentUser.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const albumData: Album[] = [];
      snapshot.forEach((doc) => {
        albumData.push({ id: doc.id, ...doc.data() } as Album);
      });
      setAlbums(albumData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    return () => unsubscribe();
  }, [currentUser]);

  const createAlbum = async () => {
    if (!newAlbumName.trim() || !currentUser?.email) return;

    setIsCreating(true);
    try {
      await addDoc(collection(db, 'albums'), {
        name: newAlbumName,
        createdAt: serverTimestamp(),
        createdBy: currentUser.email,
        sharedWith: [currentUser.email, ...ALLOWED_EMAILS.filter(email => email !== currentUser.email)]
      });
      setNewAlbumName('');
    } catch (error) {
      console.error('Error creating album:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold">Albums</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Create new album */}
          <div className="p-4 border-b">
            <div className="flex gap-2">
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createAlbum()}
                placeholder="New album name"
                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={createAlbum}
                disabled={isCreating || !newAlbumName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>

          {/* Albums list */}
          <div className="flex-1 overflow-y-auto">
            {albums.map((album) => (
              <button
                key={album.id}
                onClick={() => {
                  onSelectAlbum(album);
                  onClose();
                }}
                className={`w-full text-left p-4 hover:bg-gray-50 border-b transition-colors ${
                  selectedAlbum?.id === album.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="font-medium">{album.name}</div>
                <div className="text-sm text-gray-500">
                  Created by {album.createdBy === currentUser?.email ? 'you' : album.createdBy}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};