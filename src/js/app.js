import { initDB, saveNote, getNotes, deleteNote } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const editor = document.getElementById('editor');
  const noteList = document.getElementById('noteList');
  const newNoteBtn = document.getElementById('newNote');
  const noteTitle = document.getElementById('noteTitle');
  const searchInput = document.getElementById('search');
  const exportBtn = document.getElementById('exportBtn');
  const togglePreview = document.getElementById('togglePreview');
  const preview = document.getElementById('preview');
  const soundToggle = document.getElementById('soundToggle');

  // Audio Context
  let audioContext;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.error('Web Audio API not supported');
    soundToggle.checked = false;
    soundToggle.disabled = true;
  }

  // State
  let currentNoteId = null;
  let notes = [];
  let debounceTimer;

  // Initialize
  try {
    await initDB();
    await loadNotes();
  } catch (error) {
    console.error('Initialization failed:', error);
    alert('Failed to initialize the app. Please check console for details.');
  }

  // Load all notes
  async function loadNotes() {
    try {
      notes = await getNotes();
      renderNoteList();
      if (notes.length > 0) {
        openNote(notes[0].id);
      } else {
        // Create first note if none exists
        await createNewNote();
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }

  // Create new note
  async function createNewNote() {
    const newNote = {
      id: Date.now().toString(),
      title: 'Untitled',
      content: '',
      updatedAt: new Date().toISOString()
    };
    
    await saveNote(newNote);
    notes.unshift(newNote);
    openNote(newNote.id);
  }

  // Render note list
  function renderNoteList(filter = '') {
    noteList.innerHTML = '';
    const filtered = filter 
      ? notes.filter(note => 
          note.title.toLowerCase().includes(filter) || 
          note.content.toLowerCase().includes(filter)
        )
      : notes;

    filtered.forEach(note => {
      const li = document.createElement('li');
      li.textContent = note.title || 'Untitled';
      li.className = currentNoteId === note.id ? 'active' : '';
      li.addEventListener('click', () => openNote(note.id));
      noteList.appendChild(li);
    });
  }

  // Open a note
  function openNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    currentNoteId = id;
    noteTitle.value = note.title;
    editor.value = note.content;
    renderPreview();
    renderNoteList();
  }

  // Save current note
  async function saveCurrentNote() {
    if (!currentNoteId) return;
    
    const note = {
      id: currentNoteId,
      title: noteTitle.value,
      content: editor.value,
      updatedAt: new Date().toISOString()
    };
    
    await saveNote(note);
    notes = notes.map(n => n.id === currentNoteId ? note : n);
    renderNoteList();
  }

  // Delete note (Shift+Click)
  noteList.addEventListener('click', async (e) => {
    if (e.shiftKey && e.target.tagName === 'LI') {
      const noteId = notes.find(n => n.title === e.target.textContent)?.id;
      if (noteId) {
        await deleteNote(noteId);
        notes = notes.filter(n => n.id !== noteId);
        if (currentNoteId === noteId) {
          if (notes.length > 0) {
            openNote(notes[0].id);
          } else {
            await createNewNote();
          }
        }
        renderNoteList();
      }
    }
  });

  // Search notes
  searchInput.addEventListener('input', (e) => {
    renderNoteList(e.target.value.toLowerCase());
  });

  // Export note
  exportBtn.addEventListener('click', () => {
    if (!currentNoteId) return;
    const note = notes.find(n => n.id === currentNoteId);
    const blob = new Blob([note.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title}.md`;
    a.click();
  });

  // Toggle preview
  togglePreview.addEventListener('click', () => {
    preview.classList.toggle('hidden');
    editor.classList.toggle('hidden');
    if (!preview.classList.contains('hidden')) {
      renderPreview();
    }
  });

  // Markdown preview
  function renderPreview() {
    const content = editor.value;
    // Simple markdown parsing
    const html = content
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    preview.innerHTML = html;
  }

  // Typewriter sound using Web Audio API
  function playTypeSound() {
    if (!soundToggle.checked || !audioContext) return;
    
    try {
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      oscillator.type = 'square';
      oscillator.frequency.value = 100 + Math.random() * 50;
      gain.gain.value = 0.1;
      
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      
      oscillator.start(now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      oscillator.stop(now + 0.1);
    } catch (e) {
      console.error('Sound error:', e);
      soundToggle.checked = false;
    }
  }

  // Auto-save with debounce
  editor.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveCurrentNote, 1000);
    playTypeSound();
  });

  noteTitle.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveCurrentNote, 1000);
  });

  // New note button
  newNoteBtn.addEventListener('click', async () => {
    await createNewNote();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveCurrentNote();
    }
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      newNoteBtn.click();
    }
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
    }
  });
});