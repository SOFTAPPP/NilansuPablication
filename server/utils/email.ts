import nodemailer from 'nodemailer';
import { logger } from './logger';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);

// --- Brevo Transporter ---
const brevoTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASSWORD,
  },
});

export const sendAdminAlert = async (subject: string, htmlMessage: string) => {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) {
    logger.warn('Brevo SMTP credentials not set. Skipping email alert.', 'Email System');
    return;
  }

  try {
    await brevoTransporter.sendMail({
      from: '"Nilansu Publication System" <confirmation@nilansupublication.com>',
      to: 'nilansupublication@gmail.com',
      subject,
      html: htmlMessage,
    });
    logger.info(`Admin alert email sent successfully: ${subject}`, 'Email System');
  } catch (error: any) {
    logger.error(error.message, 'Email System Error');
  }
};

export const sendCustomerReceiptEmail = async (
  toEmail: string,
  customerName: string,
  orderNumber: string,
  orderItems: Array<{ name: string; quantity: number; unitPrice: number; coverImage?: string }>,
  finalAmount: number,
  deliveryAddress: string
) => {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) return;

  try {
    const itemsHtml = orderItems.map((item: any) => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #ddd; text-align: left; display: flex; align-items: center; gap: 15px;">
          ${item.coverImage ? `<img src="${item.coverImage}" alt="${item.name}" style="width: 50px; height: 75px; object-fit: cover; border-radius: 4px;" />` : ''}
          <span style="font-weight: 500;">${item.name || 'Book'}</span>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 15px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600;">₹${item.unitPrice}</td>
      </tr>
    `).join('');

    const htmlMessage = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin-bottom: 5px;">Thank you for your order! 🎉</h1>
          <p style="color: #7f8c8d; font-size: 16px;">Your order has been successfully placed and is being processed.</p>
        </div>
        
        <p style="font-size: 16px; color: #333;">Hi <strong>${customerName}</strong>,</p>
        <p style="font-size: 15px; color: #555; line-height: 1.6;">Here is a summary of your recent purchase from Nilansu Publication.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3498db;">
          <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Order Number:</strong> <span style="color: #3498db;">${orderNumber}</span></p>
          <p style="margin: 0; font-size: 18px;"><strong>Total Amount Paid:</strong> ₹${finalAmount}</p>
        </div>

        <h3 style="color: #2c3e50; margin-top: 35px; border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f1f4f6; color: #333;">
              <th style="padding: 12px 15px; text-align: left; border-radius: 6px 0 0 6px;">Product</th>
              <th style="padding: 12px 15px; text-align: center;">Qty</th>
              <th style="padding: 12px 15px; text-align: right; border-radius: 0 6px 6px 0;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="background: #fff; padding: 20px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 30px;">
          <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Shipping Address:</h4>
          <p style="margin: 0; color: #555; line-height: 1.5;">${deliveryAddress}</p>
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="font-size: 14px; color: #95a5a6; margin-bottom: 5px;">Need help with your order?</p>
          <a href="mailto:support@nilansupublication.com" style="color: #3498db; text-decoration: none; font-weight: 500;">Contact Support</a>
        </div>
      </div>
    `;

    await brevoTransporter.sendMail({
      from: '"Nilansu Publication" <confirmation@nilansupublication.com>',
      to: toEmail,
      subject: `Your Order Confirmation - ${orderNumber}`,
      html: htmlMessage,
    });
    logger.info(`Customer receipt sent to ${toEmail} for order ${orderNumber}`, 'Email System');
  } catch (error: any) {
    logger.error(`Failed to send customer receipt: ${error.message}`, 'Email System Error');
  }
};

export const sendAdminNewOrderEmail = async (
  adminEmail: string,
  orderData: {
    orderNumber: string;
    customerName: string;
    email: string;
    phone: string;
    address: string;
    paymentMethod: string;
    subtotal: number;
    shippingCharge: number;
    codCharge: number;
    discount: number;
    finalAmount: number;
    items: Array<{ name: string; quantity: number; unitPrice: number }>;
  }
) => {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) return;

  try {
    const itemsHtml = orderData.items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.unitPrice}</td>
      </tr>
    `).join('');

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: auto;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">🚨 New Order Received!</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px; background: #f9f9f9; width: 50%;">
              <h4 style="margin: 0 0 10px 0; color: #333;">Customer Details</h4>
              <p style="margin: 2px 0;"><strong>Name:</strong> ${orderData.customerName}</p>
              <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${orderData.email}">${orderData.email}</a></p>
              <p style="margin: 2px 0;"><strong>Phone:</strong> ${orderData.phone}</p>
            </td>
            <td style="padding: 10px; background: #f1f4f6; width: 50%;">
              <h4 style="margin: 0 0 10px 0; color: #333;">Order Info</h4>
              <p style="margin: 2px 0;"><strong>Order ID:</strong> ${orderData.orderNumber}</p>
              <p style="margin: 2px 0;"><strong>Payment:</strong> ${orderData.paymentMethod}</p>
              <p style="margin: 2px 0;"><strong>Status:</strong> CONFIRMED</p>
            </td>
          </tr>
        </table>

        <div style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0;">Shipping Address:</h4>
          <p style="margin: 0; line-height: 1.5;">${orderData.address}</p>
        </div>

        <h3 style="color: #2c3e50; margin-bottom: 10px;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #34495e; color: #fff;">
              <th style="padding: 10px; text-align: left;">Product</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <h3 style="color: #2c3e50; margin-bottom: 10px;">Financial Breakdown</h3>
        <table style="width: 300px; border-collapse: collapse;">
          <tr><td style="padding: 5px 0;">Subtotal:</td><td style="padding: 5px 0; text-align: right;">₹${orderData.subtotal}</td></tr>
          <tr><td style="padding: 5px 0;">Shipping:</td><td style="padding: 5px 0; text-align: right;">₹${orderData.shippingCharge}</td></tr>
          <tr><td style="padding: 5px 0;">COD Charge:</td><td style="padding: 5px 0; text-align: right;">₹${orderData.codCharge}</td></tr>
          <tr><td style="padding: 5px 0; color: #e74c3c;">Discount:</td><td style="padding: 5px 0; text-align: right; color: #e74c3c;">-₹${orderData.discount}</td></tr>
          <tr style="font-weight: bold; font-size: 1.1em; border-top: 2px solid #ddd;">
            <td style="padding: 10px 0;">Final Amount:</td><td style="padding: 10px 0; text-align: right;">₹${orderData.finalAmount}</td>
          </tr>
        </table>
      </div>
    `;

    await brevoTransporter.sendMail({
      from: '"Nilansu Publication System" <confirmation@nilansupublication.com>',
      to: adminEmail,
      subject: `New Order Received - ${orderData.orderNumber} (₹${orderData.finalAmount})`,
      html: htmlMessage,
    });
    logger.info(`Admin order notification sent for ${orderData.orderNumber}`, 'Email System');
  } catch (error: any) {
    logger.error(`Failed to send admin order notification: ${error.message}`, 'Email System Error');
  }
};

export const sendSupportEmail = async (toEmail: string, subject: string, message: string) => {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) return;

  try {
    await brevoTransporter.sendMail({
      from: '"Nilansu Publication Support" <confirmation@nilansupublication.com>',
      to: toEmail,
      subject: subject,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${message}</div>`,
    });
  } catch (error: any) {
    logger.error(`Failed to send support email: ${error.message}`, 'Email System Error');
  }
};
