const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true
    },
    phone: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    age: Number,
    cart: [
      {
        bookId: String,
        title: String,
        price: Number,
        image: String,
        qty: { type: Number, default: 1 }
      }
    ],
    wishlist: [
      {
        bookId: String,
        title: String,
        price: Number,
        image: String
      }
    ],
    otp: String,
    otpExpires: Date,
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String,
    isPaid: {
      type: Boolean,
      default: false
    },
    addresses: [
      {
        fullName: String,
        addressLine: String,
        city: String,
        state: String,
        pincode: String,
        phone: String,
        isDefault: { type: Boolean, default: false }
      }
    ],
    blocked: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
