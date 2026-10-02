const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tracker.db'));
db.pragma('foreign_keys = ON');

// CREATE
const result = db
  .prepare('INSERT INTO prompts (title, body, category) VALUES (?, ?, ?)')
  .run(
    'Grammar check',
    'Review this message for grammar and clarity. Keep my tone.',
    'writing'
  );
const promptId = result.lastInsertRowid;

db.prepare('INSERT INTO prompts (title, body, category) VALUES (?, ?, ?)')
  .run('Explain code', 'Explain this code line by line for a beginner.', 'coding');

// READ: by category
console.log('Writing prompts:');
console.log(
  db.prepare('SELECT id, title FROM prompts WHERE category = ?').all('writing')
);

// READ: search title and body
const term = '%code%';
console.log('Search for "code":');
console.log(
  db.prepare('SELECT id, title FROM prompts WHERE title LIKE ? OR body LIKE ?')
    .all(term, term)
);

// "CALL UPON" a prompt: fetch it and record the use
const use = db.transaction((id) => {
  db.prepare(
    `UPDATE prompts
     SET use_count = use_count + 1, last_used_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(id);
  return db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
});
console.log('Using prompt:');
console.log(use(promptId));

// UPDATE
db.prepare(
  'UPDATE prompts SET is_favorite = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
).run(promptId);

// READ: most used first
console.log('Most used:');
console.log(
  db.prepare('SELECT title, use_count FROM prompts ORDER BY use_count DESC').all()
);

// DELETE
db.prepare('DELETE FROM prompts WHERE id = ?').run(promptId);

db.close();