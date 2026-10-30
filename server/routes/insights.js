const express = require('express');
const db = require('../db/connection');

const router = express.Router();

// Turn rows like [{ status: 'todo', count: 2 }] into { todo: 2, ... }
function countBy(rows, key, keys) {
  const result = Object.fromEntries(keys.map((k) => [k, 0]));
  rows.forEach((row) => (result[row[key]] = row.count));
  return result;
}

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const TODAY = "date('now', 'localtime')";

// HEALTH CHECK: is the server up, and can it reach the database?
router.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({
      status: 'ok',
      database: 'connected',
      uptime_seconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'unreachable',
      error: err.message,
    });
  }
});

// DUE SOON: unfinished tasks due within N days, plus overdue
router.get('/tasks/due-soon', (req, res) => {
  const days = parseInt(req.query.days, 10) || 7;
  const tasks = db
    .prepare(
      `SELECT tasks.*, projects.name AS project_name,
              CASE WHEN tasks.due_date < ${TODAY} THEN 1 ELSE 0 END AS is_overdue
       FROM tasks
       JOIN projects ON projects.id = tasks.project_id
       WHERE tasks.due_date IS NOT NULL
         AND tasks.status != 'done'
         AND tasks.due_date <= date('now', 'localtime', ?)
       ORDER BY tasks.due_date ASC`
    )
    .all(`+${days} days`);
  res.json(tasks);
});

// PROJECT SUMMARY
router.get('/projects/:id/summary', (req, res) => {
  const id = req.params.id;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const byStatus = db
    .prepare('SELECT status, COUNT(*) AS count FROM tasks WHERE project_id = ? GROUP BY status')
    .all(id);
  const byPriority = db
    .prepare('SELECT priority, COUNT(*) AS count FROM tasks WHERE project_id = ? GROUP BY priority')
    .all(id);
  const count = (sql) => db.prepare(sql).get(id).count;

  const totalTasks = count('SELECT COUNT(*) AS count FROM tasks WHERE project_id = ?');
  const status = countBy(byStatus, 'status', STATUSES);

  res.json({
    project,
    tasks: {
      total: totalTasks,
      by_status: status,
      by_priority: countBy(byPriority, 'priority', PRIORITIES),
      overdue: count(
        `SELECT COUNT(*) AS count FROM tasks
         WHERE project_id = ? AND status != 'done' AND due_date < ${TODAY}`
      ),
      percent_done: totalTasks ? Math.round((status.done / totalTasks) * 100) : 0,
    },
    notes: count('SELECT COUNT(*) AS count FROM notes WHERE project_id = ?'),
    prompts: count('SELECT COUNT(*) AS count FROM prompts WHERE project_id = ?'),
  });
});

// GLOBAL SEARCH
router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Search term "q" is required' });
  const term = `%${q}%`;

  res.json({
    query: q,
    projects: db
      .prepare('SELECT * FROM projects WHERE name LIKE ? OR description LIKE ?')
      .all(term, term),
    tasks: db
      .prepare(
        `SELECT tasks.*, projects.name AS project_name
         FROM tasks JOIN projects ON projects.id = tasks.project_id
         WHERE tasks.title LIKE ?`
      )
      .all(term),
    notes: db.prepare('SELECT * FROM notes WHERE body LIKE ?').all(term),
    prompts: db
      .prepare('SELECT * FROM prompts WHERE title LIKE ? OR body LIKE ?')
      .all(term, term),
  });
});

// STATS for a dashboard
router.get('/stats', (req, res) => {
  const total = (table) =>
    db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  const byStatus = db
    .prepare('SELECT status, COUNT(*) AS count FROM tasks GROUP BY status')
    .all();

  res.json({
    totals: {
      projects: total('projects'),
      tasks: total('tasks'),
      notes: total('notes'),
      prompts: total('prompts'),
    },
    tasks_by_status: countBy(byStatus, 'status', STATUSES),
    overdue_tasks: db
      .prepare(
        `SELECT COUNT(*) AS count FROM tasks
         WHERE status != 'done' AND due_date < ${TODAY}`
      )
      .get().count,
    favorite_prompts: db
      .prepare('SELECT COUNT(*) AS count FROM prompts WHERE is_favorite = 1')
      .get().count,
    top_prompts: db
      .prepare(
        `SELECT id, title, use_count FROM prompts
         WHERE use_count > 0 ORDER BY use_count DESC LIMIT 5`
      )
      .all(),
  });
});

module.exports = router;