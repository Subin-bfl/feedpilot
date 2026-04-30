import { FeedPreview } from "@/components/FeedPreview";

export default function PreviewPage({ params }: { params: { id: string } }) {
  return <FeedPreview channelFeedId={params.id} />;
}
