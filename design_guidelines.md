# Social Media Grower - Interactive Documentation Design Guidelines

## Design Approach: Developer Tool Interface

**Selected System**: Hybrid approach inspired by VSCode, GitHub CLI documentation, and terminal applications
**Rationale**: Utility-focused productivity tool requiring clarity, efficiency, and terminal authenticity

## Core Design Principles

1. **Terminal Authenticity**: Embrace monospace typography and command-line aesthetics
2. **Information Density**: Dense but organized - developers expect comprehensive details
3. **Scan-ability**: Clear visual hierarchy for quick navigation through technical content
4. **Professional Polish**: Clean, modern take on classic terminal interfaces

---

## Typography System

**Primary Font**: `'Fira Code', 'JetBrains Mono', 'Consolas', monospace` (via Google Fonts)
**Secondary Font**: `'Inter', 'SF Pro Display', system-ui, sans-serif` for UI elements

**Hierarchy**:
- ASCII Headers: `text-4xl` to `text-6xl` (48-60px), `font-bold`, monospace
- Section Titles: `text-2xl` (24px), `font-semibold`, sans-serif
- Command Examples: `text-base` (16px), monospace, colored syntax
- Body Text: `text-sm` to `text-base` (14-16px), sans-serif
- Code Inline: `text-sm`, monospace with subtle background

---

## Layout System

**Spacing Units**: Tailwind units 2, 4, 6, 8, 12, 16
- Component padding: `p-6` to `p-8`
- Section spacing: `space-y-8` to `space-y-12`
- Grid gaps: `gap-4` to `gap-6`

**Container Structure**:
- Max-width: `max-w-7xl` for main content
- Sidebar: Fixed `w-64` or `w-80` for navigation menu
- Terminal area: `w-full` with `max-w-4xl` for readability

**Grid Patterns**:
- 2-column layout for feature comparison: `grid-cols-1 md:grid-cols-2`
- 3-column for tech stack cards: `grid-cols-1 md:grid-cols-3`
- File tree: Single column with indentation

---

## Component Library

### Navigation Menu (Sidebar)
- Fixed position sidebar with numbered menu items (1-9)
- Each item: Icon emoji + descriptive title
- Active state: Distinct background highlight
- Hover: Subtle background change
- Spacing: `space-y-2` between items, `p-3` padding per item

### Terminal Display
- Full-width code blocks with syntax highlighting
- Line numbers for code examples (optional toggle)
- Copy-to-clipboard button on hover
- Monospace font with adequate line-height (1.6-1.8)
- Background: Dark terminal-style container

### Command Cards
- Compact cards displaying command syntax
- Usage examples with color-coded output
- Description text below command
- Layout: `flex` with icon/emoji + text

### File Tree Visualization
- ASCII-style tree structure using box-drawing characters
- Indentation: `pl-4` per nesting level
- File icons: Emoji indicators (📁 folders, 📄 files)
- Color coding by file type

### Status Indicators
- Emoji-based system status (🟢 ✅ ❌ 🔴 🟡)
- Inline badges for platform states
- Threat level display with color + icon

### Demo/Testing Section
- Curl command boxes with copy functionality
- Step-by-step numbered instructions
- Browser URL display with prominent styling

### ASCII Art Header
- Large monospace text logo
- Project tagline underneath
- Subtle separator line below
- Center-aligned presentation

---

## Interaction Patterns

### Menu Navigation
- Click to jump to section (smooth scroll)
- Keyboard shortcuts (number keys 1-9)
- Active section highlight in sidebar
- Sticky sidebar on scroll

### Code Blocks
- Hover reveals copy button
- Click to select all
- Syntax highlighting for multiple languages
- Language tag in corner

### Collapsible Sections
- Expandable file details (line count, purpose)
- Accordion-style FAQ if needed
- Smooth transitions (150-200ms)

---

## Visual Styling Specifics

### Containers
- Terminal blocks: Rounded corners `rounded-lg`, subtle shadow
- Cards: `rounded-md` with border
- Sidebar: No border, full-height background

### Borders & Dividers
- Section dividers: Thin horizontal rules `border-t`
- Card borders: 1px solid with subtle opacity
- Terminal borders: Optional themed border

### Shadows
- Minimal usage - only on floating elements
- Terminal: `shadow-lg` for depth
- Cards: `shadow-sm` for subtle lift

---

## Content Organization

### 9-Section Structure
1. **Project Structure**: Visual tree + explanations (2-column grid)
2. **Architecture**: Diagram-style layout with connecting elements
3. **Features**: 3-column grid of feature cards
4. **Commands**: Organized by category (4 categories), table or card layout
5. **Deployment**: Step-by-step numbered list with code blocks
6. **Build Process**: Timeline-style vertical layout (5 phases)
7. **Tech Stack**: 3-column categorized grid (Backend/Frontend/Deployment)
8. **File Breakdown**: Table layout with sortable columns
9. **Demo Commands**: Large code blocks + testing instructions

### Layout Per Section
- Section header: Large title + emoji + brief description
- Content area: Grid or flex layout as appropriate
- Code examples: Full-width terminal blocks
- Navigation: Sticky "Back to top" or "Next section"

---

## Accessibility

- Semantic HTML structure (`<nav>`, `<main>`, `<section>`)
- Keyboard navigation for all interactive elements
- ARIA labels on icon-only buttons
- Sufficient contrast ratios (WCAG AA minimum)
- Focus indicators on all focusable elements

---

## Responsive Behavior

**Mobile (< 768px)**:
- Sidebar collapses to hamburger menu
- Single column layouts
- Reduced font sizes (scale down 1-2 units)
- Stack terminal and content vertically

**Tablet (768px - 1024px)**:
- Sidebar remains visible or toggleable
- 2-column grids remain, 3-column becomes 2
- Maintain readability with adjusted spacing

**Desktop (> 1024px)**:
- Full sidebar visible
- Multi-column grids active
- Optimal line lengths for code blocks

---

## Special Considerations

**Emoji Usage**: Consistent throughout for visual scanning - use liberally but purposefully
**Monospace Authenticity**: Critical for code, commands, file paths, and ASCII art
**Information Density**: Pack content efficiently - developers prefer comprehensive over minimal
**Copy Functionality**: Essential for all code blocks and commands
**Syntax Highlighting**: Use a developer-friendly color scheme (consider VS Code Dark+ palette)