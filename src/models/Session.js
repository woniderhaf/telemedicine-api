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
  telemed_discussion_id:{
    type:Number
  },
  patient_id:{
    type:String
  },
  employee_id:{
    type:String
  },
  opened_at:{
    type:String
  },
  patient_name:{
    type:String
  },
  employee_name:{
    type:String
  },
  medmis_upload_files_url:{
    type:String
  },
})

Session.plugin(timestamp)
module.exports = mongoose.model('Session', Session)