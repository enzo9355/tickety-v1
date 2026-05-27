import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://tixcraft.com/ticket/area/26_mltr/21567", wait_until="networkidle")
        content = await page.content()
        with open("tixcraft_content.html", "w", encoding="utf-8") as f:
            f.write(content)
        await browser.close()

asyncio.run(main())
