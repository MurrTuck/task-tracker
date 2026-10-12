const express = require('express');
const db = require('../db/connection');

const router = express.Router();

// READ all projects
router.get('/', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects').all();
  res.json(projects);
});

// READ one project
router.get('/:id', (req, res) => {
  const project = db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// CREATE a project
router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = db
    .prepare('INSERT INTO projects (name, description) VALUES (?, ?)')
    .run(name, description || null);
  const project = db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(project);
});

// UPDATE a project
router.put('/:id', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = db
    .prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?')
    .run(name, description || null, req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: 'Project not found' });
  const project = db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .get(req.params.id);
  res.json(project);
});

// DELETE a project
router.delete('/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM projects WHERE id = ?')
    .run(req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: 'Project not found' });
  res.status(204).send();
});

module.exports = router;