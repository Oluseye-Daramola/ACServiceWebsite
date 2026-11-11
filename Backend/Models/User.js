const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const ROLES = ["admin", "technician"];

const userSchema = new mongoose.Schema(
  {
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    phone: { 
        type: String, 
        trim: true 
    },
    password: { 
        type: String, 
        required: true, 
        minlength: 8, 
        select: false 
    },
    role: { 
        type: String, 
        enum: ROLES, 
        default: "technician" 
    },
    specialization: { 
        type: String, 
        trim: true 
    }, // technicians only, e.g. "Split units, VRF"
    isActive: { 
        type: Boolean, 
        default: true 
    },
    lastLogin: Date,
    // Stored in every login token; bumped on password change so older tokens
    // (other devices / sessions) stop working immediately
    tokenVersion: {
        type: Number,
        default: 0
    },
    // Forgot-password: only a SHA-256 hash of the emailed token is stored
    passwordResetToken: {
        type: String,
        select: false
    },
    passwordResetExpires: {
        type: Date,
        select: false
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  // 12 rounds in real use; the test suite lowers it (BCRYPT_ROUNDS) to keep tests fast
  this.password = await bcrypt.hash(this.password, Number(process.env.BCRYPT_ROUNDS) || 12);
  // Covers both "change my password" and an admin resetting a technician's password
  if (!this.isNew) this.tokenVersion = (this.tokenVersion || 0) + 1;
  // Any password change makes outstanding reset links useless
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
});

const hashResetToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Returns the plain token to email; stores only its hash (valid for 30 minutes)
userSchema.methods.createPasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = hashResetToken(token);
  this.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  return token;
};

userSchema.statics.hashResetToken = hashResetToken;

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.tokenVersion;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
