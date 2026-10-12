const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Task tracker API is running' });
});

app.use('/projects', require('./routes/projects'));

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});