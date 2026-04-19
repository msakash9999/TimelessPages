const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    paymentId: {
      type: String
    },
    orderId: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending"
    },
    stripeSessionId: {
      type: String
    },
    shippingAddress: {
      fullName: String,
      addressLine: String,
      city: String,
      state: String,
      pincode: String,
      phone: String
    },
    items: [
      {
        title: String,
        price: Number,
        qty: Number
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
