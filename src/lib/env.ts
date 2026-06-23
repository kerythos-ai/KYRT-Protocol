import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const ENV_PATH = '.env'

/**
 * Define/atualiza uma variável no arquivo .env (cria se não existir).
 * Usado para persistir o endereço do mint após a criação.
 */
export function appendEnv(key: string, value: string): void {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : ''
  const line = `${key}=${value}`
  const re = new RegExp(`^${key}=.*$`, 'm')
  if (re.test(content)) {
    content = content.replace(re, line)
  } else {
    if (content && !content.endsWith('\n')) content += '\n'
    content += `${line}\n`
  }
  writeFileSync(ENV_PATH, content)
}
