import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'

const { createOrderApiPlugin } = createRequire(import.meta.url)('./development/order-api.cjs')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), createOrderApiPlugin()],
})
