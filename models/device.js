const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  status: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  name: {
    type: String,
    unique: true,
  },
  channels: [channelSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Device = mongoose.model("Device", deviceSchema);

module.exports = Device;
