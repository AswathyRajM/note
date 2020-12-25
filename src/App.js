import React, { useState, useEffect } from "react";
import "./App.css";
import { API, Storage } from "aws-amplify";
//   { withAuthenticator, AmplifySignOut } from "@aws-amplify/ui-react";
import { listNotes } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
  updateNote as updateNoteMutation,
} from "./graphql/mutations";

const initialFormState = { name: "", description: "" };

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editing, setEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState("");
  useEffect(() => {
    fetchNotes();
  }, []);

  async function onChange(e) {
    if (!e.target.files[0]) return;
    const file = e.target.files[0];
    setFormData({ ...formData, image: file.name });
    await Storage.put(file.name, file);
    fetchNotes();
  }
  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(
      notesFromAPI.map(async (note) => {
        if (note.image) {
          const image = await Storage.get(note.image);
          note.image = image;
        }
        return note;
      })
    );
    setNotes(apiData.data.listNotes.items);
  }

  async function createNote() {
    if (!formData.name || !formData.description) return;
    await API.graphql({
      query: createNoteMutation,
      variables: { input: formData },
    });
    if (formData.image) {
      const image = await Storage.get(formData.image);
      formData.image = image;
    }
    fetchNotes(); //
    setFormData(initialFormState);
  }

  async function deleteNote({ id }) {
    const newNotesArray = notes.filter((note) => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }

  const editNote = (note) => {
    setEditing(true);
    setEditingNoteId(note.id);
    const data = {
      id: note.id,
      name: note.name,
      description: note.description,
    };
    setFormData(data);
    console.log(data);
  };

  async function updateNote() {
    if (!formData.name || !formData.description) {
      setEditing(false);
      fetchNotes();
      setFormData(initialFormState);
      setEditingNoteId("");
      return;
    }
    await API.graphql({
      query: updateNoteMutation,
      variables: { input: formData },
    });
    setEditing(false);
    fetchNotes();
    setFormData(initialFormState);
    setEditingNoteId("");
  }
  return (
    <div className="App">
      <h1>My Notes App</h1>
      <input
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Note name"
        value={formData.name}
      />
      <input
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder="Note description"
        value={formData.description}
      />
      <input type="file" onChange={onChange} />

      {editing === false ? (
        <button onClick={createNote}>Create Note</button>
      ) : (
        <button onClick={updateNote}>Update note</button>
      )}

      <div style={{ marginBottom: 30 }}>
        {notes.map((note) => (
          <div key={note.id || note.name}>
            <h2>{note.name}</h2>
            <p>{note.description}</p>
            <button disabled={editing} onClick={() => deleteNote(note)}>
              Delete note
            </button>
            <button onClick={() => editNote(note)}>Edit note</button>
            {note.image && <img src={note.image} style={{ width: 400 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
