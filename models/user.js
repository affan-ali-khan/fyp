const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../schema/user');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv').config();
const JWT_KEY = process.env.JWT_KEY;
//const bcrypt = require("bcryptjs");

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
  var { username, email, password,erp } = req.body;
  
  // Create a new user object
  const salt = await bcrypt.genSalt();
  const passwordHash = await bcrypt.hash(password, salt);
  //console.log(password)
  password=passwordHash
  //console.log(passwordHash)
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
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    const userH = await User.findOne({ email });
    const isMatch = await bcrypt.compare(password, userH.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials." });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
    } else {
      const token = jwt.sign({
        email: user.email,
        userId: user._id
      }, 
      process.env.JWT_KEY, 
      {
        expiresIn: "1h"
      },
      );
      res.status(200).json({ message: 'Sign in successful', token: token });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

//Signout API
router.post('/signout', async (req, res) => {
  try {
    // Clear the token from the client-side by removing the token cookie
    res.clearCookie('token');
    
    res.status(200).json({ message: 'Sign out successful' });
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
