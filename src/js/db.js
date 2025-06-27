// IndexedDB with localStorage fallback
const DB_NAME = 'SimpleNotesDB';
const STORE_NAME = 'notes';

export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.warn("IndexedDB not supported, falling back to localStorage");
      resolve();
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = (event) => {
      console.error("Database error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveNote = async (note) => {
  if (window.indexedDB) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(note);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  } else {
    // Fallback to localStorage
    const notes = JSON.parse(localStorage.getItem('simpleNotes') || '[]');
    const existingIndex = notes.findIndex(n => n.id === note.id);
    if (existingIndex >= 0) {
      notes[existingIndex] = note;
    } else {
      notes.push(note);
    }
    localStorage.setItem('simpleNotes', JSON.stringify(notes));
    return Promise.resolve();
  }
};

export const getNotes = async () => {
  if (window.indexedDB) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  } else {
    // Fallback to localStorage
    return Promise.resolve(JSON.parse(localStorage.getItem('simpleNotes') || '[]'));
  }
};

export const deleteNote = async (id) => {
  if (window.indexedDB) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  } else {
    // Fallback to localStorage
    const notes = JSON.parse(localStorage.getItem('simpleNotes') || '[]');
    const filtered = notes.filter(note => note.id !== id);
    localStorage.setItem('simpleNotes', JSON.stringify(filtered));
    return Promise.resolve();
  }
};