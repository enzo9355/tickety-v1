import asyncio
from playwright.async_api import async_playwright
import re

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print("Navigating to tixcraft...")
        await page.goto("https://tixcraft.com/ticket/area/26_mltr/21567", wait_until="networkidle")
        content = await page.content()
        title = await page.title()
        print(f"Title: {title}")
        
        # Test pattern 1
        matches = re.findall(r'([A-Za-z0-9\u4e00-\u9fff]+?區?)\s*(\d{3,5})\s*剩餘\s*(\d+)', content)
        print("Pattern 1 matches:", matches)
        
        # Test pattern 3
        area_remaining = re.findall(r'剩餘\s*(\d+)', content)
        print("Pattern 3 matches:", area_remaining)
        
        # Test keywords
        for kw in ["熱賣中", "剩餘", "立即購票"]:
            if kw in content:
                print(f"Found keyword: {kw}")
                
        await browser.close()

asyncio.run(main())
