const mongoose = require('mongoose')

const profileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },

  fullName: String,
  phone: String,
  skills: [String],
  experience: String,
  education: String,
  location: String,

}, { timestamps: true })

module.exports = mongoose.model('Profile', profileSchema)