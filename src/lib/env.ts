import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const ENV_PATH = '.env'

/**
 * Sets/updates a variable in the .env file (creates it if it doesn't exist).
 * Used to persist the mint address after creation.
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
