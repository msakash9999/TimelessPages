require("dotenv").config({ path: "./backend/.env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

async function testStripe() {
  console.log("Testing Stripe Connection...");
  console.log("Secret Key starts with:", process.env.STRIPE_SECRET_KEY?.slice(0, 7));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "Test Book",
            },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:5000/success",
      cancel_url: "http://localhost:5000/cancel",
    });

    console.log("Stripe Connection Successful!");
    console.log("Test Session URL:", session.url);
  } catch (err) {
    console.error("Stripe Connection Failed!");
    console.error("Error Message:", err.message);
    if (err.raw) {
      console.error("Raw Error:", JSON.stringify(err.raw, null, 2));
    }
  }
}

testStripe();
