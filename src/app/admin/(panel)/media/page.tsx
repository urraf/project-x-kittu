import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Media library" };

export default function MediaPage() {
  return (
    <>
      <PageHeader title="Media library" description="Every image you upload is resized, converted to WebP and stored securely. Reuse them in any post." />
      <MediaLibrary />
    </>
  );
}
