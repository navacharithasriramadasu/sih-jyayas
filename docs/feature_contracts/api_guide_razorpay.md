# 💳 Frontend Guide: Razorpay Integration

This guide explains how the Frontend/Mobile team should integrate the Razorpay Payment Gateway to process B2B Advance payments and B2C Consumer orders.

## Overview of the Flow

1. **Initialize:** The user clicks "Pay Now".
2. **Create Order:** The frontend calls the backend to generate a Razorpay Order ID.
3. **Checkout:** The frontend opens the native Razorpay UI modal.
4. **Complete:** The user enters dummy test card details and succeeds.
5. **Verify:** Razorpay returns a signature to the frontend, which the frontend immediately passes to the backend for cryptographic verification.

---

## Step 1: Create the Razorpay Order

Before opening the Razorpay UI, you must ask the backend to generate a unique `razorpay_order_id`.

**Endpoint:** `POST /api/v1/payments/razorpay/create-order`

**Request Payload (JSON):**
```json
{
  "userId": "uuid-of-the-logged-in-user",
  "amount": 500.00,
  "currency": "INR",
  "paymentType": "advance_20", 
  "internalOrderId": "uuid-of-the-agriconnect-order"
}
```
*(Note: `paymentType` can be `advance_20`, `final_80`, or `full_100`).*

**Successful Response (201):**
```json
{
  "success": true,
  "razorpay_order_id": "order_Fdf839fjsk39",
  "transaction_id": "uuid-of-payment-transaction",
  "amount": 50000,
  "currency": "INR"
}
```
*(Note: Razorpay returns the amount in paise, so 50000 = ₹500.00).*

---

## Step 2: Open the Razorpay Checkout Modal

Use the Razorpay SDK (React Native / Flutter / Web) to open the checkout window. Pass the `razorpay_order_id` you received in Step 1.

**Test Credentials:**
Use this key in your frontend SDK initialization:
- **Key ID:** `rzp_test_agriconnect123`

When the Razorpay modal asks for a card, use the standard test card to simulate a success:
- **Card Number:** `4111 1111 1111 1111`
- **Expiry:** Any future date
- **CVV:** Any 3 digits
- **OTP:** Any 6 digits

---

## Step 3: Verify the Payment (Crucial!)

Once the user completes the payment, the Razorpay SDK will return a success object to your app containing three strings. **You must immediately send these strings to the backend** so we can verify the payment wasn't forged and lock the funds in Escrow.

**Endpoint:** `POST /api/v1/payments/razorpay/verify`

**Request Payload (JSON):**
```json
{
  "razorpay_order_id": "order_Fdf839fjsk39",
  "razorpay_payment_id": "pay_Fdf839fjsk39",
  "razorpay_signature": "a1b2c3d4e5f6g7h8i9j0..."
}
```

**Successful Response (201):**
```json
{
  "success": true,
  "message": "Payment verified successfully.",
  "transaction_id": "uuid-of-payment-transaction"
}
```

Once you receive this 201 response, you can safely navigate the user to the "Order Success" or "Advance Paid" confirmation screen!
