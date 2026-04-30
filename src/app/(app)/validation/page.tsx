import { ChannelFeedPicker } from "@/components/ChannelFeedPicker";

export default function ValidationIndexPage() {
  return (
    <ChannelFeedPicker
      title="Validation"
      description="Pick a channel feed to see its current validation report."
      subPath="validation"
    />
  );
}
