# Forge — current design system

Snapshot of the Forge Kanban UI as built, exported for redesign work.

## Stack
React 19 + TypeScript + Vite · Tailwind CSS v4 (`@theme` tokens in `forge-ui/src/index.css`) · lucide-react icons · @hello-pangea/dnd for board drag-and-drop. Ships as an installable PWA.

## Character
Dark-mode only, dense, low-chrome. Near-black background with one raised surface, a single indigo accent, and colour used almost exclusively to encode data (status, priority, tags) rather than decoration. Monospace is reserved for identifiers.

## Source of truth
- Colour / type tokens — `forge-ui/src/index.css` (`@theme` block)
- Status, priority and tag colours — `forge-ui/src/lib/constants.ts` (applied inline from data)
- Components — `forge-ui/src/components/`
- Screens — `forge-ui/src/pages/`

## Known constraints for a redesign
- Dark-mode first; there is no light theme today.
- iOS PWA draws under the notch (`viewport-fit=cover`), so page chrome depends on `env(safe-area-inset-*)`.
- Touch targets grow to 44px only on coarse pointers; desktop stays compact.
- Board columns scroll horizontally with x-proximity scroll-snap on narrow screens.
