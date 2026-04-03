const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    products: [
      {
        title: String,
        price: Number,
        qty: { type: Number, default: 1 },
        image: String,
        imageUrl: String
      }
    ],
    totalAmount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Online"],
      default: "COD"
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending"
    },
    orderStatus: {
      type: String,
      enum: ["Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Confirmed"
    },
    address: {
      fullName: String,
      addressLine: String,
      city: String,
      state: String,
      pincode: String,
      phone: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Order", orderSchema);
