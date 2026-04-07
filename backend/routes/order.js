const express = require("express");
const Order = require("../models/Order");
const User = require("../models/User");
const { sendEmail } = require("../utils/mailer");

module.exports = function (app, requireUser) {
  const router = express.Router();

  // 1. Create COD Order
  router.post("/create", requireUser, async (req, res) => {
    try {
      const { products, totalAmount, address } = req.body;
      const userId = req.userSession.userId;

      if (!products || products.length === 0) {
        return res.status(400).json({ message: "No products in order" });
      }

      // Ensure field consistency for images
      const normalizedProducts = products.map(item => ({
        ...item,
        image: item.image || item.imageUrl,
        imageUrl: item.imageUrl || item.image
      }));

      if (!address || !address.addressLine || !address.city || !address.pincode) {
        return res.status(400).json({ message: "Complete address is required" });
      }

      // Create the order
      const newOrder = new Order({
        userId,
        products: normalizedProducts,
        totalAmount,
        paymentMethod: "COD",
        paymentStatus: "Pending",
        orderStatus: "Confirmed",
        address
      });

      await newOrder.save();

      // OPTIONAL: Update user's addresses if this is a new one or they don't have any
      const user = await User.findById(userId);
      if (user) {
        const addressExists = user.addresses.some(
          (a) => a.addressLine === address.addressLine && a.pincode === address.pincode
        );
        if (!addressExists) {
          user.addresses.push({ ...address, isDefault: user.addresses.length === 0 });
          await user.save();
        }
      }

      // Send confirmation email to User
      const orderItemsHtml = normalizedProducts.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title} x${item.qty}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price * item.qty}</td>
        </tr>
      `).join('');

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
          <h2 style="color: #8B7355; text-align: center;">Order Confirmed! (COD)</h2>
          <p>Hi ${user ? user.name : 'Valued Customer'},</p>
          <p>Your order has been successfully placed via Cash on Delivery.</p>
          
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
                <td style="padding: 10px; font-weight: bold; text-align: right;">Total Amount:</td>
                <td style="padding: 10px; font-weight: bold; text-align: right; color: #8B7355;">₹${totalAmount}</td>
              </tr>
            </tfoot>
          </table>
          <p><strong>Delivery Address:</strong><br>
          ${address.fullName}<br>
          ${address.addressLine}<br>
          ${address.city}, ${address.state} - ${address.pincode}<br>
          Phone: ${address.phone}</p>
          <p>Payment Method: Cash on Delivery</p>
          <p>Message: Your order has been successfully placed</p>
          <p style="color: #777; font-size: 12px; text-align: center; margin-top: 30px;">© 2026 TimelessPages</p>
        </div>
      `;

      // Send confirmation emails in try/catch to prevent order loss on mail failure
      try {
        // Email to User
        await sendEmail(user.email, "Order Confirmation (Cash on Delivery) - TimelessPages", emailHtml);

        // Email to Admin
        const adminEmail = process.env.EMAIL_USER || "admin@timelesspages.com";
        await sendEmail(adminEmail, `New COD Order #${newOrder._id}`, `
          <h3>New COD Order Received</h3>
          <p>Order ID: ${newOrder._id}</p>
          <p>Customer: ${user ? user.name : 'Unknown'} (${user ? user.email : 'N/A'})</p>
          <p>Total: ₹${totalAmount}</p>
          <p>Address: ${address.addressLine}, ${address.city}</p>
        `);
      } catch (mailErr) {
        console.error("Mail dispatch failed, but order was saved:", mailErr);
      }

      res.status(201).json({
        success: true,
        message: "Order placed successfully via Cash on Delivery",
        orderId: newOrder._id
      });
    } catch (err) {
      console.error("COD Order Error:", err);
      res.status(500).json({ 
        message: "Failed to place order"
      });
    }
  });

  // 2. Fetch User Orders
  router.get("/my-orders", requireUser, async (req, res) => {
    try {
      const userId = req.userSession.userId;
      const orders = await Order.find({ userId }).sort({ createdAt: -1 });
      res.json(orders);
    } catch (err) {
      console.error("Fetch Orders Error:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  return router;
};
