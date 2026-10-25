import type { Profile, UpdateProfileInput } from '@gatherly/shared';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InterestPicker, MIN_INTERESTS } from '@/features/profile/interest-picker';
import { useUpdateProfile } from '@/features/profile/queries';

export type Draft = Omit<Profile, 'bio' | 'onboardedAt'>;

const toDraft = ({ bio: _bio, onboardedAt: _onboardedAt, ...draft }: Profile): Draft => draft;

/** Preferences wizard for new members. */
export function OnboardingWizard({ profile, firstName }: { profile: Profile; firstName: string }) {
  const [draft, setDraft] = useState(() => toDraft(profile));
  const navigate = useNavigate();
  const save = useUpdateProfile();
  const left = MIN_INTERESTS - draft.interests.length;
  const missing = left > 0 ? `Pick ${left} more` : undefined;

  /** Finishing or skipping both stamp `onboardedAt`, so nobody is sent here twice. */
  const complete = (input: UpdateProfileInput, to: string, notify: () => void) =>
    save.mutate({ ...input, onboarded: true }, { onSuccess: () => (notify(), navigate(to)) });
  const finish = () =>
    complete(draft, '/events?sort=for_you', () =>
      toast.success(`Welcome to Gatherly, ${firstName}!`, {
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

      <div className="mt-6 mb-6 sm:mt-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">What are you into?</h1>
        <p className="text-muted-foreground mt-2">
          Pick at least three. Your For you feed starts here.
        </p>
      </div>
      <InterestPicker
        value={draft.interests}
        onChange={(interests) => setDraft((current) => ({ ...current, interests }))}
      />

      <div className="bg-background/85 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-xl">
        <div className="page-container flex h-18 max-w-5xl items-center gap-3">
          <p role="status" className="text-muted-foreground ml-auto text-sm">
            {missing}
          </p>
          <Button
            size="lg"
            className="bg-brand hover:opacity-90"
            disabled={!!missing || save.isPending}
            onClick={finish}
          >
            Finish
            {save.isPending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          </Button>
        </div>
      </div>
    </section>
  );
}
