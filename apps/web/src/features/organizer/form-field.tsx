import { cloneElement, type ReactElement, type ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import type { EventFormValues } from '@/features/organizer/event-form-schema';

/** A titled card grouping related form fields. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-5 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

type FormFieldProps = {
  name: keyof EventFormValues;
  label: string;
  hint?: string;
  className?: string;
  children: ReactElement<Record<string, unknown>>;
};

/** Label, control, hint and error wired together by id for screen readers. */
export function FormField({ name, label, hint, className, children }: FormFieldProps) {
  const error = useFormContext<EventFormValues>().formState.errors[name];
  const id = `event-${name}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {cloneElement(children, {
        id,
        'aria-invalid': !!error,
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-sm">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} errors={[error]} />
    </Field>
  );
}

type EventFormPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

/** Frame for the create and edit pages: heading, then the form and its live preview side by side. */
export function EventFormPage({ eyebrow, title, description, children }: EventFormPageProps) {
  return (
    <div className="page-container max-w-6xl py-8 sm:py-12">
      <p className="text-primary text-sm font-medium">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="text-muted-foreground mt-1 mb-8">{description}</p>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">{children}</div>
    </div>
  );
}
