import type { Me, Profile } from '@gatherly/shared';
import { Eye, Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { InterestPicker, MIN_INTERESTS } from '@/features/profile/interest-picker';
import { LocationFields } from '@/features/profile/location-fields';
import { ProfileAvatar } from '@/features/profile/profile-avatar';
import { useUpdateProfile } from '@/features/profile/queries';
import { ScheduleFields } from '@/features/profile/schedule-fields';
import { TagPicker } from '@/features/profile/tag-picker';

const BIO_MAX = 280;
type Draft = Omit<Profile, 'onboardedAt'>;

const toDraft = ({ onboardedAt: _onboardedAt, ...draft }: Profile): Draft => ({
  ...draft,
  bio: draft.bio ?? '',
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-x-10 gap-y-5 border-t py-8 md:grid-cols-[15rem_1fr]">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Settings-style editor for the bio and every preference the wizard collects. */
export function ProfileEditor({ me, profile }: { me: Me; profile: Profile }) {
  const [draft, setDraft] = useState(() => toDraft(profile));
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const save = useUpdateProfile();
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(profile));
  const interestsInvalid =
    draft.interests.length < MIN_INTERESTS && draft.interests.join() !== profile.interests.join();

  const submit = () => {
    const { interests, bio, ...rest } = draft;
    save.mutate(
      {
        ...rest,
        bio: bio?.trim() || null,
        // Fewer than three is only possible for a member who skipped onboarding and left them empty.
        ...(interests.length >= MIN_INTERESTS && { interests, onboarded: true }),
      },
      {
        onSuccess: () => {
          update({ bio: bio?.trim() ?? '' });
          toast.success('Profile saved');
        },
      },
    );
  };

  return (
    <div className="page-container max-w-5xl py-10 pb-32 sm:py-14">
      <div className="mb-8 flex items-center gap-4">
        <ProfileAvatar user={me.user} className="size-16 text-xl" />
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold">Profile & preferences</h1>
          <p className="text-muted-foreground truncate">{me.user.email}</p>
        </div>
        <Button asChild variant="outline" className="ml-auto max-sm:hidden">
          <Link to={`/u/${me.user.id}`}>
            <Eye /> View public profile
          </Link>
        </Button>
      </div>

      <Section title="About you" description="Shown on your public profile.">
        <label htmlFor="bio" className="mb-2 block text-sm font-medium">
          Bio
        </label>
        <Textarea
          id="bio"
          value={draft.bio ?? ''}
          maxLength={BIO_MAX}
          rows={3}
          placeholder="A line or two about what you love doing."
          onChange={(e) => update({ bio: e.target.value })}
          aria-describedby="bio-count"
        />
        <p id="bio-count" className="text-muted-foreground mt-1.5 text-right text-xs tabular-nums">
          {draft.bio?.length ?? 0}/{BIO_MAX}
        </p>
      </Section>
      <Section title="Interests" description="Pick at least three. They shape your For you feed.">
        <InterestPicker value={draft.interests} onChange={(interests) => update({ interests })} />
        {interestsInvalid && (
          <p role="alert" className="text-destructive mt-3 text-sm">
            Pick at least {MIN_INTERESTS} interests.
          </p>
        )}
        <div className="mt-8">
          <TagPicker
            value={draft.tags}
            interests={draft.interests}
            onChange={(tags) => update({ tags })}
          />
        </div>
      </Section>
      <Section
        title="Location"
        description="Used for distances and events near you. Never shown publicly."
      >
        <LocationFields value={draft} onChange={update} />
      </Section>
      <Section title="Formats & times" description="We favor events that fit your week.">
        <ScheduleFields value={draft} onChange={update} />
      </Section>

      {dirty && (
        <div className="bg-background/85 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-xl">
          <div className="page-container flex h-18 max-w-5xl items-center gap-3">
            <p className="text-muted-foreground mr-auto text-sm">You have unsaved changes.</p>
            <Button variant="ghost" onClick={() => setDraft(toDraft(profile))}>
              Discard
            </Button>
            <Button onClick={submit} disabled={interestsInvalid || save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
