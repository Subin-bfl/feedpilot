import { ChannelFeedPicker } from "@/components/ChannelFeedPicker";

export default function MappingIndexPage() {
  return (
    <ChannelFeedPicker
      title="Field mapping"
      description="Pick a channel feed to edit its source → channel field mappings."
      subPath="mapping"
    />
  );
}
