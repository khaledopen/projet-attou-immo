const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Test server is running...');
});

app.listen(5001, () => {
  console.log('Test server listening on port 5001');
});
