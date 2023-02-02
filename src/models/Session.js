// plug-ins
const mongoose = require('mongoose')
const timestamp = require('mongoose-timestamp')

// schema
const Session = new mongoose.Schema({
  url: {
    type: String,
    default: '',
    trim:true,
  },
  roomId: {
    type:String
  },
  data:{
    type: Object
  }
})

Session.plugin(timestamp)
module.exports = mongoose.model('Session', Session)