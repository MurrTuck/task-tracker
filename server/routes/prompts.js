const express = require('express');
const db = require('../db/connection');

const router = express.Router();

const getPrompt = (id) =>
  db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);

function projectExists(projectId) {
  if (!projectId) return true;
  return !!db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
}

// READ all prompts, with search, filters, and sorting
router.get('/', (req, res) => {
  const { search, category, favorite, project_id, sort } = req.query;
  let sql = 'SELECT * FROM prompts WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (title LIKE ? OR body LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (favorite === '1') {
    sql += ' AND is_favorite = 1';
  }
  if (project_id) {
    sql += ' AND project_id = ?';
    params.push(project_id);
  }

  const sorts = {
    most_used: 'use_count DESC',
    recent: 'last_used_at DESC',
    newest: 'created_at DESC',
    title: 'title ASC',
  };
  sql += ` ORDER BY ${sorts[sort] || sorts.newest}`;

  res.json(db.prepare(sql).all(...params));
});

// READ the list of categories (must come before /:id)
router.get('/categories', (req, res) => {
  const rows = db
    .prepare(
      `SELECT category, COUNT(*) AS count
       FROM prompts
       WHERE category IS NOT NULL
       GROUP BY category
       ORDER BY category`
    )
    .all();
  res.json(rows);
});

// READ one prompt
router.get('/:id', (req, res) => {
  const prompt = getPrompt(req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
  res.json(prompt);
});

// CREATE a prompt
router.post('/', (req, res) => {
  const { title, body, category, project_id } = req.body;
  if (!title || !body)
    return res.status(400).json({ error: 'Title and body are required' });
  if (!projectExists(project_id))
    return res.status(400).json({ error: 'Project not found' });

  const result = db
    .prepare(
      'INSERT INTO prompts (title, body, category, project_id) VALUES (?, ?, ?, ?)'
    )
    .run(title, body, category || null, project_id || null);
  res.status(201).json(getPrompt(result.lastInsertRowid));
});

// UPDATE a prompt
router.put('/:id', (req, res) => {
  const { title, body, category, project_id } = req.body;
  if (!title || !body)
    return res.status(400).json({ error: 'Title and body are required' });
  if (!projectExists(project_id))
    return res.status(400).json({ error: 'Project not found' });

  const result = db
    .prepare(
      `UPDATE prompts
       SET title = ?, body = ?, category = ?, project_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(title, body, category || null, project_id || null, req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: 'Prompt not found' });
  res.json(getPrompt(req.params.id));
});

// RECORD A USE: bump the counter and return the prompt
router.post('/:id/use', (req, res) => {
  const result = db
    .prepare(
      `UPDATE prompts
       SET use_count = use_count + 1, last_used_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: 'Prompt not found' });
  res.json(getPrompt(req.params.id));
});

// TOGGLE FAVORITE
router.patch('/:id/favorite', (req, res) => {
  const result = db
    .prepare(
      `UPDATE prompts
       SET is_favorite = 1 - is_favorite, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: 'Prompt not found' });
  res.json(getPrompt(req.params.id));
});

// DELETE a prompt
router.delete('/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM prompts WHERE id = ?')
    .run(req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: 'Prompt not found' });
  res.status(204).send();
});

module.exports = router;