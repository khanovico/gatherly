import type { CreateEventInput } from '@gatherly/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Globe, LoaderCircle, MapPin } from 'lucide-react';
import { FormProvider, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  eventFormSchema,
  friendlyErrors,
  type EventFormValues,
} from '@/features/organizer/event-form-schema';
import { FormField, Section } from '@/features/organizer/form-field';
import { ApiError, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const option =
  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60 has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50';

type EventFormProps = {
  defaultValues: EventFormValues;
  submitLabel: string;
  /** Throws `ApiError` on rejection; field errors are mapped back onto the form. */
  onSubmit: (input: CreateEventInput) => Promise<unknown>;
};

export function EventForm({ defaultValues, submitLabel, onSubmit }: EventFormProps) {
  const form = useForm({
    defaultValues,
    resolver: zodResolver(eventFormSchema, { error: friendlyErrors }),
  });
  const { register, control, setError, formState } = form;
  const format = useWatch({ control, name: 'format' });
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
        </Section>

        <Section title="Tickets">
          <FormField name="capacity" label="Capacity" hint="Up to 10,000 seats.">
            <Input
              type="number"
              min={1}
              max={10_000}
              className="sm:w-40"
              {...register('capacity', { valueAsNumber: true })}
            />
          </FormField>
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
    </FormProvider>
  );
}
