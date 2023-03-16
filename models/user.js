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
  const validDomains = ['iba.edu.pk', 'khi.iba.edu.pk'];
// Signup API
router.post('/signup', async (req, res) => {
  const { username, email, password,erp } = req.body;
  
  // Create a new user object
  const user = new User({
    username,
    email,
    password,
    erp
  });

  try {
    const existingUser = await User.findOne({ email: req.body.email });
    const existingUsererp = await User.findOne({ erp: req.body.erp });
    const domain = email.split('@')[1];
    if (!email || !password || !username)
      return res.status(400).json({ msg: "Not all fields have been entered." });
    if (!validDomains.includes(domain)) {
      return res.status(400).send('Invalid email domain');
    }
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    else if (existingUsererp) {
      return res.status(400).json({ message: 'erp already exists' });
    }
    // Save the user object to the database
    await user.save();
    res.status(201).json({ message: 'User created successfully.' });
    //console.log(user._id)
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
//edit user
router.put('/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  //console.log(userId)
  const { name,password} = req.body;
try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.username = name || user.username;
    user.password = password || user.password;

    await user.save();

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;
