import { CATEGORIES, type CreateEventInput } from '@gatherly/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Globe, LoaderCircle, MapPin } from 'lucide-react';
import { FormProvider, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { categoryMeta } from '@/features/events/lib';
import {
  eventFormSchema,
  friendlyErrors,
  type EventFormValues,
} from '@/features/organizer/event-form-schema';
import { EventPreview } from '@/features/organizer/event-preview';
import { FormField, Section } from '@/features/organizer/form-field';
import { ApiError, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const timeZones = Intl.supportedValuesOf('timeZone');

const option =
  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60 has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50';

type EventFormProps = {
  defaultValues: EventFormValues;
  submitLabel: string;
  /** Throws `ApiError` on rejection; field errors are mapped back onto the form. */
  onSubmit: (input: CreateEventInput) => Promise<unknown>;
  /** Seats already taken, for the preview's seat meter when editing. */
  registeredCount?: number;
};

export function EventForm({
  defaultValues,
  submitLabel,
  onSubmit,
  registeredCount,
}: EventFormProps) {
  const form = useForm({
    defaultValues,
    resolver: zodResolver(eventFormSchema, { error: friendlyErrors }),
  });
  const { register, control, setValue, setError, formState } = form;
  const [format, category, coverImage] = useWatch({
    control,
    name: ['format', 'category', 'coverImage'],
  });
  const covers = [1, 2].map((n) => `/images/covers/${category}-${n}.webp`);
  const queryClient = useQueryClient();

  const submit = form.handleSubmit(async (input) => {
    try {
      await onSubmit(input);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CAPACITY_BELOW_REGISTERED') {
        setError('capacity', { message: error.detail }, { shouldFocus: true });
      } else if (error instanceof ApiError && error.errors.length) {
        for (const { path, message } of error.errors) {
          setError(path as FieldPath<EventFormValues>, { message });
        }
      } else {
        toast.error(errorMessage(error));
        // Plan changed since page load: refreshing `me` swaps in the paywall.
        if (error instanceof ApiError && error.code === 'ENTITLEMENT_REQUIRED') {
          await queryClient.invalidateQueries({ queryKey: queryKeys.me });
        }
      }
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="space-y-6">
        <Section title="Basics">
          <FormField name="title" label="Title">
            <Input placeholder="Sunset rooftop jazz night" {...register('title')} />
          </FormField>
          <FormField name="summary" label="Summary" hint="One line shown on event cards.">
            <Input {...register('summary')} />
          </FormField>
          <FormField name="description" label="Description">
            <Textarea rows={5} {...register('description')} />
          </FormField>
          <FieldSet>
            <FieldLegend variant="label">Category</FieldLegend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((value) => {
                const { label, icon: Icon, color } = categoryMeta[value];
                return (
                  <label key={value} className={option}>
                    <input
                      type="radio"
                      value={value}
                      className="sr-only"
                      {...register('category', { onChange: () => setValue('coverImage', '') })}
                    />
                    <Icon aria-hidden className={cn('size-4', color)} /> {label}
                  </label>
                );
              })}
            </div>
          </FieldSet>
          <FieldSet>
            <FieldLegend variant="label">Cover image</FieldLegend>
            <div className="grid grid-cols-2 gap-3">
              {covers.map((src, index) => (
                <label
                  key={src}
                  className="has-checked:ring-primary has-focus-visible:ring-ring/50 relative cursor-pointer overflow-hidden rounded-lg ring-2 ring-transparent transition has-checked:ring-offset-2 has-focus-visible:ring-3"
                >
                  <input
                    type="radio"
                    name="coverImage"
                    className="sr-only"
                    checked={(coverImage || covers[0]) === src}
                    onChange={() => setValue('coverImage', src, { shouldDirty: true })}
                  />
                  <img
                    src={src}
                    alt={`Cover option ${index + 1}`}
                    className="aspect-video w-full object-cover"
                  />
                </label>
              ))}
            </div>
          </FieldSet>
        </Section>

        <Section title="Where">
          <FieldSet>
            <FieldLegend variant="label">Format</FieldLegend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={option}>
                <input type="radio" value="in_person" className="sr-only" {...register('format')} />
                <MapPin aria-hidden className="text-primary size-4" /> In person
              </label>
              <label className={option}>
                <input type="radio" value="online" className="sr-only" {...register('format')} />
                <Globe aria-hidden className="text-primary size-4" /> Online
              </label>
            </div>
          </FieldSet>
          {format === 'online' ? (
            <FormField
              name="onlineUrl"
              label="Meeting link"
              hint="Shared with registered attendees."
            >
              <Input type="url" placeholder="https://" {...register('onlineUrl')} />
            </FormField>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="venueName" label="Venue">
                <Input {...register('venueName')} />
              </FormField>
              <FormField name="city" label="City">
                <Input {...register('city')} />
              </FormField>
              <FormField name="address" label="Address (optional)" className="sm:col-span-2">
                <Input {...register('address')} />
              </FormField>
            </div>
          )}
        </Section>

        <Section title="When">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="startsAt" label="Starts">
              <Input type="datetime-local" {...register('startsAt')} />
            </FormField>
            <FormField name="endsAt" label="Ends">
              <Input type="datetime-local" {...register('endsAt')} />
            </FormField>
          </div>
          <FormField name="timezone" label="Timezone" hint="Attendees see times in this timezone.">
            <NativeSelect className="w-full" {...register('timezone')}>
              {timeZones.map((zone) => (
                <NativeSelectOption key={zone} value={zone}>
                  {zone.replaceAll('_', ' ')}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
        </Section>

        <Section title="Tickets">
          <FormField
            name="capacity"
            label="Capacity"
            hint={`${registeredCount ? `${registeredCount} already registered. ` : ''}Up to 10,000 seats.`}
          >
            <Input
              type="number"
              min={1}
              max={10_000}
              className="sm:w-40"
              {...register('capacity', { valueAsNumber: true })}
            />
          </FormField>
          <Field data-disabled>
            <FieldLabel htmlFor="event-price" className="items-center">
              Price <Badge variant="secondary">Paid tickets — coming soon</Badge>
            </FieldLabel>
            <Input id="event-price" value="Free" disabled className="sm:w-40" />
          </Field>
        </Section>

        <div className="flex justify-end gap-3">
          <Button asChild variant="outline" size="lg">
            <Link to="/organizer">Cancel</Link>
          </Button>
          <Button
            type="submit"
            size="lg"
            className="bg-brand hover:opacity-90"
            disabled={formState.isSubmitting}
          >
            {formState.isSubmitting && <LoaderCircle className="animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
      <EventPreview registeredCount={registeredCount} />
    </FormProvider>
  );
}
