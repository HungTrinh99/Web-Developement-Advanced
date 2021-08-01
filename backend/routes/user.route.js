const express = require("express");
const validate = require("../middlewares/validate");
const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");

const userSchema = require("../schemas/user.json");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { json } = require("express");
// Get all
router.get("/", async function (req, res) {
  const users = await userModel.all();
  let responseUsers = users.map((user) => {
    delete user.password;
    delete isDeleted
    delete rfToken
    return user;
  });
  return res.json(responseUsers);
});

// Get single by ID
router.get("/:id", async function (req, res) {
  const id = req.params.id;
  const user = await userModel.singleById(id);

  if (user === null) {
    res.json({
      msg: `User with id=${id} is not found`,
    });
  }

  res.json(user);
});

router.post("/", validate(userSchema), async (req, res, next) => {
  const user = req.body;
  const isUsernameExist = await userModel.singleByName(user.username);
  const isEmailExist = await userModel.singleByEmail(user.email);
  if (isUsernameExist && isEmailExist) {
    return res.status(202).json({
      msg: "Username and email have already existed!",
    });
  } else if (isUsernameExist) {
    return res.status(202).json({
      msg: "Username have already existed!",
    });
  } else if (isEmailExist) {
    return res.status(202).json({
      msg: "Email have already existed!",
    });
  } else {
    const newUser = {
      ...user,
      id: uuidv4(),
      logCreatedDate: new Date(),
      logUpdatedDate: new Date(),
      role: +user.role,
      password: bcrypt.hashSync(user.password, 10),
    };
    await userModel.add(newUser);
    delete newUser.password;

    return res.status(201).json(newUser);
  }

  return res.status(202).json({
    msg: "Error",
  });
});

// Delete user
router.patch("/delete/:id", async function (req, res) {
  const id = req.params.id;

  const selectedUser = await userModel.singleById(id);
  if (selectedUser.role === 0) {
    return res.status(202).json({
      msg: "Can not delete admin",
    });
  }
  if (selectedUser === null) {
    return res.status(202).json({
      msg: "Nothing to delete",
    });
  }

  await userModel.delete(id);
  res.json({
    msg: "User is deleted successfully!",
  });
});

// Update user
router.patch("/:id", async function (req, res) {
  const user = req.body;
  const id = req.params.id;

  const selectedUser = await userModel.singleById(id);
  if (selectedUser === null) {
    return res.json({
      msg: "Nothing to update",
    });
  }

  await userModel.update(id, user);
  return res.json({
    msg: "Update successfully",
  });
});


//Change password
router.patch("/change-password/:id",async function(req, res){
  const {oldPassword, newPassword}= req.body;
  const id=req.params.id;

  const user= await userModel.singleById(id)
 

  if(!user){
    res.status(202).json({
      msg:"User is not exist!"
    })
  }
 

  else{
    let isMatch= bcrypt.compareSync(oldPassword,user.password);
    if(isMatch){
      await userModel.update(id,{
        password: bcrypt.hashSync(newPassword,10)
      })

      return res.json({
        msg:"Password changed successfully"
      })
    }

    return res.status(202).json({
      msg: "Old password is not correct"
    })
  }
  
})
module.exports = router;
