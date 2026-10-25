import type { Profile, UpdateProfileInput } from '@gatherly/shared';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InterestPicker, MIN_INTERESTS } from '@/features/profile/interest-picker';
import { LocationFields } from '@/features/profile/location-fields';
import { useUpdateProfile } from '@/features/profile/queries';
import { ScheduleFields } from '@/features/profile/schedule-fields';
import { TagPicker } from '@/features/profile/tag-picker';
import { cn } from '@/lib/utils';

export type Draft = Omit<Profile, 'bio' | 'onboardedAt'>;
type Step = {
  label: string;
  title: string;
  description: string;
  body: (draft: Draft, update: (patch: Partial<Draft>) => void) => ReactNode;
  /** Why Continue is disabled, or nothing when the step is complete. */
  missing?: (draft: Draft) => string | undefined;
};

const steps: Step[] = [
  {
    label: 'Interests',
    title: 'What are you into?',
    description: 'Pick at least three. Your For you feed starts here.',
    body: (draft, update) => (
      <div className="space-y-10">
        <InterestPicker value={draft.interests} onChange={(interests) => update({ interests })} />
        <TagPicker
          value={draft.tags}
          interests={draft.interests}
          onChange={(tags) => update({ tags })}
        />
      </div>
    ),
    missing: ({ interests }) => {
      const left = MIN_INTERESTS - interests.length;
      return left > 0 ? `Pick ${left} more` : undefined;
    },
  },
  {
    label: 'Location',
    title: 'Where do you hang out?',
    description: "Set a home base and how far you'll go. Skip it if you mostly join online.",
    body: (draft, update) => <LocationFields value={draft} onChange={update} />,
  },
  {
    label: 'Schedule',
    title: 'How and when do you go out?',
    description: "We'll favor events that fit your week.",
    body: (draft, update) => <ScheduleFields value={draft} onChange={update} />,
  },
];

const toDraft = ({ bio: _bio, onboardedAt: _onboardedAt, ...draft }: Profile): Draft => draft;

/** Step-by-step preferences wizard for new members. */
export function OnboardingWizard({ profile, firstName }: { profile: Profile; firstName: string }) {
  const [draft, setDraft] = useState(() => toDraft(profile));
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();
  const save = useUpdateProfile();
  const step = steps[index]!;
  const missing = step.missing?.(draft);
  const last = index === steps.length - 1;

  // Start each step at the top, with focus on its heading so screen readers announce it.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [index]);

  /** Finishing or skipping both stamp `onboardedAt`, so nobody is sent here twice. */
  const complete = (input: UpdateProfileInput, to: string, notify: () => void) =>
    save.mutate({ ...input, onboarded: true }, { onSuccess: () => (notify(), navigate(to)) });
  const finish = () =>
    complete(draft, '/events?sort=for_you', () =>
      toast.success(`You're all set, ${firstName}!`, {
        description: 'Your For you feed is ready.',
      }),
    );
  const skip = () =>
    complete({}, '/events', () =>
      toast('You can set your preferences any time from your profile.'),
    );

  return (
    <section className="page-container max-w-5xl py-8 pb-28 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <Badge variant="secondary">
          <Sparkles /> Personalize Gatherly
        </Badge>
        <Button variant="ghost" onClick={skip} disabled={save.isPending}>
          Skip for now
        </Button>
      </div>

      <ol aria-label="Progress" className="mt-6 flex gap-2">
        {steps.map(({ label }, i) => (
          <li key={label} aria-current={i === index ? 'step' : undefined} className="flex-1">
            <span
              className={cn('block h-1.5 rounded-full', i <= index ? 'bg-brand' : 'bg-muted')}
            />
            <span
              className={cn(
                'mt-2 flex items-center gap-1.5 text-xs font-medium sm:text-sm',
                i !== index && 'text-muted-foreground',
              )}
            >
              {i < index && <Check aria-hidden className="text-primary size-4" />}
              <span className="sr-only">Step {i + 1}:</span> {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-8 mb-6">
        <p className="text-muted-foreground text-sm font-medium">
          Step {index + 1} of {steps.length}
        </p>
        <h1
          ref={heading}
          tabIndex={-1}
          className="mt-1 text-3xl font-semibold outline-none sm:text-4xl"
        >
          {step.title}
        </h1>
        <p className="text-muted-foreground mt-2">{step.description}</p>
      </div>
      {step.body(draft, (patch) => setDraft((current) => ({ ...current, ...patch })))}

      <div className="bg-background/85 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-xl">
        <div className="page-container flex h-18 max-w-5xl items-center gap-3">
          {index > 0 && (
            <Button variant="ghost" onClick={() => setIndex(index - 1)}>
              <ArrowLeft /> Back
            </Button>
          )}
          <p role="status" className="text-muted-foreground ml-auto text-sm">
            {missing}
          </p>
          <Button
            size="lg"
            className="bg-brand hover:opacity-90"
            disabled={!!missing || save.isPending}
            onClick={last ? finish : () => setIndex(index + 1)}
          >
            {last ? 'Finish' : 'Continue'}
            {save.isPending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          </Button>
        </div>
      </div>
    </section>
  );
}
