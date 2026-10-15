"use client";

import { createContext, useContext } from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
export { useForm } from "react-hook-form";

const FormContext = createContext<{ name?: string }>({});

export function Form({ children, ...rest }: any) {
  return <FormProvider {...rest}>{children}</FormProvider>;
}
export function FormField({ control, name, render }: any) {
  const form = useFormContext();
  const formControl = control ?? form.control;

  return (
    <FormContext.Provider value={{ name }}>
      <Controller
        name={name}
        control={formControl}
        render={({ field, fieldState }) =>
          render({
            field,
            fieldState,
            formState: form.formState,
          })
        }
      />
    </FormContext.Provider>
  );
}

export function FormItem({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
}

export function FormLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
      {children}
    </label>
  );
}

export function FormControl({ children }: { children: React.ReactNode }) {
  return children;
}

export function FormDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>;
}

export function FormMessage({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  const { name } = useContext(FormContext);
  const form = useFormContext();
  const error = name ? form.formState.errors[name] : undefined;

  if (!error && !children) return null;

  return (
    <p className={`text-sm font-medium text-destructive ${className}`}>
      {children || (error?.message as string)}
    </p>
  );
}

