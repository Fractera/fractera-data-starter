// СБОРКА СТРАНИЦЫ СЛУЖБЫ ДАННЫХ (шаг 285-4) — `npm run build`.
//
// Next собирается в папку корня службы, которую называет NEXT_DIST_DIR (установщик узла чередует .next-a / .next-b,
// пока прежняя сборка работает). Только после УСПЕШНОЙ сборки метка `.presentation-dist` называет новую папку:
// при старте `presentation.js` отдаёт именно её. Провал — метка прежняя, работающая версия не тронута.
import { spawnSync } from 'node:child_process'
import { writeFileSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// 🔒 ОКРУЖЕНИЕ СЛУЖБЫ — ИЗ ЕЁ `.env` В КОРНЕ (285-4). Next читает `.env` из папки приложения (`presentation/`), а
// установщик узла пишет `.env` в корень службы. ✗ Измерено: без этой строки страница собралась на узле БЕЗ
// оболочки — `PROJECT_SHELL_URL` на сборке пуст. Заданное снаружи (NEXT_DIST_DIR от установщика) не перезаписывается.
config({ path: join(ROOT, '.env'), quiet: true })
const dist = process.env.NEXT_DIST_DIR || '.next'
const r = spawnSync('npx', ['next', 'build', 'presentation'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, NEXT_DIST_DIR: dist },
  shell: process.platform === 'win32',
  windowsHide: true,
})
if (r.status !== 0) {
  console.error(`[build-presentation] сборка упала (код ${r.status}) — метка не тронута`)
  process.exit(r.status ?? 1)
}
const tmp = join(ROOT, `.presentation-dist.${process.pid}.tmp`)
writeFileSync(tmp, dist + '\n', 'utf8')
renameSync(tmp, join(ROOT, '.presentation-dist'))
console.log(`[build-presentation] собрано в ${dist}; метка .presentation-dist → ${dist}`)
