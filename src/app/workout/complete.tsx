import { AppButton } from '@/components/AppButton';
import { PlaceholderCard } from '@/components/PlaceholderCard';
import { Screen } from '@/components/Screen';

export default function WorkoutCompleteScreen() {
  return (
    <Screen title="Workout Complete" subtitle="Summary, notes, skipped items, and max updates will appear here.">
      <PlaceholderCard
        title="Completion target"
        body="Persist completed sets, update accessory defaults from completed exercises, and advance the plan."
      />
      <AppButton href="/">Back Home</AppButton>
    </Screen>
  );
}
