const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/Payment");
const User = require("../models/User");
const { sendEmail } = require("../utils/mailer");

module.exports = function (app, requireUser) {
  const router = express.Router();

  // 1. Create Stripe Checkout Session
  router.post("/create-checkout-session", requireUser, async (req, res) => {
    console.log("Create Checkout Session Request Received:", req.body);
    try {
      const { items, shippingDetails } = req.body;
      if (!items || items.length === 0) return res.status(400).json({ message: "Cart is empty" });

      // Build line items for Stripe
      const lineItems = items.map(item => ({
        price_data: {
          currency: "inr",
          product_data: {
            name: item.title || "Book",
          },
          unit_amount: Math.round(item.price * 100), // Stripe expects amounts in cents
        },
        quantity: item.qty || 1,
      }));

      // Create Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"], // Enable more via automatic_payment_methods later if desired
        line_items: lineItems,
        mode: "payment",
        success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/cancel.html`,
        client_reference_id: req.userSession.userId,
        customer_email: req.userSession.email,
        // Requirement 4: Address Collection
        billing_address_collection: 'required',
        shipping_address_collection: {
          allowed_countries: ['IN', 'US', 'GB'],
        },
        metadata: {
          userId: req.userSession.userId,
          shippingFullName: shippingDetails?.fullName || "",
          shippingPhone: shippingDetails?.phone || "",
          shippingAddressLine: shippingDetails?.addressLine || "",
          shippingCity: shippingDetails?.city || "",
          shippingState: shippingDetails?.state || "",
          shippingPincode: shippingDetails?.pincode || "",
        }
      });

      // Save initial payment record
      const payment = new Payment({
        userId: req.userSession.userId,
        orderId: session.id, // Using session ID as orderId
        stripeSessionId: session.id,
        amount: items.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0),
        currency: "INR",
        status: "pending",
        shippingAddress: shippingDetails,
        items: items
      });
      await payment.save();

      res.status(200).json({ success: true, url: session.url });
    } catch (err) {
      console.error("Stripe Session Error:", err);
      res.status(500).json({ message: "Failed to create payment session" });
    }
  });

  // 2. Stripe Webhook to verify payment
  // Note: This endpoint needs raw body logic in server.js
  router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (endpointSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } else {
        // Fallback for demo without secret
        event = JSON.parse(req.body);
      }
    } catch (err) {
      console.error("Webhook Signature Warning:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata.userId;

      try {
        // Update Payment status
        const payment = await Payment.findOneAndUpdate(
          { stripeSessionId: session.id },
          { status: "success", paymentId: session.payment_intent },
          { new: true }
        );

        // Update User isPaid status
        const user = await User.findByIdAndUpdate(userId, { isPaid: true }, { new: true });

        if (user && payment) {
          // Send Receipt Email
          const orderItemsHtml = payment.items.map(item => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title} x${item.qty}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price * item.qty}</td>
            </tr>
          `).join('');

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
              <h2 style="color: #8B7355; text-align: center;">Order Confirmed!</h2>
              <p>Hi ${user.name},</p>
              <p>Thank you for your purchase from TimelessPages. Your payment was successful!</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
                <thead>
                  <tr style="background-color: #f8f8f8;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding: 10px; font-weight: bold; text-align: right;">Total Paid:</td>
                    <td style="padding: 10px; font-weight: bold; text-align: right; color: #8B7355;">₹${payment.amount}</td>
                  </tr>
                </tfoot>
              </table>
              <p>Shipping to: ${session.shipping_details?.address?.line1 || payment.shippingAddress?.addressLine}, ${session.shipping_details?.address?.city || payment.shippingAddress?.city}</p>
              <p>You now have full premium access to our platform. Enjoy your reading!</p>
              <p style="color: #777; font-size: 12px; text-align: center; margin-top: 30px;">© 2026 TimelessPages</p>
            </div>
          `;

          await sendEmail(user.email, "Your TimelessPages Order Receipt", emailHtml);
        }
      } catch (dbErr) {
        console.error("Webhook processing error:", dbErr);
      }
    }

    res.json({ received: true });
  });

  return router;
};
