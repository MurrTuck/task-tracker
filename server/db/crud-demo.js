const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tracker.db'));
db.pragma('foreign_keys = ON');

// CREATE
const project = db
  .prepare('INSERT INTO projects (name, description) VALUES (?, ?)')
  .run('Website Redesign', 'Refresh the company site');
const projectId = project.lastInsertRowid;

const task = db
  .prepare('INSERT INTO tasks (project_id, title, priority) VALUES (?, ?, ?)')
  .run(projectId, 'Draft homepage wireframe', 'high');
const taskId = task.lastInsertRowid;

db.prepare('INSERT INTO notes (project_id, task_id, body) VALUES (?, ?, ?)')
  .run(projectId, taskId, 'Waiting on brand colors from design.');

// READ
console.log('All tasks for project:');
console.log(
  db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(projectId)
);

console.log('Tasks joined with project name:');
console.log(
  db.prepare(`
    SELECT tasks.title, tasks.status, projects.name AS project
    FROM tasks
    JOIN projects ON projects.id = tasks.project_id
  `).all()
);

// UPDATE
db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run('in_progress', taskId);
console.log('After update:');
console.log(db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId));

// DELETE
db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
console.log('Tasks left after deleting project (cascade):');
console.log(db.prepare('SELECT * FROM tasks').all());

db.close();