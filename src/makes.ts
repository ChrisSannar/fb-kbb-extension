import { slugify } from "./url-builder";

/**
 * Known makes, longest (multi-word) first so prefix-matching a title is greedy.
 * Not exhaustive — extend as needed.
 */
export const MAKES: string[] = [
  "Alfa Romeo",
  "Aston Martin",
  "Land Rover",
  "Mercedes-Benz",
  "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler",
  "Dodge", "Fiat", "Ford", "Genesis", "GMC", "Honda", "Hyundai", "Infiniti",
  "Jaguar", "Jeep", "Kia", "Lexus", "Lincoln", "Maserati", "Mazda", "Mini",
  "Mitsubishi", "Nissan", "Polestar", "Porsche", "Ram", "Rivian", "Subaru",
  "Tesla", "Toyota", "Volkswagen", "Volvo",
];

/** KBB make-slug overrides where slugify(make) would be wrong. Add as discovered. */
export const MAKE_SLUG_OVERRIDES: Record<string, string> = {
  // "mercedes-benz": "mercedes-benz", // slugify already correct; example placeholder
};

export function resolveMakeSlug(make: string): string {
  const key = make.trim().toLowerCase();
  return MAKE_SLUG_OVERRIDES[key] ?? slugify(make);
}
