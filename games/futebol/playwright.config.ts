import {defineConfig} from '@playwright/test';
const port=Number(process.env.FOOTBALL_TEST_PORT??5173);
const url=`http://127.0.0.1:${port}`;
export default defineConfig({testDir:'e2e',workers:1,use:{baseURL:url,headless:true,launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}},reporter:'list',webServer:{command:(process.platform==='win32'?'npm.cmd run dev':'npm run dev')+` -- --port ${port}`,url,reuseExistingServer:false,timeout:30000}});
