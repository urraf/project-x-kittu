import "server-only";
import { connectDB } from "@/lib/db/connect";
import { Order, Product, Student, Testimonial } from "@/lib/models";
import { opportunityCounts } from "@/lib/services/opportunities";

/** Headline numbers for the Studio dashboard. */
export async function platformCounts() {
  await connectDB();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000);
  const [students, newStudents, orders, products, testimonials, opportunities] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ createdAt: { $gte: weekAgo } }),
    Order.countDocuments({ status: "paid" }),
    Product.countDocuments({ status: "published" }),
    Testimonial.countDocuments({ status: "visible" }),
    opportunityCounts().then((c) => c.total),
  ]);
  return { students, newStudents, orders, products, testimonials, opportunities };
}
