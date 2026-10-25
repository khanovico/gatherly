import { zodResolver } from '@hookform/resolvers/zod';
import { signinInput, signupInput, type SignupInput } from '@gatherly/shared';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePasswordAuth } from '@/features/auth/use-demo-login';
import { ApiError, errorMessage } from '@/lib/api';

type Mode = 'signin' | 'signup';

// Sign-in has no name; it is kept as an ignored field so both forms share one shape.
const schemas = { signin: signinInput.extend({ name: z.string() }), signup: signupInput };

const authErrors: z.core.$ZodErrorMap = (issue) => {
  if (issue.code === 'invalid_format') return 'Enter a valid email address';
  if (issue.code === 'too_small')
    return issue.minimum === 1 ? 'Required' : `At least ${issue.minimum} characters`;
};

/** Email and password sign-in / sign-up. */
export function AuthCard({ initialMode, next }: { initialMode: Mode; next?: string }) {
  const [mode, setMode] = useState(initialMode);
  return (
    <Card>
      <CardContent className="space-y-6">
        <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
          <TabsList className="w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
        </Tabs>
        <PasswordForm key={mode} mode={mode} next={next} />
      </CardContent>
    </Card>
  );
}

function PasswordForm({ mode, next }: { mode: Mode; next?: string }) {
  const isSignup = mode === 'signup';
  const form = useForm<SignupInput>({
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '' },
    resolver: zodResolver(schemas[mode], { error: authErrors }),
  });
  const { register, setError, formState } = form;
  const auth = usePasswordAuth(mode, next, (error) => {
    const field = error instanceof ApiError && error.code === 'EMAIL_TAKEN' ? 'email' : 'root';
    setError(field, { message: errorMessage(error) }, { shouldFocus: true });
  });
  const fieldError = (name: FieldPath<SignupInput>) => formState.errors[name];

  return (
    <form onSubmit={form.handleSubmit((input) => auth.mutate(input))} noValidate>
      <FieldGroup>
        {isSignup && (
          <Field data-invalid={!!fieldError('name')}>
            <FieldLabel htmlFor="auth-name">Name</FieldLabel>
            <Input
              id="auth-name"
              autoComplete="name"
              aria-invalid={!!fieldError('name')}
              {...register('name')}
            />
            <FieldError errors={[fieldError('name')]} />
          </Field>
        )}
        <Field data-invalid={!!fieldError('email')}>
          <FieldLabel htmlFor="auth-email">Email</FieldLabel>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!fieldError('email')}
            {...register('email')}
          />
          <FieldError errors={[fieldError('email')]} />
        </Field>
        <Field data-invalid={!!fieldError('password')}>
          <FieldLabel htmlFor="auth-password">Password</FieldLabel>
          <PasswordInput
            id="auth-password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder={isSignup ? 'At least 8 characters' : undefined}
            aria-invalid={!!fieldError('password')}
            {...register('password')}
          />
          <FieldError errors={[fieldError('password')]} />
        </Field>
        <FieldError errors={[formState.errors.root]} />
        <Button type="submit" size="lg" className="bg-brand w-full" disabled={auth.isPending}>
          {auth.isPending && <Loader2 className="animate-spin" />}
          {isSignup ? 'Create account' : 'Sign in'}
        </Button>
      </FieldGroup>
    </form>
  );
}

function PasswordInput(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className="pr-10" {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-1 -translate-y-1/2"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        <Icon />
      </Button>
    </div>
  );
}
