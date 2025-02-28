// app/page.tsx
import HexagonalMap from './components/HexagonalMap';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <HexagonalMap size={16} tileSize={1} tileHeight={0.1} initialMapLevel={2} />
    </main>
  );
}