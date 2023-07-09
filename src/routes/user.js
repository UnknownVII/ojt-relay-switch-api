const router = require("express").Router();
const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");
const User = require("../../models/user");
const Device = require("../../models/device");
const { config } = require("dotenv");
config();
const tokenSecret = process.env.TOKEN_SECRET || "";

router.post("/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne().or([
      { username: usernameOrEmail },
      { email: usernameOrEmail },
    ]);

    if (!user) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    // Compare the provided password with the hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    // Generate a token
    const token = jwt.sign({ userId: user._id }, tokenSecret, {
      expiresIn: "1h",
    });

    // Update the token for all user's devices
    await Device.updateMany({ user: user._id }, { token });

    // Return the token and user ID
    res.json({ token, _id: user._id });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if username or email already exists
    const existingUser = await User.findOne().or([{ username }, { email }]);

    if (existingUser) {
      res.status(409).json({ error: "Username or email already exists" });
      return;
    }

    // Create a new user
    const newUser = new User({
      username,
      email,
      password,
    });

    // Save the user to the database
    await newUser.save();

    res.json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
