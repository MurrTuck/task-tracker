const express = require('express');
const db = require('../db/connection');

const router = express.Router();

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

function validate({ status, priority }) {
  if (status && !STATUSES.includes(status))
    return `Status must be one of: ${STATUSES.join(', ')}`;
  if (priority && !PRIORITIES.includes(priority))
    return `Priority must be one of: ${PRIORITIES.join(', ')}`;
  return null;
}

// READ all tasks, with optional filters: /tasks?status=todo&priority=high
router.get('/tasks', (req, res) => {
  const { status, priority } = req.query;
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (priority) {
    sql += ' AND priority = ?';
    params.push(priority);
  }
  res.json(db.prepare(sql).all(...params));
});

// READ tasks for one project
router.get('/projects/:id/tasks', (req, res) => {
  const project = db
    .prepare('SELECT id FROM projects WHERE id = ?')
    .get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const tasks = db
    .prepare('SELECT * FROM tasks WHERE project_id = ?')
    .all(req.params.id);
  res.json(tasks);
});

// CREATE a task in a project
router.post('/projects/:id/tasks', (req, res) => {
  const { title, status, priority, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const problem = validate({ status, priority });
  if (problem) return res.status(400).json({ error: problem });

  const project = db
    .prepare('SELECT id FROM projects WHERE id = ?')
    .get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const result = db
    .prepare(
      `INSERT INTO tasks (project_id, title, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      req.params.id,
      title,
      status || 'todo',
      priority || 'medium',
      due_date || null
    );
  const task = db
    .prepare('SELECT * FROM tasks WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(task);
});

// READ one task
router.get('/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// UPDATE a task
router.put('/tasks/:id', (req, res) => {
  const { title, status, priority, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const problem = validate({ status, priority });
  if (problem) return res.status(400).json({ error: problem });

  const result = db
    .prepare(
      `UPDATE tasks
       SET title = ?, status = ?, priority = ?, due_date = ?
       WHERE id = ?`
    )
    .run(
      title,
      status || 'todo',
      priority || 'medium',
      due_date || null,
      req.params.id
    );
  if (result.changes === 0)
    return res.status(404).json({ error: 'Task not found' });
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

// UPDATE only the status
router.patch('/tasks/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });
  const problem = validate({ status });
  if (problem) return res.status(400).json({ error: problem });

  const result = db
    .prepare('UPDATE tasks SET status = ? WHERE id = ?')
    .run(status, req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: 'Task not found' });
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

// DELETE a task
router.delete('/tasks/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: 'Task not found' });
  res.status(204).send();
});

module.exports = router;