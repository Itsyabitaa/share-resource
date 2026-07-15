# Architecture & Technical Decisions

## Markdown Editor Choice

### Evaluation Spike

We evaluated three potential markdown editor libraries for **md-Nest**:

1. **SimpleMDE (via `react-simplemde-editor` / EasyMDE)**
   - **Mobile Usability**: Poor out-of-the-box. Uses CodeMirror 5 which has known virtual keyboard issues (cursor jumping, focus loss) on touch viewports. However, it provides a stable API, simple wrapper state updates, and works out-of-the-box on desktops.
   - **Live Preview Quality**: Standard side-by-side split screen and fullscreen HTML render previews.
   - **Bundle Size**: Large (~220 KB minified + FontAwesome CSS).
   - **Maintenance Activity**: Abandoned (original SimpleMDE). EasyMDE is minimally maintained but still inherits CodeMirror 5's foundational architecture.

2. **CodeMirror 6**
   - **Mobile Usability**: Outstanding. Completely rewritten with native touch/keyboard selection support, modern contenteditable handling, and virtual keyboard input tracking.
   - **Live Preview Quality**: Excellent modular previews. Extensions allow custom decorations, line replacement widgets, and syntax highlighting.
   - **Bundle Size**: Small (~80 KB depending on loaded extensions). Very modular.
   - **Maintenance Activity**: Extremely High. Maintained by Marijn Haverbeke, who is the leading developer of text editor engines.
   - **Integration Effort**: High. It is a editor kit, not a packaged markdown editor. We would need to implement our own toolbar buttons, state keymaps, status bar, and fullscreen toggle controls.

3. **Milkdown**
   - **Mobile Usability**: Very good. Prosemirror-based editor with strong mobile responsiveness.
   - **Live Preview Quality**: State-of-the-art WYSIWYG live editor rendering (similar to Notion/Typora).
   - **Bundle Size**: Heavy (~300+ KB minified + dependencies).
   - **Maintenance Activity**: High.
   - **Integration Effort**: Medium. Changes editing paradigm from raw markdown text to structured blocks.

---

### Technical Decision

**We decide to retain SimpleMDE (EasyMDE)** but style it completely using our **CSS Design Tokens**.

#### Rationale:
- **State Integrity**: SimpleMDE's raw text state maps perfectly to the existing database serialization, backend validations, and Mammoth Word document converters.
- **Development Speed vs. Duplication**: Migrating to CodeMirror 6 would require rebuilding the formatting toolbar, preview synchronization logic, and status count indicators from scratch. This introduces significant duplication risks and potential UI inconsistencies.
- **Theme/Token Customization**: EasyMDE exposes standard styling classes (`.editor-toolbar`, `.CodeMirror`, `.editor-preview-side`, etc.). We can inject CSS overrides in `styles/globals.css` referencing our design tokens (e.g. `var(--color-bg)`, `var(--color-border)`) to make the editor perfectly match both light and dark themes without changing the underlying package.
