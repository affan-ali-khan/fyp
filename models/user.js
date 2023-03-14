const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../schema/user');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Connect to MongoDB
mongoose.connect('mongodb+srv://ebadurrehman:Iba22395@fyp.sphtxvo.mongodb.net/routify', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to database.');
  })
  .catch((error) => {
    console.log('Connection failed.');
  });

// Signup API
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  // Create a new user object
  const user = new User({
    username,
    email,
    password
  });

  try {
    // Save the user object to the database
    await user.save();
    res.status(201).json({ message: 'User created successfully.' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An error occurred.' });
  }
});

module.exports = router;
