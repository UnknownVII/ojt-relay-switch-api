const Joi = require("@hapi/joi");

//OBJECT VALIDATION
const deviceValidationSchema = (data) => {
  const schema = Joi.object({
    deviceId: Joi.string()
      .pattern(
        new RegExp(
          "^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$"
        )
      )
      .required(),
  });

  return schema.validate(data);
};
module.exports.deviceValidationSchema = deviceValidationSchema;
