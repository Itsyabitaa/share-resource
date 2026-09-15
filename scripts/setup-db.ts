import { config } from 'dotenv'
import { spawn } from 'child_process'

config({ path: '.env.local' })

const child = spawn(process.execPath, ['scripts/db-setup.js'], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code || 0))
