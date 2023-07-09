const Device = require("../models/device");

module.exports = async function (req, res, next) {
  const deviceId = req.params.deviceId;
  const token = req.headers.authorization;

  try {
    // Check if the device exists
    const device = await Device.findOne({ deviceId });

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Verify device token
    if (device.token !== token) {
      res.status(401).json({ error: "Invalid device token" });
      return;
    }

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Error verifying device token:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
