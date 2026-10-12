const express = require('express');
const cors = require('cors');
const db = require('./db/connection');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Task tracker API is running' });
});

// READ all projects
app.get('/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects').all();
  res.json(projects);
});

// READ one project
app.get('/projects/:id', (req, res) => {
  const project = db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// CREATE a project
app.post('/projects', (req, res) => {
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
app.put('/projects/:id', (req, res) => {
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
app.delete('/projects/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM projects WHERE id = ?')
    .run(req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: 'Project not found' });
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});