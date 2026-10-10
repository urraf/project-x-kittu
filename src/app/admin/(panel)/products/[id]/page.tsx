import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { getAdminProduct } from "@/lib/services/store";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Product" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = await getAdminProduct((await params).id);
  if (!product) notFound();
  return <ProductEditor key={product.id} product={product} siteUrl={SITE_URL} />;
}
