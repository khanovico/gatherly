import type { ReactNode } from 'react';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from '@/components/ui/empty';

type IllustratedStateProps = {
  /** An illustration from `/images/empty` or `/images/misc`. */
  image: string;
  title: string;
  description: ReactNode;
  /** `h1` when the state is the whole page (404, errors, paywall). */
  as?: 'h1' | 'h2';
  children?: ReactNode;
};

/** Empty, error and not-found states: illustration, message and a way forward. */
export function IllustratedState({
  image,
  title,
  description,
  as: Heading = 'h2',
  children,
}: IllustratedStateProps) {
  return (
    <Empty>
      <EmptyHeader className="max-w-md">
        <img src={image} alt="" className="mb-2 size-44 object-contain sm:size-52" />
        <Heading className="text-2xl font-semibold sm:text-3xl">{title}</Heading>
        <EmptyDescription className="text-base">{description}</EmptyDescription>
      </EmptyHeader>
      {children && (
        <EmptyContent className="flex-row flex-wrap justify-center">{children}</EmptyContent>
      )}
    </Empty>
  );
}
