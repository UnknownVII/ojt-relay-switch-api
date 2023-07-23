const router = require("express").Router();
const validateHmac = require("../../utils/global-hmac");
const validateApiKey = require("../../utils/global-validate-api-key");
const moment = require("moment-timezone");

router.get(
  "/current-time",
  // validatehmac,
  // validateapikey,
  (req, res) => {
    const currentDate = moment().tz("Asia/Manila").format("MM-DD-YYYY");
    const currentTime = moment().tz("Asia/Manila").format("HH:mm");

    res.json({ date: currentDate, time: currentTime });
  }
);

module.exports = router;
