const Razorpay = require("razorpay");
require("dotenv").config();

console.log("Razorpay configuration initialized from environment.");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "dummy",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummy",
});

async function test() {
  try {
    const order = await razorpay.orders.create({
      amount: 50000,
      currency: "INR",
      receipt: "test_receipt"
    });
    console.log("Success! Order created:", order);
  } catch(err) {
    console.log("Failed to create order:", err);
  }
}
test();
