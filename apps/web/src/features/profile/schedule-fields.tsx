import type { EventFormat, Profile, TimeSlot } from '@gatherly/shared';
import { Globe, MapPin, Moon, PartyPopper, Sun } from 'lucide-react';
import { ChoiceGroup, type Choice } from '@/features/profile/choice-group';

// prettier-ignore
const formatChoices: Choice<EventFormat>[] = [
  { value: 'in_person', label: 'In person', description: 'Meet people around the city', icon: MapPin },
  { value: 'online', label: 'Online', description: 'Join from anywhere', icon: Globe },
];

// prettier-ignore
const timeSlotChoices: Choice<TimeSlot>[] = [
  { value: 'weekday_daytime', label: 'Weekday daytime', description: 'Mon–Fri, before 6 pm', icon: Sun },
  { value: 'weeknights', label: 'Weeknights', description: 'Mon–Fri, after 6 pm', icon: Moon },
  { value: 'weekends', label: 'Weekends', description: 'Saturday and Sunday', icon: PartyPopper },
];

type Schedule = Pick<Profile, 'formats' | 'timeSlots'>;

/** Preferred event formats and time slots; each keeps at least one choice. */
type ScheduleFieldsProps = { value: Schedule; onChange: (patch: Partial<Schedule>) => void };

export function ScheduleFields({ value, onChange }: ScheduleFieldsProps) {
  return (
    <div className="space-y-8">
      <ChoiceGroup
        legend="How do you like to meet?"
        choices={formatChoices}
        value={value.formats}
        onChange={(formats) => onChange({ formats })}
      />
      <ChoiceGroup
        legend="When are you usually free?"
        choices={timeSlotChoices}
        value={value.timeSlots}
        onChange={(timeSlots) => onChange({ timeSlots })}
      />
    </div>
  );
}
