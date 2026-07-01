'use client';

import type { ReactNode } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField as RHFFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/form';

interface TextFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: ReactNode;
  description?: ReactNode;
  /** Renders the input element, wired via field props. */
  render: (field: {
    value: TFieldValues[TName];
    onChange: (value: TFieldValues[TName]) => void;
    onBlur: () => void;
    name: TName;
    ref: React.Ref<unknown>;
  }) => ReactNode;
}

/**
 * Wrapper around react-hook-form's Controller + our Form primitives.
 * Use this for one-line form fields where the visual structure is always:
 *
 *   Label
 *   Control (Input / Select / etc.)
 *   Description (optional)
 *   Message (validation)
 *
 *   <TextField
 *     control={form.control}
 *     name="email"
 *     label="Email"
 *     description="We won't share this."
 *     render={(field) => <Input type="email" {...field} />}
 *   />
 */
export function TextField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  render,
}: TextFieldProps<TFieldValues, TName>) {
  return (
    <RHFFormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>{render(field as never) as never}</FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
