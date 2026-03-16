const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  done: {
    type: Boolean,
    default: false,
  }
});

const PhaseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  tasks: [TaskSchema]
}, { timestamps: true });

module.exports = mongoose.model('Phase', PhaseSchema);
