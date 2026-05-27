import requests
from bs4 import BeautifulSoup

url = "https://kktix.com/events"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8"
}

resp = requests.get(url, headers=headers, timeout=15)
soup = BeautifulSoup(resp.text, 'html.parser')

print(f"Status Code: {resp.status_code}")
events = soup.select('ul.events-list li, ul.ticket-list li, div.event-wrapper, li.event-list-item')
print(f"Events found with primary selectors: {len(events)}")

if not events:
    events = soup.select('a.thumbnail, a[href*="/events/"]')
    print(f"Events found with fallback selectors: {len(events)}")
    
for event in events[:5]:
    if event.name == 'a':
        link = event.get('href', '#')
    else:
        link_elem = event.find('a')
        link = link_elem.get('href', '#') if link_elem else '#'
        
    print(f"Found link: {link}")
