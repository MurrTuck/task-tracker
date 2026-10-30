const express = require('express');
const db = require('../db/connection');

const router = express.Router();

// READ notes for a project
router.get('/projects/:id/notes', (req, res) => {
  const project = db
    .prepare('SELECT id FROM projects WHERE id = ?')
    .get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const notes = db
    .prepare('SELECT * FROM notes WHERE project_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  res.json(notes);
});

// READ notes for a task
router.get('/tasks/:id/notes', (req, res) => {
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const notes = db
    .prepare('SELECT * FROM notes WHERE task_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  res.json(notes);
});

// CREATE a note in a project (task_id is optional)
router.post('/projects/:id/notes', (req, res) => {
  const { body, task_id } = req.body;
  if (!body) return res.status(400).json({ error: 'Body is required' });

  const project = db
    .prepare('SELECT id FROM projects WHERE id = ?')
    .get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (task_id) {
    const task = db
      .prepare('SELECT id FROM tasks WHERE id = ? AND project_id = ?')
      .get(task_id, req.params.id);
    if (!task)
      return res.status(400).json({ error: 'Task not found in this project' });
  }

  const result = db
    .prepare('INSERT INTO notes (project_id, task_id, body) VALUES (?, ?, ?)')
    .run(req.params.id, task_id || null, body);
  const note = db
    .prepare('SELECT * FROM notes WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(note);
});

// READ one note
router.get('/notes/:id', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

// UPDATE a note's text
router.put('/notes/:id', (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'Body is required' });
  const result = db
    .prepare('UPDATE notes SET body = ? WHERE id = ?')
    .run(body, req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: 'Note not found' });
  res.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id));
});

// DELETE a note
router.delete('/notes/:id', (req, res) => {
  const result = db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: 'Note not found' });
  res.status(204).send();
});

module.exports = router;