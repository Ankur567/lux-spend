"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Feather, Flame, Sparkle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { createWishlistItemAction, updateWishlistItemAction } from "@/app/actions/wishlist";
import { useApp } from "@/components/app/app-context";
import { Field, MoneyInput, NativeSelect, Segmented, TextArea, TextInput } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { haptic } from "@/hooks/use-action";
import { wishlistItemSchema, type WishlistItemInput } from "@/lib/validators/wishlist";

const CUSTOM = "__custom__";

export function WishlistItemForm({ itemId, defaults, priceLocked }: { itemId?: string; defaults?: Partial<WishlistItemInput>; priceLocked?: boolean }) {
  const app = useApp();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const initialCategory = defaults?.category ?? app.settings.categories[0] ?? "Other";
  const [categoryChoice, setCategoryChoice] = useState(app.settings.categories.includes(initialCategory) ? initialCategory : CUSTOM);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors },
  } = useForm<WishlistItemInput, unknown, z.output<typeof wishlistItemSchema>>({
    resolver: zodResolver(wishlistItemSchema),
    defaultValues: {
      name: "",
      description: "",
      estimatedPrice: "",
      priority: "MEDIUM",
      owner: "US",
      targetDate: "",
      imageUrl: "",
      productUrl: "",
      notes: "",
      ...defaults,
      category: initialCategory,
    },
  });

  // The server re-validates the raw input, so the untransformed values are sent (not paise).
  const onSubmit = handleSubmit(async () => {
    setSubmitting(true);
    const raw = getValues();
    const res = itemId ? await updateWishlistItemAction(itemId, raw) : await createWishlistItemAction(raw);
    setSubmitting(false);
    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [key, messages] of Object.entries(res.fieldErrors)) {
          setError(key as keyof WishlistItemInput, { message: messages[0] });
        }
      }
      toast.error(res.error);
      return;
    }
    haptic(12);
    if (itemId) {
      const data = res.data as { message?: string };
      toast.success(data.message ?? "Saved");
      router.replace(`/wishlist/${itemId}`);
    } else {
      toast.success(res.message ?? "Added to your wishlist ✨");
      router.replace(`/wishlist/${(res.data as { id: string }).id}`);
    }
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-6" noValidate>
      <Field label="What is it?" htmlFor="w-name" error={errors.name?.message} required>
        <TextInput id="w-name" placeholder="e.g. Rolex Datejust" autoComplete="off" maxLength={120} {...register("name")} />
      </Field>

      <Field
        label="Estimated price"
        htmlFor="w-price"
        error={errors.estimatedPrice?.message}
        required
        hint={priceLocked ? "Price can't change after purchase or archiving." : undefined}
      >
        <MoneyInput id="w-price" big currency={app.currency} readOnly={priceLocked} aria-readonly={priceLocked} className={priceLocked ? "opacity-60" : undefined} {...register("estimatedPrice")} />
      </Field>

      <Field label="Priority" error={errors.priority?.message}>
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <Segmented
              name="Priority"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "HIGH", label: "High", icon: <Flame className="size-4" /> },
                { value: "MEDIUM", label: "Medium", icon: <Sparkle className="size-4" /> },
                { value: "LOW", label: "Low", icon: <Feather className="size-4" /> },
              ]}
            />
          )}
        />
      </Field>

      <Field label="Who is it for?" error={errors.owner?.message}>
        <Controller
          control={control}
          name="owner"
          render={({ field }) => (
            <Segmented
              name="Owner"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "ME", label: "Me" },
                { value: "PARTNER", label: app.partner?.name ?? "Partner" },
                { value: "US", label: "Us" },
              ]}
            />
          )}
        />
      </Field>

      <Field label="Category" htmlFor="w-category" error={errors.category?.message}>
        <NativeSelect
          id="w-category"
          value={categoryChoice}
          onChange={(e) => {
            setCategoryChoice(e.target.value);
            setValue("category", e.target.value === CUSTOM ? "" : e.target.value, { shouldValidate: false });
          }}
        >
          {app.settings.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={CUSTOM}>+ Custom category…</option>
        </NativeSelect>
        {categoryChoice === CUSTOM ? (
          <TextInput className="mt-2" placeholder="Category name" maxLength={40} aria-label="Custom category" {...register("category")} />
        ) : null}
      </Field>

      <Field label="Target date" htmlFor="w-date" error={errors.targetDate?.message} hint="Optional. Earlier dates are funded first within the same priority.">
        <TextInput id="w-date" type="date" {...register("targetDate")} />
      </Field>

      <Field label="Product link" htmlFor="w-product" error={errors.productUrl?.message}>
        <TextInput id="w-product" type="url" inputMode="url" placeholder="https://" autoComplete="off" {...register("productUrl")} />
      </Field>

      <Field label="Image link" htmlFor="w-image" error={errors.imageUrl?.message} hint="Optional. Paste a direct link to a product photo.">
        <TextInput id="w-image" type="url" inputMode="url" placeholder="https://…/photo.jpg" autoComplete="off" {...register("imageUrl")} />
      </Field>

      <Field label="Description" htmlFor="w-desc" error={errors.description?.message}>
        <TextArea id="w-desc" rows={2} placeholder="Colour, size, model…" {...register("description")} />
      </Field>

      <Field label="Notes" htmlFor="w-notes" error={errors.notes?.message}>
        <TextArea id="w-notes" rows={2} placeholder="Anything else to remember" {...register("notes")} />
      </Field>

      <div className="pb-safe sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 -mx-4 bg-gradient-to-t from-background via-background to-transparent px-4 pt-4 md:bottom-0">
        <Button type="submit" className="h-12 w-full rounded-2xl text-base" disabled={submitting}>
          {submitting ? "Saving…" : itemId ? "Save changes" : "Add to wishlist"}
        </Button>
      </div>
    </form>
  );
}
