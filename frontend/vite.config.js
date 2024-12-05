import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import {gsharpi} from "gsharpi"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),gsharpi()],
  base: 'https://github.com/mr-gaurishankar-khadga/RealAi/',
})
