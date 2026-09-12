import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      immutable: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    phone: {
      type: String,
      default: "",
    },

    department: {
      type: String,
      default: "",
    },

    designation: {
      type: String,
      default: "",
    },

    profileImage: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["Admin", "Employee"],
      default: "Employee",
    },

    branch: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: function (v) {
          return v === null || v === undefined || ["Main Office", "Santoshpur Branch"].includes(v);
        },
        message: (props) => `${props.value} is not a valid branch. Must be 'Main Office' or 'Santoshpur Branch'.`
      },
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    joiningDate: {
      type: Date,
      default: Date.now,
    },
    isPasswordChanged: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
  type: Date,
  default: null,
},loginAttempts: {
  type: Number,
  default: 0,
},isVerified: {
  type: Boolean,
  default: true,
},
passwordResetOTP: {
  type: String,
  default: null,
},

passwordResetOTPExpire: {
  type: Date,
  default: null,
},
passwordResetRequestedAt: {
  type: Date,
  default: null,
},
passwordResetAttempts: {
  type: Number,
  default: 0,
},

passwordResetBlockedUntil: {
  type: Date,
  default: null,
},
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
});
// Compare entered password with database password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
/* 
1. User.js
2. generateToken.js
3. auth.controller.js
4. auth.routes.js
5. auth.middleware.js */

/* DD001 + Password
        │
        ▼
auth.controller.js
        │
        ▼
User Model
        │
        ▼
Password Match
        │
        ▼
generateToken()
        │
        ▼
JWT Token
        │
        ▼
Frontend */

/* Employee Login
        │
        ▼
POST /login
        │
        ▼
auth.controller.js
        │
        ▼
JWT Token
        │
        ▼
Frontend
        │
        ▼
Authorization Header

Bearer Token
        │
        ▼
auth.middleware.js
        │
        ▼
Verify Token
        │
        ▼
Protected Route */
