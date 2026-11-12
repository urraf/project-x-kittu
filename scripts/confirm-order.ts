/**
 * Recovery / Admin CLI tool:
 * Confirms a pending or expired store order (e.g. if the buyer closed or refreshed
 * the browser before checkout could call /verify, and no webhook fired).
 *
 * Usage:
 *   npm run admin:confirm-order <email-or-order-id> [optional-payment-id]
 */
import "./load-env";
import { Types } from "mongoose";
import { connectDB } from "../src/lib/db/connect";
import { confirmOrder, listStudentOrders } from "../src/lib/services/store";
import { Order, Student, Product, type OrderDoc, type ProductDoc } from "../src/lib/models";

async function main() {
  const query = process.argv[2]?.trim();
  const paymentId = process.argv[3]?.trim();

  if (!query) {
    console.error("Usage: npm run admin:confirm-order <email-or-order-id> [payment-id]");
    process.exit(1);
  }

  await connectDB();

  let order: OrderDoc | null = null;

  if (Types.ObjectId.isValid(query)) {
    order = await Order.findById(query).lean<OrderDoc>();
  }

  if (!order) {
    // Try by Razorpay payment orderId (e.g. order_TzKphRRoy0uysV)
    order = await Order.findOne({ "payment.orderId": query }).lean<OrderDoc>();
  }

  if (!order) {
    // Try by email - find the most recent pending or expired order
    order = await Order.findOne({
      email: query.toLowerCase(),
      status: { $in: ["pending", "expired"] },
    })
      .sort({ createdAt: -1 })
      .lean<OrderDoc>();
  }

  if (!order) {
    // If none pending/expired, check if it's already paid
    const paid = await Order.findOne({
      $or: [
        { email: query.toLowerCase() },
        ...(Types.ObjectId.isValid(query) ? [{ _id: query }] : []),
        { "payment.orderId": query },
      ],
      status: "paid",
    })
      .sort({ createdAt: -1 })
      .lean<OrderDoc>();

    if (paid) {
      console.log(`Order ${paid._id} for ${paid.email} is already marked as PAID.`);
      process.exit(0);
    }

    console.error(`No order found for query: "${query}"`);
    process.exit(1);
  }

  console.log(`Found order: ${order._id}`);
  console.log(`  Student:  ${order.name} <${order.email}>`);
  console.log(`  Amount:   ₹${order.amount}`);
  console.log(`  Current:  status=${order.status}, provider=${order.payment?.provider ?? "none"}, orderId=${order.payment?.orderId ?? "none"}`);

  const product = await Product.findById(order.product).lean<ProductDoc>();
  console.log(`  Product:  ${product?.title ?? order.product}`);

  console.log("\nConfirming order...");
  const outcome = await confirmOrder(String(order._id), {
    provider: (order.payment?.provider as "razorpay" | "demo" | "free") || "razorpay",
    paymentId: paymentId || order.payment?.paymentId || undefined,
  });

  console.log("Outcome:", outcome);

  const updated = await Order.findById(order._id).lean<OrderDoc>();
  console.log("\nUpdated order details:");
  console.log(`  Status:   ${updated?.status}`);
  console.log(`  Paid at:  ${updated?.payment?.paidAt}`);
  console.log(`  Provider: ${updated?.payment?.provider}`);
  if (updated?.payment?.paymentId) console.log(`  Pay ID:   ${updated?.payment?.paymentId}`);

  const studentOrders = await listStudentOrders(order.student);
  console.log(`\nVerified: Student now has ${studentOrders.length} item(s) in their library.`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Error confirming order:", err);
  process.exit(1);
});

