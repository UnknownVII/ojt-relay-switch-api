const router = require("express").Router();
const Device = require("../../models/device");
const User = require("../../models/user");
const verify = require("../../app/verify-device");
const verifyToken = require("../../app/verify-token");

const jwt = require("jsonwebtoken");

const { config } = require("dotenv");

const { deviceValidationSchema } = require("../../app/validate");

config();
const tokenSecret = process.env.TOKEN_SECRET || "";
//REGISTER DEVICES TO USER
router.post("/devices/register", verifyToken, async (req, res) => {
  const userId = req.query.userId;
  const deviceId = req.query.deviceId;
  const token = req.headers.auth_token;
  try {
    // Find the user by their ID
    const user = await User.findById(userId);

    if (!user) {
      // User not found
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the device already exists
    const existingDevice = await Device.findOne({ deviceId });

    if (existingDevice) {
      // Device already registered
      return res.status(400).json({ error: "Device already registered" });
    }

    let name;
    let counter = 1;
    let isNameUnique = false;
    for (; !isNameUnique; counter++) {
      name = `Device ${counter}`;

      const deviceWithName = await Device.findOne({ name });

      if (!deviceWithName) {
        isNameUnique = true;
      }
    }

    const newDevice = new Device({
      deviceId: deviceId,
      token: token,
      user: userId,
      status: "active",
      name: name,
    });

    // Save the device to the database
    await newDevice.save();

    // Add the device to the user's devices array
    user.devices.push(newDevice._id);
    await user.save();

    res.json({ message: "Device registered successfully" });
  } catch (error) {
    console.error("Error registering device:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//GET DEVICES FROM USER
router.get("/devices", verifyToken, async (req, res) => {
  const userId = req.query.userId;

  try {
    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    const devices = await Device.find({ user: userId });

    res.json(devices);
    console.log("[Device  ]", "Get devices by userId");
  } catch (error) {
    console.error("Error retrieving devices:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//UPDATE DEVICE'S NAME
router.put("/devices/update-name", async (req, res) => {
  const deviceId = req.query.deviceId;
  const newName = req.body.newName;

  try {
    if (!deviceId || !newName) {
      return res.status(400).json({ error: "Missing deviceId or newName" });
    }

    // Check if the new name already exists for another device
    const existingDevice = await Device.findOne({ name: newName });
    if (existingDevice && existingDevice._id.toString() !== deviceId) {
      return res.status(400).json({ error: "Device name already exists" });
    }

    const device = await Device.findByIdAndUpdate(
      deviceId,
      { name: newName },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json(device);
    console.log("[Device  ]", "Name updated successfully");
  } catch (error) {
    console.error("Error updating device name:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//UPDATE DEVICE'S STATUS
router.put("/devices/update-status", verifyToken, async (req, res) => {
  const deviceId = req.query.deviceId;

  try {
    // Find the device by deviceId
    const device = await Device.findOne({ deviceId });

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Toggle the device status
    device.status = device.status === "active" ? "inactive" : "active";

    // Turn off all channel values if status is set to inactive
    if (device.status === "inactive") {
      device.channels.forEach((channel) => {
        channel.status = false;
      });
    }

    // Save the updated device to the database
    await device.save();

    res.json({ message: "Device status updated successfully" });
  } catch (error) {
    console.error("Error updating device status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//DELETE and UNREGISTER DEVICE FROM USER
router.delete("/devices/unregister", verifyToken, async (req, res) => {
  const deviceId = req.query.deviceId;
  const userId = req.query.userId;

  try {
    // Find the user by their ID
    const user = await User.findById(userId);

    if (!user) {
      // User not found
      return res.status(404).json({ error: "User not found" });
    }

    // Find the device to be unregistered
    const device = await Device.findOne({ deviceId });

    if (!device) {
      // Device not found
      return res.status(404).json({ error: "Device not found" });
    }

    // Check if the device belongs to the user
    if (device.user.toString() !== userId) {
      // Device doesn't belong to the user
      return res
        .status(403)
        .json({ error: "Device doesn't belong to the user" });
    }

    // Remove the device from the user's devices array
    user.devices.pull(device._id);
    await user.save();

    // Delete the device from the database
    await device.remove();

    res.json({ message: "Device unregistered and removed successfully" });
  } catch (error) {
    console.error("Error unregistering device:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//ADD CHANNEL ON THE DEVICE
router.post("/devices/channels", verifyToken, async (req, res) => {
  const deviceId = req.query.deviceId;
  console.log(deviceId);

  const device = await Device.findOne({ deviceId });

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    console.error("[Device  ]", "Device not found");
    return;
  }

  try {
    // Find the device by deviceId and update channels
    const updatedDevice = await Device.findOneAndUpdate(
      { deviceId: device.deviceId },
      {
        $push: {
          channels: {
            name: `Channel ${device.channels.length + 1}`,
            status: false,
          },
        },
      },
      { new: true }
    );

    if (!updatedDevice) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    res.json({ message: "Channel added successfully" });
  } catch (error) {
    console.error("Error adding channel:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//DELETE CHANNEL ON THE DEVICE
router.delete("/devices/channels", verifyToken, async (req, res) => {
  const deviceId = req.query.deviceId;
  const channelId = req.query.channelId;

  try {
    // Find the device by deviceId
    const device = await Device.findOne({ deviceId });

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Find the channel to be removed
    const channel = device.channels.find(
      (ch) => ch._id.toString() === channelId
    );

    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    // Check if the channel status is active
    if (channel.status) {
      res.status(400).json({ error: "Cannot delete an active channel" });
      return;
    }

    // Remove the channel from the channels array
    device.channels = device.channels.filter(
      (ch) => ch._id.toString() !== channelId
    );

    // Decrement the channel number for remaining channels
    device.channels.forEach((ch, index) => {
      ch.name = `Channel ${index + 1}`;
    });

    // Save the updated device to the database
    await device.save();

    res.json({ message: "Channel removed successfully" });
  } catch (error) {
    console.error("Error removing channel:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//UPDATE CHANNEL STATUS
router.put("/devices/channels", verifyToken, async (req, res) => {
  const deviceId = req.query.deviceId;
  const channelId = req.query.channelId;

  try {
    // Find the device by deviceId
    const device = await Device.findOne({ deviceId });

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Find the channel to be updated
    const channel = device.channels.find(
      (ch) => ch._id.toString() === channelId
    );

    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    // Update the channel status by negating its current value
    channel.status = !channel.status;

    // Save the updated device to the database
    await device.save();

    res.json(device.channels);
  } catch (error) {
    console.error("Error updating channel status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//UPDATE CHANNEL NAME
router.put("/devices/update-channel-name", async (req, res) => {
  const channelId = req.query.channelId;
  const newName = req.body.newName;

  try {
    if (!channelId || !newName) {
      return res.status(400).json({ error: "Missing channelId or newName" });
    }

    // Find the device containing the channel
    const device = await Device.findOne({ "channels._id": channelId });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Find the channel within the device's channels array
    const channel = device.channels.find(
      (channel) => channel._id.toString() === channelId
    );

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Check if the new name already exists for another channel within the device
    const existingChannel = device.channels.find(
      (ch) => ch.name === newName && ch._id.toString() !== channelId
    );
    if (existingChannel) {
      return res.status(400).json({ error: "Channel name already exists" });
    }

    // Update the channel's name
    channel.name = newName;

    // Save the updated device
    await device.save();

    res.json(device);
    console.log("[Device]", "Channel name updated successfully");
  } catch (error) {
    console.error("Error updating channel name:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//DEVICE STATUS CRON JOB CHECKER
router.get("/devices/check-activation", async (req, res) => {
  const deviceId = req.query.deviceId;

  try {
    // Check if the device exists and is active
    const device = await Device.findOne({ deviceId, status: "active" });

    if (!device) {
      // Device not found or not active
      return res.json({ activated: false });
    }

    // Device is active
    return res.json({ activated: true });
  } catch (error) {
    console.error("Error checking device activation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/devices/filter", async (req, res) => {
  try {
    const { userId } = req.query;

    // Check if userId is provided
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Find the user by userId
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find devices belonging to the user
    const devices = await Device.find({ user: user._id });

    res.json(devices);
    console.error("[Device]", "Get filtered devices");
  } catch (error) {
    console.error("Error retrieving devices:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/devices/initialize", async (req, res) => {
  const { deviceId } = req.body;
  try {
    // Check if the device already exists
    const existingDevice = await Device.findOne({ deviceId });

    if (existingDevice) {
      // Device already registered, return the existing token
      res.json({
        deviceId: existingDevice.deviceId,
        token: existingDevice.token,
        name: existingDevice.name,
      });

      console.error("[Device  ]", "Successfully Retrieved");
    } else {
      // Generate a new token for the device
      const token = jwt.sign({ deviceId }, tokenSecret);

      let name;
      let counter = 1;
      let isNameUnique = false;
      for (; !isNameUnique; counter++) {
        name = `Device ${counter}`;

        const deviceWithName = await Device.findOne({ name });

        if (!deviceWithName) {
          isNameUnique = true;
        }
      }
      // Save the new device to the database
      //VALIDATION OF DATA
      const { error } = deviceValidationSchema({
        deviceId,
        token,
        name,
      });
      if (error)
        return res.status(400).json({ error: error.details[0].message });
      const newDevice = new Device({ deviceId, token, name });
      await newDevice.save();
      const deviceRes = await Device.findOne({ deviceId });

      res.json({
        deviceId: deviceRes.deviceId,
        token: deviceRes.token,
        name: deviceRes.name,
      });

      console.error("[Device  ]", "Successfully Added");
    }
  } catch (error) {
    console.error("Error registering device:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/devices/:deviceId/status", verify, async (req, res) => {
  const deviceId = req.params.deviceId;
  const { status } = req.body;

  try {
    // Find the device by deviceId
    const device = await Device.findOne({ deviceId });

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Update the device status
    device.status = status;

    // If status is set to inactive, turn off all channel values
    if (status === "inactive") {
      device.channels.forEach((channel) => {
        channel.status = false;
      });
    }

    // Save the updated device to the database
    await device.save();

    res.json({ message: "Device status updated successfully" });
  } catch (error) {
    console.error("Error updating device status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/devices/:deviceId/channels", verify, async (req, res) => {
  const deviceId = req.params.deviceId;

  try {
    // Find the device by deviceId
    const device = await Device.findOne({ deviceId });

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Extract the channels' information
    const channels = {};
    device.channels.forEach((channel) => {
      channels[channel.name] = channel.status;
    });

    res.json({ channels });
  } catch (error) {
    console.error("Error retrieving channels:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/devices/:deviceId/assign-user", async (req, res) => {
  const deviceId = req.params.deviceId;
  const { userId } = req.body;

  try {
    // Find the device by deviceId
    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Find the user by userId
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Assign the user to the device
    device.user = user._id;

    // Save the updated device
    await device.save();

    res.json({ message: "User assigned to device successfully" });
  } catch (error) {
    console.error("Error assigning user to device:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
