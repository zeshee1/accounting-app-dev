const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Sales page is working!');
});

module.exports = router;