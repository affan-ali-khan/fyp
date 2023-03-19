const mongoose = require('mongoose');
const Schema = mongoose.Schema;
let userschema = new Schema({
  username: {
    type: String
  },
  email: {
    type: String
  },
  password: {
    type: String
  },
  erp:{
    type: Number
  },
  otp: {
    type: String
  },
  verified: {
    type: Boolean,
    default: false
  }
  })

module.exports = mongoose.model('user',userschema)