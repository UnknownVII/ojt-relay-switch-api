const { config } = require("dotenv");

config();

module.exports = function validateApiKey(req, res, next) {
  const apiKey = req.header("X-API-Key");
  if (!apiKey) {
    return res.status(401).json({ error: "Access Denied: API key is missing" });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Access Denied: API key is invalid" });
  }

  next();
};
