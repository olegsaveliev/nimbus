/* Buffered text input / textarea.
 *
 * Controlled fields whose `value` is read back from the global board store jump
 * the caret to the end while typing: the store update lags a tick, so React
 * briefly re-renders the input with the stale value and rewrites the DOM node,
 * which moves the caret. These keep a LOCAL buffer that owns the value while the
 * field is focused (caret stays put), and adopt the incoming `value` only when
 * the field is NOT being edited — so external changes (AI rewrites, switching
 * tasks) still flow in without clobbering an in-progress edit. */
import { useEffect, useRef, useState } from "react";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

export function LiveInput({ value, onChange, ...rest }: InputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (document.activeElement !== ref.current) setLocal(value);
  }, [value]);
  return (
    <input
      ref={ref}
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        onChange(e.target.value);
      }}
      {...rest}
    />
  );
}

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

export function LiveTextarea({ value, onChange, ...rest }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (document.activeElement !== ref.current) setLocal(value);
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        onChange(e.target.value);
      }}
      {...rest}
    />
  );
}
