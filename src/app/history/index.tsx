import { PlaceholderCard } from '@/components/PlaceholderCard';
import { Screen } from '@/components/Screen';

export default function HistoryScreen() {
  return (
    <Screen title="History" subtitle="Completed workouts and skipped items will be listed here.">
      <PlaceholderCard
        title="No workouts yet"
        body="Once persistence is added, completed workout summaries will show total time, phase, slot, and skipped exercises."
      />
    </Screen>
  );
}
