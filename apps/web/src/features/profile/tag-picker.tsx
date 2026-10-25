import { CATEGORY_TAGS, type Category } from '@gatherly/shared';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MAX_TAGS = 20;

/** "Live music" → "live-music": the API's tag format (lowercase words joined by hyphens). */
const toTag = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
const label = (tag: string) => tag.replaceAll('-', ' ');

type TagPickerProps = {
  value: string[];
  interests: Category[];
  onChange: (tags: string[]) => void;
};

/** Optional tags: suggestions from the picked interests, plus free text. */
export function TagPicker({ value, interests, onChange }: TagPickerProps) {
  const [text, setText] = useState('');
  const suggestions = [...new Set(interests.flatMap((c) => CATEGORY_TAGS[c]))].filter(
    (tag) => !value.includes(tag),
  );
  const full = value.length >= MAX_TAGS;
  const add = (tag: string) => {
    if (tag && !value.includes(tag) && !full) onChange([...value, tag]);
  };

  return (
    <div>
      <p className="font-semibold">Anything more specific?</p>
      <p className="text-muted-foreground mt-1 mb-3 text-sm">
        Optional. Tags fine-tune your matches.
      </p>
      <ul aria-label="Tags" className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <li key={tag}>
            <button
              type="button"
              aria-label={`Remove ${label(tag)}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="bg-primary text-primary-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-full py-1 pr-2 pl-3 text-sm font-medium outline-none focus-visible:ring-[3px]"
            >
              {label(tag)}
              <X aria-hidden className="size-3.5" />
            </button>
          </li>
        ))}
        {!full &&
          suggestions.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                aria-label={`Add ${label(tag)}`}
                onClick={() => add(tag)}
                className="text-muted-foreground hover:border-primary/50 hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-full border border-dashed py-1 pr-3 pl-2 text-sm outline-none focus-visible:ring-[3px]"
              >
                <Plus aria-hidden className="size-3.5" />
                {label(tag)}
              </button>
            </li>
          ))}
      </ul>
      <form
        className="mt-3 flex max-w-sm gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(toTag(text));
          setText('');
        }}
      >
        <Input
          aria-label="Add your own tag"
          placeholder="Add your own, e.g. jazz"
          value={text}
          maxLength={30}
          disabled={full}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" variant="outline" disabled={!toTag(text) || full}>
          Add
        </Button>
      </form>
    </div>
  );
}
