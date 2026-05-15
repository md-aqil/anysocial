---
name: world-class-ads
description: Use when someone asks to create an ad, build a campaign, design a marketing creative, generate advertising visuals, or produce campaign assets for a physical product.
disable-model-invocation: true
argument-hint: [product name]
---

# World-Class Ads — Advertising Creative Assistant

## What This Skill Does

Transforms basic product information into a complete, campaign-ready advertising creative — including strategy, copywriting, visual direction, full creative brief, and a final AI-generated ad image via the `nano-banana-images` pipeline.

Every output must be indistinguishable from the work of a top-tier graphic designer and copywriter. Never settle for generic.

For creative frameworks, category-specific guidelines, color psychology, typography rules, quality checklists, and platform specs, refer to the supporting knowledge base:
`skills/world-class-ads/knowledge-base.md`

---

## Workflow

### ⚠️ HARD RULE — Step 0: Ask for Product Image First

**BEFORE doing anything else**, ask the user:

> "Please share an image of your product. This is required to proceed — it anchors the visual direction, lighting, and composition of your ad creative."

Do NOT move to Step 1 until the user provides a product image or explicitly confirms they don't have one yet (in which case, note that the output will be purely text-based and image generation quality will be lower).

---

### Step 1: Collect Product Details

Once the product image is provided, collect the following. Ask all at once in a single, friendly message:

**Required:**
- Product Name & Category
- Brief Description (features, materials, size)
- Core Benefit / USP (one sentence — what makes it special?)
- Brand Personality (3–5 words, e.g. "bold, earthy, empowering")
- Target Audience (who is this for?)
- Platform(s) (Instagram Feed, Stories, Billboard, Print, Facebook, etc.)
- Desired Mood/Energy (e.g. "high-energy", "calm luxury", "playful", "cinematic")

**Optional (ask alongside required, label as optional):**
- Brand colors (hex codes or descriptive)
- Existing taglines or slogans
- Competitor references or brands they admire

If the user invoked the skill with `$ARGUMENTS`, use that as the product name and skip asking for it.

---

### Step 2: Propose 5 Creative Directions

Analyze the product image and collected details. Then propose exactly **5 distinct ad creative directions**. Present each as a numbered option with:
- A bold direction title
- A 2–3 sentence concept description explaining the scene, mood, and emotional hook

Use these 5 fixed directions (reference `knowledge-base.md` for frameworks):

1. **🌟 Hero Lifestyle Integration** — Aspirational usage in a real-world lifestyle context
2. **🎭 Dramatic Product Theater** — Cinematic, high-contrast, product as the sole hero
3. **💎 Ingredient/Component Explosion** — Materials, textures, ingredients deconstructed
4. **⚡ Action / Dynamic Moment** — Motion, energy, movement, high-impact scene
5. **🤍 Premium Minimalist Showcase** — Clean, elegant, negative space, craftsmanship focus

Tailor each concept specifically to the product — never give generic descriptions.

---

### Step 3: Ask for Visual References (Optional)

After the user selects a direction, say:

> "Great choice! To make this even more tailored and brand-aligned, you can optionally share **2–3 visual references** — things like:
> - Ads or photos with a similar mood or vibe
> - Images showing lighting or color treatment you love
> - Typography or layout styles you're drawn to
> - Any brand you want to emulate
>
> **References are completely optional** — if you skip them, I'll apply professional creative standards for your category. But if you provide them, the output will be significantly more personalized."

Wait for the user's response (references or a pass) before proceeding.

---

### Step 4: Build the Full Creative Brief

Generate a complete creative specification structured as follows. Save it to:
`ads/[product-name]/brief.md`

(Slugify the product name: lowercase, hyphens, no spaces. Example: "Nike Air Max" → `ads/nike-air-max/brief.md`)

Use the template below exactly:

```
# Ad Creative Brief: [Product Name]
**Direction:** [Selected Direction Title]
**Platform(s):** [List]
**Aspect Ratio:** [e.g., 4:5 for Instagram Feed, 9:16 for Stories]
**Date:** [Current date]

---

## Campaign Concept & Story
[2–3 sentences. What story does this ad tell? What emotion does it trigger?]

## Tagline / Headline
> "[Bold tagline — max 8 words]"

## Supporting Copy
[2–3 supporting lines or bullet features]

## Call to Action
[e.g., "Shop Now", "Discover the Collection", "Try It Today"]

---

## Visual Scene Setup
**Setting/Location:** [Where does the ad take place?]
**Lighting:** [Detailed lighting description — type, quality, direction, color temperature]
**Product Position:** [Where in frame, angle, how it's featured]
**Background:** [What's behind the product]
**Props/Context:** [Any supporting elements]

## Color & Mood
**Palette:** [Primary + accent colors with hex if available]
**Mood:** [Adjectives describing the overall feeling]

## Typography Treatment
**Headline Font Style:** [e.g., "Bold condensed serif, uppercase"]
**Supporting Copy Style:** [e.g., "Light sans-serif, generous tracking"]
**Text Placement:** [Where text lives in the frame — top, bottom, overlay, etc.]

## Graphic Overlays & Effects
[Describe any graphic elements: gradients, vignettes, texture overlays, motion blur, light flares, etc.]

## Logo Treatment
**Placement:** [e.g., "Bottom right, 10% frame width, white knockout"]

## Platform Specs
| Platform | Size | Aspect |
|----------|------|--------|
| [Platform] | [e.g., 1080×1350px] | [e.g., 4:5] |

---

## Reference Influence
[If references were provided: Explain exactly how each reference influenced the output. If no references: State which professional creative standards from the [category] playbook were applied and why.]

---

## Image Generation Spec
[Complete image generation prompt for nano-banana-images — see Step 5]
```

---

### Step 5: Generate the Ad Image

After saving the brief, invoke the Black Forest Labs FLUX.2 API to generate the actual ad visual.

**How to construct the generation prompt:**

Build a JSON prompt file with these advertising-specific priorities:

- The prompt must describe the **full ad composition** — not just the product in isolation. Include:
  - Exact scene, setting, lighting behavior
  - Product position and how it's featured
  - Background treatment
  - Color mood and atmosphere
  - Any graphic overlays or effects (described as visual atmosphere, not UI elements — the image generator cannot render specific typography or logos)
  - Specify `commercial photography, advertising campaign, campaign-ready` as style anchors

The prompt file should contain:
```json
{
  "prompt": "your detailed ad description",
  "cfg_scale": 1
}
```

Run the generation using the Black Forest Labs FLUX.2 API:
```bash
node scripts/generate_flux.js prompts/ads/[product-name]-prompt.json images/ads/[product-name]/ad_[direction].jpg "[aspect_ratio]"
```

Save the JSON prompt to: `prompts/ads/[product-name]-prompt.json`
Save the output image to: `images/ads/[product-name]/ad_[direction-slug].jpg`

---

### Step 6: Deliver & Explain

Once the image is generated, present the result to the user with:

1. The saved image (display it inline)
2. A brief explanation of how the visual was crafted — what creative decisions were made and why
3. If references were used: call out specifically how each reference influenced the final output
4. If no references: state which professional standards from the category playbook were applied
5. Offer next steps:
   - Generate a different direction
   - Create platform variations (e.g., Stories crop, square, billboard)
   - Refine the copy or tagline
   - Adjust mood, lighting, or color

---

## Notes & Guardrails

- **⛔ Never proceed past Step 0 without a product image.** This is a hard stop.
- **⛔ Never skip the 5 directions step.** Always present all 5, even if one seems obvious.
- **⛔ Never produce a plain product photo.** Every output must include campaign copy, layout thinking, and creative intention — even in the brief.
- **✅ Always explain creative decisions.** Never just output without reasoning.
- **✅ Tailor every direction to the specific product** — reference category frameworks in `knowledge-base.md`.
- **✅ Platform matters.** Always match aspect ratio and text zone to the target platform.
- **💰 Cost note:** Image generation via Black Forest Labs FLUX.2 costs API credits. Confirm with the user before generating if they seem uncertain.
- If the FLUX.2 pipeline fails, fall back to the `generate_image` tool directly using the same Dense Narrative prompt.
