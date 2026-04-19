const Joi = require("joi");

const signupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(50).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const productSignupSchema = Joi.object({
  name: Joi.string().min(3).max(60).required(),

  email: Joi.string().email().required(),

  phone: Joi.string()
    .pattern(/^(\+92\d{10}|03\d{9})$/)
    .required()
    .messages({
      "string.pattern.base": "Enter a valid Pakistani phone number",
    }),

  password: Joi.string().min(8).max(50).required(),
});

const productLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const demoRequestSchema = Joi.object({
  name: Joi.string().min(2).max(60).required(),
  email: Joi.string().email().required(),
  interest: Joi.string().min(2).max(100).required(),
  message: Joi.string().allow("").max(1000),
});

const selectPlanSchema = Joi.object({
  interest: Joi.string()
    .valid(
      "Starter Plan",
      "Professional Plan",
      "Enterprise Plan",
      "Live Demo",
      "Annual Basic",
      "Annual Essential",
      "Annual Premium"
    )
    .required()
    .messages({
      "any.only": "Invalid selected plan",
    }),
});
module.exports = {
  signupSchema,
  loginSchema,
  productSignupSchema,
  productLoginSchema,
  demoRequestSchema,
  selectPlanSchema,
};