import { ChannelFeedPicker } from "@/components/ChannelFeedPicker";

export default function PreviewIndexPage() {
  return (
    <ChannelFeedPicker
      title="Preview"
      description="Pick a channel feed to preview its transformed output."
      subPath="preview"
    />
  );
}
