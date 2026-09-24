import type { NextConfig } from "next";
import { resolve } from "node:path";

// СТРАНИЦА СЛУЖБЫ ДАННЫХ НА NEXT (шаг 285-4). Next живёт ВНУТРИ процесса Express (`presentation.js`): один процесс
// и один порт, как у любого элемента узла. Сборка — в папку корня службы (`../<NEXT_DIST_DIR>`): установщик узла
// собирает в соседнюю папку (.next-a / .next-b), пока работает прежняя, и удаляет старую — пути у него от корня.
// 295: Next 16 Cache Components — кэш только через 'use cache' + cacheLife; старые настройки маршрута запрещены.
const nextConfig: NextConfig = {
  cacheComponents: true,
  distDir: `../${process.env.NEXT_DIST_DIR || ".next"}`,
  outputFileTracingRoot: resolve(__dirname, ".."),
  turbopack: { root: resolve(__dirname, "..") },
};

export default nextConfig;
