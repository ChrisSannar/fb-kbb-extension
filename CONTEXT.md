# FB Marketplace → KBB Valuation Extension

A private Chrome extension that, from a Facebook Marketplace car listing, opens the matching KBB valuation page. This glossary fixes the language for a car's identity, because KBB's URL conflates several distinct concepts.

## Language

**Listing**:
A Facebook Marketplace vehicle for-sale post that the extension reads.
_Avoid_: ad, post, item

**Taxonomy**:
The one-time, offline-scraped dataset mapping Make → Model → Year → Styles, bundled into the extension. The extension reads it locally; it never queries KBB at runtime.
_Avoid_: database, index

**Style**:
The complete KBB path segment for one configuration, e.g. `ex-l-sport-utility-4d` (Trim + Body style + Doors). The unit the Taxonomy is keyed on and the thing a built URL points at.
_Avoid_: trim (for the whole thing), variant

**Trim**:
The grade / equipment level alone, e.g. `EX-L`. One input to a Style, and the only Style-component a Listing sometimes provides.
_Avoid_: style, package

**Body style**:
The body configuration, e.g. `Sport Utility`, `Sedan`. A Style-component obtained from the Taxonomy, never from the Listing.

**Doors**:
The door-count Style-component, e.g. `4D`. From the Taxonomy, never from the Listing.

**Category**:
KBB's vehicle class, used as the `category` query param, e.g. `suv`, `sedan`, `truck`. Distinct from Body style.

## Required identity vs defaulted attributes

A Listing must explicitly yield **year, make, and model** — these three identify the vehicle and are never guessed. Everything else (Trim, mileage, color, condition, pricetype) is defaulted to a fixed value at URL-build time.
