const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../schema/user');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

// Signin API
router.post('/signin', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username, password }).exec();

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
    } else {
      res.status(200).json({ message: 'Sign in successful' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
