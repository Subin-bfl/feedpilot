import { ChannelFeedPicker } from "@/components/ChannelFeedPicker";

export default function RulesIndexPage() {
  return (
    <ChannelFeedPicker
      title="Rules"
      description="Pick a channel feed to manage its transformation rules."
      subPath="rules"
    />
  );
}
