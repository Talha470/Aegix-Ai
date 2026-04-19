const router = require("express").Router();
const user = require("../controllers/users");
const { isLoggedIn, isAdmin } = require("../middlewares");

router.get("/", isLoggedIn, isAdmin, user.allUsers);
router.get("/:id", isLoggedIn, user.singleUser);
router.delete("/:id", isLoggedIn, isAdmin, user.deleteUser);

module.exports = router;