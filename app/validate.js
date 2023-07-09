const Joi = require("@hapi/joi");

//OBJECT VALIDATION
const deviceValidationSchema = (data) => {
  const schema = Joi.object({
    deviceId: Joi.string()
      .pattern(
        new RegExp(
          "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[4][a-fA-F0-9]{3}-[89aAbB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$"
        )
      )
      .required(),
    name: Joi.string().required(),
    token: Joi.string().required(),
  });

  return schema.validate(data);
};
module.exports.deviceValidationSchema = deviceValidationSchema;
