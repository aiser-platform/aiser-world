# Aiser Platform - CSS Architecture

## Single Source of Truth Design

This directory follows a **single source of truth** pattern to eliminate conflicts, redundancies, and maintainability issues.

## File Structure

### 1. `design-system.css` - Design Tokens & Component Styles
**Purpose:** Design tokens (colors, spacing, typography) and Ant Design component overrides.

**Contains:**
- CSS custom properties (variables) for colors, spacing, typography
- Theme definitions (light/dark mode)
- Ant Design component styling (buttons, menus, cards, etc.)
- Component-specific visual styles

**Does NOT contain:**
- Layout positioning rules
- Spacing/margin/padding for layout containers
- Scrollbar styling
- Page wrapper patterns

### 2. `layout-system.css` - Layout & Positioning
**Purpose:** All layout-related rules - positioning, spacing, overflow, scrollbars.

**Contains:**
- `.ant-layout-content` positioning and spacing
- `.page-content` container rules
- `.page-wrapper` unified page pattern
- All scrollbar styling (universal and page-specific)
- Layout spacing rules (margins, padding for layout containers)
- Page header, content cards, and layout component spacing

**Does NOT contain:**
- Design tokens (colors, typography)
- Component visual styles
- Theme definitions

### 3. `globals.css` - Global Resets & Base Styles
**Purpose:** Global resets, base HTML element styles, and utility classes.

**Contains:**
- HTML/body resets
- Base typography
- Image responsiveness
- Link styling
- Focus indicators
- Utility classes

**Does NOT contain:**
- Layout positioning
- Component-specific styles
- Design tokens (imported from design-system.css)

## Import Order (Critical!)

The import order in `app/globals.css` is critical:

```css
/* 1. Ant Design reset */
@import 'antd/dist/reset.css';

/* 2. Tailwind CSS */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 3. Design system (tokens, component styles) */
@import '../styles/design-system.css';

/* 4. Layout system (positioning, spacing) - HIGHEST PRIORITY */
@import '../styles/layout-system.css';
```

**Why this order?**
- Design system provides tokens and base component styles
- Layout system overrides with positioning rules (uses `!important` where needed)
- Layout system has highest priority to ensure consistent layout behavior

## Best Practices

### ✅ DO:
- **Follow Ant Design patterns**: Use `flex: 1` for Content, `min-height: 0` for flex children
- **Use relative positioning**: Prefer `position: relative` over `position: fixed` for better compatibility
- **Follow spacing guidelines**: Use multiples of 8px (8px, 16px, 24px) as per Ant Design
- **Add design tokens to `design-system.css`**: Colors, typography, spacing tokens
- **Add layout/positioning rules to `layout-system.css`**: Positioning, spacing, overflow
- **Use CSS custom properties (variables)**: For theme-adaptive values
- **Add `!important` only in layout-system.css**: For critical overrides when needed
- **Keep component visual styles in design-system.css**: Button styles, card styles, etc.

### ❌ DON'T:
- **Don't use fixed positioning on Content**: Use flex layout instead (Ant Design best practice)
- **Don't duplicate rules across files**: Single source of truth
- **Don't add layout positioning to design-system.css**: Keep it in layout-system.css
- **Don't add design tokens to layout-system.css**: Keep it in design-system.css
- **Don't mix concerns**: Colors in design file, positioning in layout file
- **Don't forget `min-height: 0`**: Critical for flex children to shrink properly
- **Don't use arbitrary spacing values**: Stick to 8px multiples (8, 16, 24, 32, etc.)

## Common Patterns

### Page Wrapper Pattern
All dashboard pages (data, settings, billing, team) use `.page-wrapper`:

```tsx
<div className="page-wrapper">
  <div className="page-header">
    <Title className="page-title">Page Title</Title>
  </div>
  {/* Content */}
</div>
```

**Key points:**
- Uses `position: relative` (not absolute)
- Uses `flex: 1` to fill available space
- Has `min-height: 0` for proper flex behavior
- Scrollbar is on `.page-wrapper` (not on Content)
- No right padding to extend to scrollbar edge

### Content Area Pattern (Ant Design Best Practice)
The main content area uses flex layout (not fixed positioning):

```tsx
<Content className="dashboard-content-override" style={{ 
  flex: 1,              // Fill available space (Ant Design pattern)
  minHeight: 0,         // Critical for flex children
  overflow: 'hidden',   // Content doesn't scroll
  position: 'relative', // Use relative, not fixed
  display: 'flex',
  flexDirection: 'column'
}}>
  <div className="page-content">
    {children}
  </div>
</Content>
```

**Why this approach:**
- ✅ Follows Ant Design's recommended Layout patterns
- ✅ Better browser compatibility
- ✅ Works naturally with flexbox
- ✅ No z-index conflicts
- ✅ Responsive by default

## Maintenance

When adding new styles:
1. **Design tokens?** → `design-system.css`
2. **Layout/positioning?** → `layout-system.css`
3. **Global resets?** → `globals.css`
4. **Component-specific visual?** → `design-system.css`

When fixing layout issues:
- Check `layout-system.css` first
- Ensure no conflicting rules in `design-system.css`
- Verify import order in `globals.css`

## Migration Notes

Previously, layout rules were scattered across:
- `globals.css` (had layout rules)
- `design-system.css` (had conflicting layout rules)

Now, all layout rules are centralized in `layout-system.css`, eliminating conflicts and providing a single source of truth.

