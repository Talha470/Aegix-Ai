const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ProductPageUser = require("../models/productPageUsers");
const DemoRequest = require("../models/demoRequests");
const sendMail = require("../utils/sendMail");

const getPlanMeta = (selectedPlan = "") => {
  switch (selectedPlan) {
    case "Starter Plan":
      return {
        price: "$29",
        duration: "1 month",
        validityDays: 30,
      };

    case "Professional Plan":
      return {
        price: "$79",
        duration: "3 months",
        validityDays: 90,
      };

    case "Enterprise Plan":
      return {
        price: "$149",
        duration: "6 months",
        validityDays: 180,
      };

    case "Live Demo":
      return {
        price: "$0",
        duration: "Demo Access",
        validityDays: 7,
      };

    default:
      return {
        price: "",
        duration: "",
        validityDays: 0,
      };
  }
};

module.exports.signup = async (req, res, next) => {
  try {
    const { name, email, phone, password, selectedPlan = "" } = req.body;

    const existsEmail = await ProductPageUser.findOne({ email });
    if (existsEmail) {
      return res.status(400).json({ msg: "Email already exists" });
    }

    const existsPhone = await ProductPageUser.findOne({ phone });
    if (existsPhone) {
      return res.status(400).json({ msg: "Phone number already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const planMeta = getPlanMeta(selectedPlan);
    const now = new Date();

    let planValidTill = null;
    if (planMeta.validityDays > 0) {
      planValidTill = new Date(now);
      planValidTill.setDate(planValidTill.getDate() + planMeta.validityDays);
    }

    const user = await ProductPageUser.create({
      name,
      email,
      phone,
      password: hash,
      selectedPlan,
      selectedPlanPrice: planMeta.price,
      selectedPlanDuration: planMeta.duration,
      planSelectedAt: selectedPlan ? now : null,
      planValidTill,
    });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await sendMail({
      to: email,
      subject: "Aegix AI Account Created Successfully",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Hello ${name},</h2>
          <p>Your Aegix AI account has been created successfully.</p>

          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>

          ${
            selectedPlan
              ? `
                <p><strong>Selected Plan:</strong> ${selectedPlan}</p>
                <p><strong>Plan Price:</strong> ${planMeta.price || "N/A"}</p>
                <p><strong>Plan Duration:</strong> ${planMeta.duration || "N/A"}</p>
                <p><strong>Valid Till:</strong> ${
                  planValidTill ? planValidTill.toLocaleString() : "N/A"
                }</p>
              `
              : `<p><strong>Selected Plan:</strong> Not selected yet</p>`
          }

          <p>Your validation and account details have been received successfully.</p>
          <p>Please contact us at <strong>support@rummasprings.com</strong>.</p>
          <p>Our agent will contact you for further server security assistance.</p>

          <p>Regards,<br />Aegix AI Team</p>
        </div>
      `,
    });

    res.status(201).json({
      msg: "Product page signup success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        selectedPlan: user.selectedPlan,
        selectedPlanPrice: user.selectedPlanPrice,
        selectedPlanDuration: user.selectedPlanDuration,
        planSelectedAt: user.planSelectedAt,
        planValidTill: user.planValidTill,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await ProductPageUser.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "No user found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ msg: "Wrong password" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const resetLink =
      process.env.RESET_PASSWORD_LINK || "http://localhost:3000/reset-password";

    await sendMail({
      to: user.email,
      subject: "Aegix AI Login Alert",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Hello ${user.name},</h2>
          <p>Your Aegix AI account has just been logged in.</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Login Time:</strong> ${new Date().toLocaleString()}</p>

          <p>If this login was performed by you, no action is needed.</p>
          <p>If this was not you, please update your password immediately using the link below:</p>

          <p>
            <a href="${resetLink}" target="_blank" style="color:#0066ff; font-weight:bold;">
              Update Password
            </a>
          </p>

          <p>For help, please contact: <strong>support@rummasprings.com</strong></p>
          <p>Regards,<br />Aegix AI Team</p>
        </div>
      `,
    });

    res.json({
      msg: "Product page login success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        selectedPlan: user.selectedPlan,
        selectedPlanPrice: user.selectedPlanPrice,
        selectedPlanDuration: user.selectedPlanDuration,
        planSelectedAt: user.planSelectedAt,
        planValidTill: user.planValidTill,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports.profile = async (req, res, next) => {
  try {
    const user = await ProductPageUser.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};

module.exports.deleteAllUsers = async (req, res, next) => {
  try {
    await ProductPageUser.deleteMany({});
    res.json({ msg: "All product page users deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports.deleteAllDemoRequests = async (req, res, next) => {
  try {
    await DemoRequest.deleteMany({});
    res.json({ msg: "All demo requests deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports.selectPlan = async (req, res, next) => {
  try {
    const { interest } = req.body;

    const user = await ProductPageUser.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const planMeta = getPlanMeta(interest);

    if (!planMeta.price || !planMeta.duration) {
      return res.status(400).json({ msg: "Invalid selected plan" });
    }

    const now = new Date();
    let validTill = null;

    if (planMeta.validityDays > 0) {
      validTill = new Date(now);
      validTill.setDate(validTill.getDate() + planMeta.validityDays);
    }

    user.selectedPlan = interest;
    user.selectedPlanPrice = planMeta.price;
    user.selectedPlanDuration = planMeta.duration;
    user.planSelectedAt = now;
    user.planValidTill = validTill;

    await user.save();

    await sendMail({
      to: user.email,
      subject: "Your Aegix AI Plan Selection Confirmation",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Hello ${user.name},</h2>
          <p>Thank you for choosing an Aegix AI package.</p>

          <p><strong>Selected Plan:</strong> ${user.selectedPlan}</p>
          <p><strong>Price:</strong> ${user.selectedPlanPrice}</p>
          <p><strong>Duration:</strong> ${user.selectedPlanDuration}</p>
          <p><strong>Valid Till:</strong> ${user.planValidTill ? user.planValidTill.toDateString() : "N/A"}</p>

          <p>Your package has been registered successfully.</p>
          <p>Please contact us at <strong>support@rummasprings.com</strong>.</p>
          <p>Our support team or agent will reach out to help secure your server further.</p>

          <p>Regards,<br />Aegix AI Team</p>
        </div>
      `,
    });

    res.json({
      msg: "Plan selected successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        selectedPlan: user.selectedPlan,
        selectedPlanPrice: user.selectedPlanPrice,
        selectedPlanDuration: user.selectedPlanDuration,
        planSelectedAt: user.planSelectedAt,
        planValidTill: user.planValidTill,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports.requestDemo = async (req, res, next) => {
  try {
    const { name, email, interest, message } = req.body;

    const demoLink = process.env.DEMO_LINK || "http://localhost:3000/demo";

    await DemoRequest.create({
      name,
      email,
      interest,
      message,
      demoLink,
    });

    await sendMail({
      to: email,
      subject: "Your Aegix AI Demo Link",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Hello ${name},</h2>
          <p>Thank you for requesting a demo for Aegix AI.</p>
          <p><strong>Interest:</strong> ${interest}</p>
          <p><strong>Message:</strong> ${message || "N/A"}</p>
          <p>Please use the link below to access your demo:</p>
          <p>
            <a href="${demoLink}" target="_blank" style="color:#0066ff; font-weight:bold;">
              Open Demo
            </a>
          </p>
          <p>For support, contact <strong>support@rummasprings.com</strong></p>
          <p>Regards,<br />Aegix AI Team</p>
        </div>
      `,
    });

    res.status(200).json({
      msg: "Demo link sent successfully",
      demoLink,
    });
  } catch (err) {
    next(err);
  }
};