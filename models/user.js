const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv').config();
const JWT_KEY = process.env.JWT_KEY;
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');

const axios = require('axios');
const polyline = require('polyline');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

  const validDomains = ['iba.edu.pk', 'khi.iba.edu.pk'];

// Create a new transporter object for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "projectecommercetest7@gmail.com",
    pass: "lyeihxdkhgsvkxap",
  },
});



// Add a new API endpoint to handle OTP verification
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Find the user in the database by email address
    const user = await User.findOne({ email });

    // Check if the OTP matches the one stored in the database
    if (user && user.otp === otp) {
      // Mark the user account as verified
      user.verified = true;
      user.otp = undefined;
      await user.save();

      res.status(200).json({ message: 'OTP verification successful.' });
    } else {
      res.status(400).json({ message: 'Invalid OTP.' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An error occurred.' });
  }
});

  //Signup API
  router.post('/signup', async (req, res) => {
    const { username, email, password, erp } = req.body;
  
    // Create a new user object
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);
    const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
    const user = new User({
      username,
      email,
      password: passwordHash,
      erp,
      otp, // Store the OTP in the database
    });
  
    try {
      const existingUser = await User.findOne({ email });
      const existingUsererp = await User.findOne({ erp });
      const domain = email.split('@')[1];
      if (!email || !password || !username) {
        return res.status(400).json({ message: 'Not all fields have been entered.' });
      }
      if (!validDomains.includes(domain)) {
        return res.status(400).json({ message: 'Invalid email domain.' });
      }
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists.' });
      }
      if (existingUsererp) {
        return res.status(400).json({ message: 'ERP already exists.' });
      }
      
  
      // Send the OTP to the user's email address
      await transporter.sendMail({
        from: process.env.EMAIL_USERNAME,
        to: email,
        subject: 'OTP Verification',
        text: `Your OTP is ${otp}.`,
      });
  
      
      res.status(201).json({ message: 'User created successfully. Please check your email for the OTP.' });
      
      // Save the user object to the database
      await user.save();
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
    const verify = await User.findOne({ email });
    const isMatch = await bcrypt.compare(password, userH.password);
    if (!verify.verified) return res.status(400).json({ msg: "Not Verified." });
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
      res.status(200).json({ message: 'Sign in successful', token: token, userid: user._id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


//Sign Out API
const auth = (req, res, next) => {
  const header = req.header('Authorization');
  if (!header) {
    return res.status(401).json({ error: 'Not authorized to access this resource' });
  }
  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized to access this resource' });
  }
};

router.post('/signout', auth, async (req, res) => {
  try {
    // find the user by email and delete the session token
    const user = await User.findOneAndUpdate({ email: req.user.email }, { sessionToken: '' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//edit user
router.put('/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  //console.log(userId)
  const { name,password} = req.body;
  const salt = await bcrypt.genSalt();
  const passwordHash = await bcrypt.hash(password, salt);
   
try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.username = name || user.username;
    user.password = passwordHash;

    await user.save();

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/forget_password', async (req, res) => {
  const { email } = req.body;
  const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });

  try {
    // Find the user in the database by email address
    const user = await User.findOne({ email });
    if (!user) {
      res.status(200).json({ message: 'no user exist' });
    }
    else{
      await transporter.sendMail({
        from: process.env.EMAIL_USERNAME,
        to: email,
        subject: 'password reset',
        text: `Your OTP is ${otp}.`,
      });
      user.otp=otp
      await user.save();
      res.json({ message: 'otp sent successfully' });

    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An error occurred.' });
  }
});
router.get('/allusers', async (req, res) => {
  const users = await User.find();
  try{
    res.send(users);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An error occurred.' });
  }

})


router.post('/users/:id/schedule', async (req, res) => {
  const id = req.params.id;
  const { day, start_time, end_time, start_campus,end_campus,role } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (!Array.isArray(user.schedule) || !user.schedule) {
      user.schedule = [];
    }
    let courseTime = {
      day,
      start: start_time,
      end: end_time,
      start_campus:start_campus,
      end_campus:end_campus,
      role:role,
      flag:true
    };
    user.schedule.push(courseTime);
    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
//edit schedule
router.put('/users/shedule/:user_id/:day', async (req, res) => {
  const userId=req.params.user_id
  const day = req.params.day;

  const {start_time, end_time, start_campus,end_campus,role } = req.body;
  
    const user = await User.findById(userId);
    const id = user.schedule[1]["_id"];
    const daySch = user.schedule.filter(schedule => schedule.day === day);
    //console.log(mondaySch[0].start)
    try{
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    daySch[0].start=start_time
    daySch[0].end=end_time
    daySch[0].start_campus=start_campus
    daySch[0].end_campus=end_campus
    daySch[0].role=role
    await user.save()
    res.json(user.schedule);
  }

  catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
})
  
router.get('/allshedule/:userId/:sheduleId', async (req, res) => {
  const userId=req.params.userId
  const sch_Id = req.params.sheduleId;
  const user = await User.findById(userId);
  const id = user.schedule[0]["_id"];

  try{
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (sch_Id!=id) {
      return res.status(404).json({ message: 'schedule not found' });
    }
    res.json(user.schedule)
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An error occurred.' });
  }

})
///DAY
router.get('/day/:userId/:day', async (req, res) => {
  const day=req.params.day
  const userId=req.params.userId
  const users = await User.findById(userId);
  const shedule=users.schedule
  var rday=[];
  for (let i=0; i< shedule.length; i++){
    if(
      shedule[i].day == day
    )
    rday=shedule[i]
  }
   try{

      res.send(rday)
   } catch (error) {
     console.log(error);
     res.status(500).json({ message: 'An error occurred.' });
   }
})
router.post('/:userId/location', async (req, res) => {
  const { latitude, longitude } = req.body;
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingLocation = user.location.find(loc => loc.latitude === latitude && loc.longitude === longitude);

    if (existingLocation) {
      return res.status(400).json({ error: 'Location already exists for the user' });
    }

    user.location.push({
      latitude: latitude,
      longitude: longitude
    });

    await user.save();

    res.send('Saved user location');

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to save user location' });
  }
});
// // Define the Google Maps API key
// const API_KEY = 'AIzaSyDvGu0s5AniaCriuxDEYyHA53KqUdNOSbI';

// // Define the maximum distance a person can be from the route in meters
// const MAX_DISTANCE = 130000;

// // Define the starting and ending addresses
// const startAddress = '1600 Amphitheatre Parkway, Mountain View, CA';
// const endAddress = '2800 E Observatory Rd, Los Angeles, CA';

// // Define the list of people's coordinates
// const peopleCoordinates = [
//   { lat: 37.4224764, lng: -122.0842499 },
//   { lat: 37.4228321, lng: -122.0844533 },
//   { lat: 37.4230471, lng: -122.0845406 },
//   { lat: 37.4231468, lng: -122.0846093 },
//   { lat: 37.4234419, lng: -122.0848517 },
//   { lat: 37.4194316, lng: -122.0845174 },
//   { lat: 37.4165019, lng: -122.0877918 },
//   { lat: 37.4189074, lng: -122.0908866 },
//   { lat: 37.4218618, lng: -122.0934526 },
//   { lat: 37.428102, lng: -122.0839099 },
//   { lat: 87.428102, lng: -122.0839099 },
// ];;

// // Decode a polyline string into an array of coordinates
// function decodePolyline(polylineString) {
//   return polyline.decode(polylineString).map((point) => {
//     return { lat: point[0], lng: point[1] };
//   });
// }

// // Calculate the distance between two points in meters using the Haversine formula
// function haversineDistance(point1, point2) {
//   const R = 6371e3;
//   const φ1 = (point1.lat * Math.PI) / 180;
//   const φ2 = (point2.lat * Math.PI) / 180;
//   const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
//   const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

//   const a =
//     Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//     Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//   return R * c;
// }

// // Calculate the distance between a point and a line segment in meters
// function pointToLineDistance(point, lineStart, lineEnd) {
//   const d1 = haversineDistance(point, lineStart);
//   const d2 = haversineDistance(point, lineEnd);
//   const d3 = haversineDistance(lineStart, lineEnd);
//   const s = (d1 + d2 + d3) / 2;
//   const area = Math.sqrt(s * (s - d1) * (s - d2) * (s - d3));
//   const distance = (2 * area) / d3;

//   return distance;
// }

// // Get the route between two addresses using the Google Maps API
// async function getRoute(startAddress, endAddress) {
//   const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${startAddress}&destination=${endAddress}&key=${API_KEY}`;

//   const response = await axios.get(apiUrl);
//   console.log(response.data);

//   if (response.data.status !== 'OK') {
//     throw new Error(`Error getting route: ${response.data.status}`);
//   }

//   return response.data;
  
// }

// // Find the coordinates of people within a certain distance of the route
// async function getPeopleOnRoute(startAddress, endAddress, peopleCoordinates, maxDistance) {
//   const routeResponse = await getRoute(startAddress, endAddress);

// const routePolyline = routeResponse.routes[0].overview_polyline.points;
// const routeCoordinates = decodePolyline(routePolyline);
// console.log(routePolyline);

// const peopleOnRoute = [];

// for (const person of peopleCoordinates) {
// for (let i = 0; i < routeCoordinates.length - 1; i++) {
// const lineStart = routeCoordinates[i];
// const lineEnd = routeCoordinates[i + 1];


//   const distance = pointToLineDistance(person, lineStart, lineEnd);

//   if (distance < maxDistance) {
//     peopleOnRoute.push(person);
//     break;
//   }
// }
// }

// return peopleOnRoute;
// }

// // Call the function to get the list of people on the route
// getPeopleOnRoute(startAddress, endAddress, peopleCoordinates, MAX_DISTANCE)
// .then((peopleOnRoute) => {
// console.log('People on the route:', peopleOnRoute);
// })
// .catch((error) => {
// console.error(error);
// });

//Matches API for going to uni
router.get('/matches_uni/:userid/:day', async (req, res) => {
  const userid=req.params.userid
  const user = await User.findById(userid)
  const day=req.params.day
  const schedule=user.schedule
  var uday;
  var start_time;
  var start_campus;
  var role;
  var users;
  const user_lat = user.location[0].latitude;
  const user_lng = user.location[0].longitude;
  const destLat = "24.9396119";
  const destLng = "67.1142199";
  let matches;
  let filtered_users;
 
  for(let i=0; i<schedule.length; i++){
    if(schedule[i].day==day){
      uday=schedule[i]
    }
  }
  
  start_time = uday.start
  //console.log(start_time)
  //console.log(uday)
  start_campus = uday.start_campus
  role = uday.role

 try {
   if(role == 'driver'){
     users = await User.find({
       schedule: {
         $elemMatch: {
           day: day,
           start: start_time,
           start_campus: start_campus,
           role: 'passenger'
         }
       }
     }, { location: 1, _id: 0 });
   }
   else{
     users = await User.find({
       schedule: {
         $elemMatch: {
           day: day,
           start: start_time,
           start_campus: start_campus,
           $or: [
             { role: 'driver' },
             { role: 'passenger' } // Replace 'anotherRole' with the desired role
           ]
         }
       }
     }, { location: 1, _id: 0 });
   }
   //console.log(users)
  // console.log(user.location[0].latitude)
  
 //  const locations = users.map(user => user.location[0]); // getting only the first location of each user
 //  console.log(locations);
 //  const coordinates = locations.map(location => ({
 //     lat: parseFloat(location.latitude),
 //     lng: parseFloat(location.longitude)
 //   }));
 const locations = users.map(user => {
   if (user.location && user.location[0] && user.location[0].latitude) {
     return user.location[0];
   } else {
     return null;
   }
 });
 
 console.log(locations);
 
 const coordinates = locations
   .filter(location => location !== null)
   .map(location => ({
     lat: parseFloat(location.latitude),
     lng: parseFloat(location.longitude)
   }));
 
 console.log(coordinates);
 
   console.log(coordinates)
   if(coordinates.length < 1){
     res.send("no one is available")
   }else{
     
   getCoordinatesWithin3km(user_lat, user_lng, destLat, destLng, coordinates, process.env.API_KEY)
 .then(async (filteredCoordinates) => {
   matches = filteredCoordinates;
   //console.log(matches)
   //console.log(matches.length)
   
   // assuming response is the JSON object you received
   const latitudes = [];
   const longitudes = [];
   

   for (let i = 0; i < matches.length; i++) {
     latitudes.push(matches[i].lat);
     longitudes.push(matches[i].lng);
   }
   console.log(latitudes)
   //res.json({ matches });

   filtered_users = await User.find({
     'location.latitude': { $in: latitudes },
     'location.longitude': { $in: longitudes }
   }, {email: 1, username: 1, erp: 1,contact: 1, location: 1, _id: 1});
   console.log(filtered_users)
   res.json({ filtered_users });
 })
 .catch((error) => {
   console.error(error);
 });
   }
   

 } catch (error) {
   console.error(error);
   res.status(500).send('Error');
 }
});

//Matches API for going to home
router.get('/matches_home/:userid/:day', async (req, res) => {
 const userid=req.params.userid
 const user = await User.findById(userid)
 const day=req.params.day
 const schedule=user.schedule
 var uday;
 var end_time;
 var end_campus;
 var role;
 var users;
 const user_lat = user.location[0].latitude;
 const user_lng = user.location[0].longitude;
 const destLat = "24.9396119";
 const destLng = "67.1142199";
 let matches;
 let filtered_users;

 for(let i=0; i<schedule.length; i++){
   if(schedule[i].day==day){
     uday=schedule[i]
   }
 }
 
 end_time = uday.end
 //console.log(start_time)
 //console.log(uday)
 end_campus = uday.end_campus
 role = uday.role

try {
  if(role == 'driver'){
    users = await User.find({
      schedule: {
        $elemMatch: {
          day: day,
          end: end_time,
          end_campus: end_campus,
          role: 'passenger'
        }
      }
    }, { location: 1, _id: 0 });
  }
  else{
    users = await User.find({
      schedule: {
        $elemMatch: {
          day: day,
          end: end_time,
          end_campus: end_campus,
          //role: 'passenger'
        }
      }
    }, { location: 1, _id: 0 });
  }
  //console.log(users)
 // console.log(user.location[0].latitude)
 
 // const locations = users.map(user => user.location[0]); // getting only the first location of each user
 
 // const coordinates = locations.map(location => ({
 //    lat: parseFloat(location.latitude),
 //    lng: parseFloat(location.longitude)
 //  }));
 const locations = users.map(user => {
   if (user.location && user.location[0] && user.location[0].latitude) {
     return user.location[0];
   } else {
     return null;
   }
 });
 
 console.log(locations);
 
 const coordinates = locations
   .filter(location => location !== null)
   .map(location => ({
     lat: parseFloat(location.latitude),
     lng: parseFloat(location.longitude)
   }));
 
 console.log(coordinates);
 
  //console.log(coordinates)
  if(coordinates.length < 1){
    res.send("no one is available")
  }else{
    
  getCoordinatesWithin3km(user_lat, user_lng, destLat, destLng, coordinates, process.env.API_KEY)
.then(async (filteredCoordinates) => {
  matches = filteredCoordinates;
  //console.log(matches)
  //console.log(matches.length)
  
  // assuming response is the JSON object you received
  const latitudes = [];
  const longitudes = [];
  

  for (let i = 0; i < matches.length; i++) {
    latitudes.push(matches[i].lat);
    longitudes.push(matches[i].lng);
  }
  console.log(latitudes)
  //res.json({ matches });

  filtered_users = await User.find({
    'location.latitude': { $in: latitudes },
    'location.longitude': { $in: longitudes }
  }, {email: 1, username: 1, erp: 1, contact: 1,location: 1, _id: 1});
  console.log(filtered_users)
  res.json({ filtered_users });
})
.catch((error) => {
  console.error(error);
});
  }
  

} catch (error) {
  console.error(error);
  res.status(500).send('Error');
}
});

//Request Coming API
router.post('/requestcoming/:userid/:day', async (req, res) => {
 const userid=req.params.userid;
 const day=req.params.day;
 const { s_userid } = req.body;
 const s_user = await User.findById(s_userid);
 const user = await User.findById(userid);
 const daySch = user.schedule.filter(schedule => schedule.day === day);
 const S_daySch = s_user.schedule.filter(schedule => schedule.day === day);
 try {
   daySch[0].request_sent.push({
     id: s_userid,
     username: s_user.username,
     email: s_user.email,
     erp: s_user.erp
   });
   //S_daySch[0].request_coming = userid;
   S_daySch[0].request_coming.push({
     id: userid,
     username: user.username,
     email: user.email,
     erp: user.erp
   });
   console.log(S_daySch[0]);
   await user.save();
   await s_user.save();
   res.send('request sent')
 } catch (error) {
   console.error(error);
   res.status(500).send('Error retrieving directions');
 }
});
//Request Going API
router.post('/requestgoing/:userid/:day', async (req, res) => {
 const userid=req.params.userid;
 const day=req.params.day;
 const { s_userid } = req.body;
 const s_user = await User.findById(s_userid);
 const user = await User.findById(userid);
 const daySch = user.schedule.filter(schedule => schedule.day === day);
 const S_daySch = s_user.schedule.filter(schedule => schedule.day === day);
 try {
   // daySch[0].request_going = s_userid;
   daySch[0].request_sent.push({
     id: s_userid,
     username: s_user.username,
     email: s_user.email,
     erp: s_user.erp
   });
   S_daySch[0].request_going.push({
    id: userid,
    username: user.username,
    email: user.email,
    erp: user.erp
  });
   await user.save();
   await s_user.save();
   res.send('request sent')
 } catch (error) {
   console.error(error);
   res.status(500).send('Error retrieving directions');
 }
});

//Accept Going API
router.post('/acceptgoing/:userid/:day', async (req, res) => {
 const userid=req.params.userid;
 const day=req.params.day;
 const { s_userid } = req.body;
 const s_user = await User.findById(s_userid);
 const user = await User.findById(userid);
 const daySch = user.schedule.filter(schedule => schedule.day === day);
 const S_daySch = s_user.schedule.filter(schedule => schedule.day === day);

 var available_id;

 try{

   if(daySch[0].request_going.length>0){
   for ( i = 0; i < daySch[0].request_going.length; i++) {
     if(daySch[0].request_going[i]==s_userid){
     available_id = daySch[0].request_going[i];
     }
     else {
       res.status(500).send('No user with this req');
     }
   }
   
   S_daySch[0].accept_going = userid;
   console.log(available_id)
   let index = daySch[0].request_going.indexOf(available_id);
   console.log(index)
// Remove the element if found
if (index !== -1) {
 daySch[0].request_going.splice(index, 1);
}

   await user.save();
   await s_user.save()
   res.send('request ok')

 }

else {
 res.send('No req exist');
}
 }
  catch (error) {
   console.error(error);
   res.status(500).send('Error retrieving req');
 }
});
//Accept coming API
router.post('/acceptcoming/:userid/:day', async (req, res) => {
 const userid=req.params.userid;
 const day=req.params.day;
 const { s_userid } = req.body;
 const s_user = await User.findById(s_userid);
 const user = await User.findById(userid);
 const daySch = user.schedule.filter(schedule => schedule.day === day);
 const S_daySch = s_user.schedule.filter(schedule => schedule.day === day);

 var available_id;

 try{

   if(daySch[0].request_coming.length>0){
   for ( i = 0; i < daySch[0].request_coming.length; i++) {
     if(daySch[0].request_coming[i]==s_userid){
     available_id = daySch[0].request_coming[i];
     }
     else {
       res.status(500).send('No user with this req');
     }
   }
   
   S_daySch[0].accept_coming = userid;
   console.log(available_id)
   let index = daySch[0].request_coming.indexOf(available_id);
   console.log(index)
// Remove the element if found
if (index !== -1) {
 daySch[0].request_coming.splice(index, 1);
}

   await user.save();
   await s_user.save()
   res.send('request ok')

 }

else {
 res.send('No req exist');
}
 }
  catch (error) {
   console.error(error);
   res.status(500).send('Error retrieving req');
 }
});


//Function to get Matches
async function getCoordinatesWithin3km(startLat, startLng, endLat, endLng, coordinates, api_key) {
 const baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
 const url = `${baseUrl}?origin=${startLat},${startLng}&destination=${endLat},${endLng}&key=${api_key}`;
 const response = await axios.get(url);
 const routes = response.data.routes;

 if (routes.length === 0) {
   throw new Error('No routes found');
 }

 const points = routes[0].overview_polyline.points;
 const routeCoordinates = decodePolyline(points);

 const filteredCoordinates = coordinates.filter((coordinate) => {
   const distance = getDistanceFromRoute(routeCoordinates, coordinate);
   return distance <= 10;
 });

 return filteredCoordinates;
}

function decodePolyline(encoded) {
 const poly = [];
 let index = 0;
 let lat = 0;
 let lng = 0;

 while (index < encoded.length) {
   let b;
   let shift = 0;
   let result = 0;

   do {
     b = encoded.charCodeAt(index++) - 63;
     result |= (b & 0x1f) << shift;
     shift += 5;
   } while (b >= 0x20);

   const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
   lat += dlat;

   shift = 0;
   result = 0;

   do {
     b = encoded.charCodeAt(index++) - 63;
     result |= (b & 0x1f) << shift;
     shift += 5;
   } while (b >= 0x20);

   const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
   lng += dlng;

   const point = {
     lat: lat / 1e5,
     lng: lng / 1e5,
   };
   poly.push(point);
 }

 return poly;
}

function getDistanceFromRoute(routeCoordinates, coordinate) {
 let closestDistance = Number.MAX_SAFE_INTEGER;
 for (let i = 0; i < routeCoordinates.length - 1; i++) {
   const distance = getDistanceToSegment(
     routeCoordinates[i].lat,
     routeCoordinates[i].lng,
     routeCoordinates[i + 1].lat,
     routeCoordinates[i + 1].lng,
     coordinate.lat,
     coordinate.lng
   );
   if (distance < closestDistance) {
     closestDistance = distance;
   }
 }
 return closestDistance;
}

function getDistanceToSegment(x1, y1, x2, y2, x3, y3) {
 const px = x2 - x1;
 const py = y2 - y1;
 const something = px * px + py * py;
 let u = ((x3 - x1) * px + (y3 - y1) * py) / something;

 if (u > 1) {
   u = 1;
 } else if (u < 0) {
   u = 0;
 }

 const x = x1 + u * px;
 const y = y1 + u * py;

 const dx = x - x3;
 const dy = y - y3;

 return Math.sqrt(dx * dx + dy * dy) * 111.319;
 }


module.exports = router;