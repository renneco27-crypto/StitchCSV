---
name: Midnight Bloom
colors:
  surface: '#19101b'
  surface-dim: '#19101b'
  surface-bright: '#413542'
  surface-container-lowest: '#140b16'
  surface-container-low: '#221824'
  surface-container: '#261c28'
  surface-container-high: '#312633'
  surface-container-highest: '#3c313e'
  on-surface: '#efddee'
  on-surface-variant: '#e3bdc5'
  inverse-surface: '#efddee'
  inverse-on-surface: '#382d39'
  outline: '#aa888f'
  outline-variant: '#5b3f46'
  surface-tint: '#ffb1c5'
  primary: '#ffb1c5'
  on-primary: '#65002f'
  primary-container: '#ff4a8d'
  on-primary-container: '#590028'
  inverse-primary: '#ba005b'
  secondary: '#f9b3cc'
  on-secondary: '#4f2035'
  secondary-container: '#6a364b'
  on-secondary-container: '#e6a2ba'
  tertiary: '#d9bede'
  on-tertiary: '#3c2942'
  tertiary-container: '#a189a6'
  on-tertiary-container: '#35233b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffd9e1'
  primary-fixed-dim: '#ffb1c5'
  on-primary-fixed: '#3f001a'
  on-primary-fixed-variant: '#8f0044'
  secondary-fixed: '#ffd9e4'
  secondary-fixed-dim: '#f9b3cc'
  on-secondary-fixed: '#360b1f'
  on-secondary-fixed-variant: '#6a364b'
  tertiary-fixed: '#f6d9fa'
  tertiary-fixed-dim: '#d9bede'
  on-tertiary-fixed: '#26152c'
  on-tertiary-fixed-variant: '#54405a'
  background: '#19101b'
  on-background: '#efddee'
  surface-variant: '#3c313e'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The design system shifts from a bright, airy aesthetic to a high-contrast, nocturnal atmosphere. The brand personality is "Mysterious Elegance"—combining the softness of the original blush tones with the depth of a midnight palette. It targets a premium, fashion-forward audience seeking an immersive, intimate digital experience.

The design style is a blend of **Minimalism** and **Glassmorphism**. It utilizes heavy whitespace (translated here as "deep space"), refined typography, and translucent layers that allow the signature floral motifs to glow from behind the UI. The emotional response is one of calm, luxury, and sophisticated femininity.

## Colors

The palette is anchored by a deep **Midnight Plum** (`#120914`) for the primary surface, ensuring a rich, non-black depth. 

- **Primary (Magenta):** A vibrant, high-saturation magenta used for key actions and branding. On dark surfaces, this color should have a slight outer glow in interactive states.
- **Secondary (Blush Pink):** A softer, desaturated pink used for supporting elements, secondary buttons, and decorative accents.
- **Surface (Deep Plum):** A slightly lighter version of the background used for cards and elevated containers to create depth without losing the nocturnal feel.
- **Text:** Primary headings use a "Bone White" (`#F8F0F2`) to maintain high legibility, while body text uses "Soft Petal" (`#D6C2C9`) to reduce eye strain.

## Typography

This design system utilizes a high-contrast typographic pairing to reinforce the luxury aesthetic. 

- **Display & Headlines:** Use **Playfair Display**. Its high-contrast serifs evoke a magazine-editorial feel. In this dark mode, use "Bone White" for these levels to make them "pop" against the plum background.
- **Body & UI Labels:** Use **Be Vietnam Pro**. This sans-serif is approachable and highly legible. Its contemporary structure balances the classic nature of the serif headlines. 
- **Stylistic Note:** For display headings, consider using "Italic" styles sparingly to emphasize the feminine, flowing nature of the brand.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop to maintain an editorial, structured feel, while transitioning to a **Fluid Grid** on mobile devices.

- **Desktop:** 12-column grid with a 1280px max-width. Large 64px side margins provide a sense of "luxury through space."
- **Tablet:** 8-column grid with 32px margins.
- **Mobile:** 4-column grid with 16px margins.
- **Rhythm:** All spatial relationships are multiples of 8px. Use generous padding within cards (minimum 24px) to ensure the dark UI doesn't feel cramped or "heavy."

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Subtle Blurs** rather than traditional black shadows, which can look "muddy" on a plum background.

- **Surface Tiers:** Level 0 is the Midnight Plum background. Level 1 (Cards) uses a slightly lighter Plum tint with a 1px border of 10% white to define the edges.
- **Glassmorphism:** Overlays and navigation bars should use a 60% opacity version of the surface color with a `20px` background blur.
- **Glows:** Instead of drop shadows, use "Bloom Shadows"—low-opacity glows using the Primary Magenta color—for floating action buttons or active states to simulate light emitting from the element.

## Shapes

The shape language is **Rounded**, reflecting the organic curves of the floral brand motifs.

- **Standard Elements:** Buttons, input fields, and cards use a 0.5rem (8px) corner radius.
- **Interactive Accents:** Use pill-shapes (rounded-full) for tags, chips, and notification badges to contrast against the more structured card shapes.
- **Imagery:** Flower line art should be treated as "negative space" or "stroke-only" elements. Adjust the line art color to the Secondary Blush Pink at 40% opacity to ensure it looks like a subtle watermark against the dark surface.

## Components

- **Buttons:** Primary buttons are solid Magenta with white text. Secondary buttons use a Magenta outline with a subtle 5% Magenta fill.
- **Input Fields:** Use a "Darkened Inset" look. Background should be 20% darker than the card surface, with a 1px "Soft Petal" border that brightens to Magenta on focus.
- **Cards:** Use the Level 1 surface color. Avoid heavy shadows; use a subtle top-light (a 1px semi-transparent highlight on the top edge) to give a sense of physical presence.
- **Chips/Filters:** Use the pill-shape. Unselected chips should be a ghost-style (outline only); selected chips should be the Secondary Blush Pink with dark plum text.
- **Flower Line Art:** When used as a component background, the art must be rendered in a monochromatic "Blush" stroke. Avoid fills; keep lines thin (1pt) to maintain an elegant, etched appearance.