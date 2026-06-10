from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl, EmailStr, Field
from typing import Optional, List
import secrets
import uuid
import os
import re
import math
import random
import httpx
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

import database
import email_service

# curl-cffi: impersonates Chrome TLS fingerprint → bypasses Cloudflare JS challenges
# Falls back to httpx if not installed (non-tixcraft platforms still work fine)
try:
    from curl_cffi.requests import AsyncSession as CurlSession
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False
    print("[Warning] curl-cffi not installed — tixcraft Cloudflare bypass disabled")

scheduler = AsyncIOScheduler()
task_error_counts = {}
notifications_cache = []

# In-memory task log: task_id → [{time, level, message}]
task_logs: dict = {}

MAX_CONCURRENT_TASKS = 5


def log_task(task_id: int, message: str, level: str = "info"):
    """Append a log entry for a task (keeps last 30 entries)."""
    now = datetime.now().strftime("%H:%M:%S")
    entry = {"time": now, "level": level, "message": message}
    if task_id not in task_logs:
        task_logs[task_id] = []
    task_logs[task_id].append(entry)
    task_logs[task_id] = task_logs[task_id][-30:]
    print(f"[Task {task_id}] {message}")


def is_cf_challenge(html: str) -> bool:
    """Detect Cloudflare JS/managed challenge pages (HTTP 200 but not real content)."""
    snippet = html[:6000].lower()
    hits = sum(1 for kw in [
        "cf-browser-verification", "challenge-form", "just a moment",
        "checking your browser", "cf_clearance", "turnstile",
        "please wait while", "enable javascript",
    ] if kw in snippet)
    return hits >= 2


async def fetch_page(url: str, platform: str, headers: dict) -> tuple[int, str]:
    """
    Fetch a ticket page and return (status_code, html).

    tixcraft uses curl-cffi to impersonate Chrome's TLS/HTTP2 fingerprint,
    which bypasses Cloudflare's bot detection without a real browser.
    All other platforms use httpx.
    """
    if platform == "tixcraft" and HAS_CURL_CFFI:
        async with CurlSession(impersonate="chrome124") as session:
            r = await session.get(url, headers=headers, timeout=15, allow_redirects=True)
            return r.status_code, r.text
    else:
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=15) as client:
            r = await client.get(url)
            return r.status_code, r.text

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
}

# ─────────────────────────────────────────────────────────────
# Safe polling delays (per-platform, seconds)
#   tixcraft/Ticketmaster: Cloudflare → conservative 5–10 min
#   KKTIX:                 moderate   → 3–6 min
#   ibon / 年代 / 寬宏:     lighter    → 4–8 min
#   generic / unknown:     conservative 5–10 min
# ─────────────────────────────────────────────────────────────
PLATFORM_DELAYS: dict[str, tuple[int, int]] = {
    "tixcraft":     (300, 600),
    "kktix":        (180, 360),
    "ibon":         (240, 480),
    "niandai":      (240, 480),
    "kham":         (240, 480),
    "books":        (240, 480),
    "ticketmaster": (300, 600),
    "generic":      (300, 600),
}

# Exponential backoff steps after consecutive 403/429 (seconds)
# streak 1 → 5 min, 2 → 20 min, 3 → 1 h, 4+ → 2 h
BACKOFF_STEPS = [300, 1200, 3600, 7200]

# Site-specific Referer headers (makes requests look like in-site navigation)
PLATFORM_REFERERS: dict[str, str] = {
    "tixcraft":     "https://tixcraft.com/",
    "kktix":        "https://kktix.com/",
    "ibon":         "https://www.ibon.com.tw/",
    "niandai":      "https://www.ticket.com.tw/",
    "kham":         "https://www.kham.com.tw/",
    "books":        "https://tickets.books.com.tw/",
    "ticketmaster": "https://www.ticketmaster.com.tw/",
}


def get_poll_delay(platform: str, error_streak: int = 0) -> int:
    """
    Return a jittered polling delay (seconds) for the given platform.
    error_streak > 0 triggers exponential backoff.
    """
    if error_streak > 0:
        base = BACKOFF_STEPS[min(error_streak - 1, len(BACKOFF_STEPS) - 1)]
        jitter = random.randint(0, base // 4)   # ±25 % scatter
        return base + jitter

    lo, hi = PLATFORM_DELAYS.get(platform, PLATFORM_DELAYS["generic"])
    return random.randint(lo, hi)


def build_request_headers(platform: str) -> dict:
    """Merge base HEADERS with a platform-appropriate Referer."""
    headers = dict(HEADERS)
    if platform in PLATFORM_REFERERS:
        headers["Referer"] = PLATFORM_REFERERS[platform]
    return headers


def cache_bust_url(url: str, platform: str) -> str:
    """
    Append a timestamp query param for tixcraft to bypass CDN caches
    and reduce the chance of repeated identical requests being fingerprinted.
    """
    if platform == "tixcraft":
        sep = "&" if "?" in url else "?"
        return f"{url}{sep}_cb={int(datetime.now().timestamp())}"
    return url


# ─────────────────────────────────────────────────────────────
# Feature 3: Multi-platform detection
# ─────────────────────────────────────────────────────────────

PLATFORM_PATTERNS = {
    "tixcraft": ["tixcraft.com"],
    "kktix":    ["kktix.com"],
    "ibon":     ["ibon.com.tw", "ticket.ibon.com.tw"],
    "niandai":  ["ticket.com.tw", "www.ticket.com.tw"],
    "kham":     ["kham.com.tw", "www.kham.com.tw"],
    "books":    ["tickets.books.com.tw"],
    "ticketmaster": ["ticketmaster.com.tw"],
}


def detect_platform(url: str) -> str:
    lower = url.lower()
    for platform, domains in PLATFORM_PATTERNS.items():
        if any(d in lower for d in domains):
            return platform
    return "generic"


def parse_tickets(platform: str, soup: BeautifulSoup, plain_text: str, raw_html: str) -> list:
    """
    Returns a list of dicts: [{zone, price, remaining}]
    Empty list means no tickets found.
    """
    found = []

    # ── tixcraft ──────────────────────────────────────────────
    if platform == "tixcraft":
        # tixcraft renders each ticket zone as <a> inside a .zone container.
        # The link text contains the area name plus a status/remaining hint.
        # Sold-out zones typically contain "選購一空" / "Sold out" / "已售完".
        zone_container = soup.select_one(".zone")
        zone_links = zone_container.select("a") if zone_container else soup.select(".zone a")

        SOLD_OUT_KW = ["選購一空", "已售完", "售完", "Sold out", "sold out", "額滿", "完售"]

        for link in zone_links:
            text = link.get_text(separator=" ", strip=True)
            if not text:
                continue

            # Skip sold-out zones
            if any(kw in text for kw in SOLD_OUT_KW):
                continue

            # Try to extract a remaining count if present (e.g. "剩餘 12", "12 seat(s)")
            remaining = None
            m = re.search(r'剩餘\s*(\d+)', text)
            if not m:
                m = re.search(r'(\d+)\s*seat', text)
            if m:
                remaining = int(m.group(1))

            # Try to extract a price (e.g. "NT$3200", "3,200")
            price = 0
            pm = re.search(r'(?:NT\$|\$)?\s*([\d,]{3,})', text)
            if pm:
                try:
                    price = int(pm.group(1).replace(",", ""))
                except ValueError:
                    price = 0

            # The zone name is the text with price/remaining hints stripped
            zone_name = re.sub(r'(剩餘\s*\d+|\d+\s*seat\(s\)?|NT\$[\d,]+|【.*?】)', '', text).strip()
            zone_name = zone_name[:40] if zone_name else "未命名區域"

            found.append({
                "zone": zone_name,
                "price": price,
                "remaining": remaining if remaining is not None else 1,
            })

        # Fallback: if .zone parsing found nothing, use the old text patterns
        if not found:
            for seats in re.findall(r'(\d+)\s*seat\(s\)\s*remaining', plain_text):
                found.append({"zone": "", "price": 0, "remaining": int(seats)})
        if not found:
            for seats in re.findall(r'剩餘\s*(\d+)', plain_text):
                found.append({"zone": "", "price": 0, "remaining": int(seats)})
        if not found and plain_text.count("Available") > 0 and "Sold out" in plain_text:
            found.append({"zone": "多區域", "price": 0, "remaining": plain_text.count("Available")})

    # ── KKTIX ─────────────────────────────────────────────────
    elif platform == "kktix":
        for inv in re.findall(r'"inventory"\s*:\s*(\d+)', raw_html):
            total = int(inv)
            if total > 0:
                found.append({"zone": "KKTIX", "price": 0, "remaining": total})
        # Deduplicate / sum
        if found:
            total = sum(f["remaining"] for f in found)
            found = [{"zone": "KKTIX", "price": 0, "remaining": total}]

    # ── ibon ──────────────────────────────────────────────────
    elif platform == "ibon":
        # ibon shows quantity select or "售完"
        qty_matches = re.findall(r'<select[^>]*>\s*(?:<option[^>]*>(\d+)</option>\s*)+', raw_html)
        if qty_matches:
            found.append({"zone": "ibon", "price": 0, "remaining": int(qty_matches[0])})
        elif "加入購物車" in plain_text and "售完" not in plain_text:
            found.append({"zone": "ibon", "price": 0, "remaining": 1})
        # Look for "尚有" keyword
        for n in re.findall(r'尚有\s*(\d+)\s*張', plain_text):
            found.append({"zone": "ibon", "price": 0, "remaining": int(n)})

    # ── 年代 ticket.com.tw ─────────────────────────────────────
    elif platform == "niandai":
        if "立即購票" in plain_text and "缺貨" not in plain_text and "售完" not in plain_text:
            found.append({"zone": "年代", "price": 0, "remaining": 1})
        for seats in re.findall(r'剩餘\s*(\d+)', plain_text):
            found.append({"zone": "年代", "price": 0, "remaining": int(seats)})

    # ── 寬宏 kham.com.tw ──────────────────────────────────────
    elif platform == "kham":
        if ("立即訂購" in plain_text or "加入購物車" in plain_text) \
                and "售完" not in plain_text and "已售完" not in plain_text:
            found.append({"zone": "寬宏", "price": 0, "remaining": 1})
        for seats in re.findall(r'剩餘\s*(\d+)', plain_text):
            found.append({"zone": "寬宏", "price": 0, "remaining": int(seats)})

    # ── 博客來 books.com.tw ────────────────────────────────────
    elif platform == "books":
        if "立即購票" in plain_text and "票已售完" not in plain_text:
            found.append({"zone": "博客來", "price": 0, "remaining": 1})

    # ── Ticketmaster ──────────────────────────────────────────
    elif platform == "ticketmaster":
        if plain_text.count("Available") > 0:
            found.append({"zone": "TM", "price": 0, "remaining": plain_text.count("Available")})

    # ── Generic fallback ──────────────────────────────────────
    else:
        for kw in ["立即購票", "加入購物車", "選擇座位", "Buy Now", "熱賣中", "立即訂購", "選購"]:
            if kw in plain_text:
                found.append({"zone": "", "price": 0, "remaining": 1})
                break

    return found


# ─────────────────────────────────────────────────────────────
# Feature 2: Price filter helper
# ─────────────────────────────────────────────────────────────

def price_in_range(price: Optional[float], min_p: Optional[int], max_p: Optional[int]) -> bool:
    """Returns True if price is within [min_p, max_p]. Passes if price is unknown (0)."""
    if price is None or price == 0:
        return True  # No price info — don't block the alert
    if min_p is not None and price < min_p:
        return False
    if max_p is not None and price > max_p:
        return False
    return True


# ─────────────────────────────────────────────────────────────
# Feature 5: Time window helper
# ─────────────────────────────────────────────────────────────

def seconds_until_window(start_h: int, end_h: int) -> int:
    """Return seconds until `start_h` if we are currently outside [start_h, end_h]."""
    now = datetime.now()
    h = now.hour
    # Handle wrap-around (e.g. 22-02)
    if start_h <= end_h:
        in_window = start_h <= h <= end_h
    else:
        in_window = h >= start_h or h <= end_h

    if in_window:
        return 0

    # Compute next start_h
    target = now.replace(hour=start_h, minute=0, second=random.randint(0, 120), microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return int((target - now).total_seconds())


# ─────────────────────────────────────────────────────────────
# Main ticket checker
# ─────────────────────────────────────────────────────────────

async def check_ticket_status(task_id: int, url: str, to_email: str):
    """Poll a ticket page and notify if tickets are found."""
    db = database.SessionLocal()
    try:
        db_task = db.query(database.Task).filter(database.Task.id == task_id).first()
        if not db_task or db_task.status != "監控中":
            return

        # Feature 5: check time window
        if db_task.monitor_start is not None and db_task.monitor_end is not None:
            wait = seconds_until_window(db_task.monitor_start, db_task.monitor_end)
            if wait > 0:
                print(f"[Task {task_id}] 時段外，{wait}s 後重啟。")
                scheduler.add_job(
                    check_ticket_status, "date",
                    run_date=datetime.now() + timedelta(seconds=wait),
                    args=[task_id, url, to_email],
                    id=f"task_{task_id}", replace_existing=True
                )
                return

        min_price = db_task.min_price
        max_price = db_task.max_price
    finally:
        db.close()

    try:
        ticket_found = False
        found_tickets_data = []

        platform = detect_platform(url)
        log_task(task_id, f"開始輪詢 ({platform}) …")

        req_headers = build_request_headers(platform)
        fetch_url   = cache_bust_url(url, platform)

        status_code, html = await fetch_page(fetch_url, platform, req_headers)

        if status_code in (403, 429):
            task_error_counts[task_id] = task_error_counts.get(task_id, 0) + 1
            streak = task_error_counts[task_id]
            delay  = get_poll_delay(platform, error_streak=streak)
            log_task(task_id, f"HTTP {status_code} 封鎖（第 {streak} 次），{delay}s 後重試", "warn")
            scheduler.add_job(
                check_ticket_status, "date",
                run_date=datetime.now() + timedelta(seconds=delay),
                args=[task_id, url, to_email],
                id=f"task_{task_id}", replace_existing=True
            )
            return

        if is_cf_challenge(html):
            task_error_counts[task_id] = task_error_counts.get(task_id, 0) + 1
            streak = task_error_counts[task_id]
            delay  = get_poll_delay(platform, error_streak=streak)
            log_task(task_id, f"遭到 Cloudflare 挑戰（第 {streak} 次），{delay}s 後重試", "warn")
            scheduler.add_job(
                check_ticket_status, "date",
                run_date=datetime.now() + timedelta(seconds=delay),
                args=[task_id, url, to_email],
                id=f"task_{task_id}", replace_existing=True
            )
            return

        soup = BeautifulSoup(html, "html.parser")
        title = soup.title.string.strip() if soup.title and soup.title.string else "未知活動"
        plain_text = soup.get_text(separator=" ")

        # Feature 3: platform-specific parsing
        raw_candidates = parse_tickets(platform, soup, plain_text, html)

        # Feature 2: price filter
        for td in raw_candidates:
            if price_in_range(td.get("price"), min_price, max_price):
                found_tickets_data.append(td)

        ticket_found = len(found_tickets_data) > 0

        if not ticket_found:
            log_task(task_id, f"未偵測到符合條件的票券（掃描 {len(plain_text)} 字元）")

        if ticket_found:
            summary = "、".join(
                f"{td.get('zone') or '未知區'} 剩餘 {td.get('remaining', '?')}"
                for td in found_tickets_data
            )
            log_task(task_id, f"🎫 偵測到票券！{summary}", "success")

            # Feature 6: notify shared watchers too
            db = database.SessionLocal()
            try:
                # Get owner's session_token for auto-login link in email
                owner = db.query(database.User).filter(database.User.email == to_email).first()
                owner_token = owner.session_token if owner else None
                email_service.send_ticket_alert(to_email, url, owner_token, zones=found_tickets_data)

                sharings = db.query(database.TaskSharing).filter(
                    database.TaskSharing.task_id == task_id
                ).all()
                for s in sharings:
                    if s.email != to_email:
                        watcher = db.query(database.User).filter(database.User.email == s.email).first()
                        watcher_token = watcher.session_token if watcher else None
                        email_service.send_ticket_alert(s.email, url, watcher_token, zones=found_tickets_data)
                        print(f"[Task {task_id}] 共享通知 → {s.email}")
            finally:
                db.close()

            now = datetime.now()
            db = database.SessionLocal()
            try:
                for td in found_tickets_data:
                    z = td.get("zone", "")
                    p = td.get("price", 0)
                    r = td.get("remaining", 1)
                    raw = f"{z} 剩餘 {r}" if z else f"偵測到 {r} 張可購票券"
                    db.add(database.TicketRecord(
                        task_id=task_id, zone=z or None,
                        price=p, remaining=r,
                        raw_text=raw, detected_at=now
                    ))
                db_task = db.query(database.Task).filter(database.Task.id == task_id).first()
                if db_task:
                    db_task.status = "已通知"
                db.commit()
            finally:
                db.close()

            notifications_cache.append({
                "id": f"notif_{task_id}_{int(datetime.now().timestamp())}",
                "task_id": task_id, "title": title,
                "time": "請至購票網頁查看", "url": url,
                "timestamp": datetime.now().isoformat()
            })
            task_error_counts.pop(task_id, None)
            return

        # Not found — reschedule with platform-safe delay
        task_error_counts[task_id] = 0
        delay = get_poll_delay(platform)
        log_task(task_id, f"未偵測到票券 ({platform})，{delay}s 後再檢查")
        print(f"[Task {task_id}] 未偵測到票券 ({platform})，{delay}s 後再檢查。")
        scheduler.add_job(
            check_ticket_status, "date",
            run_date=datetime.now() + timedelta(seconds=delay),
            args=[task_id, url, to_email],
            id=f"task_{task_id}", replace_existing=True
        )

    except Exception as e:
        log_task(task_id, f"例外錯誤：{e}", "error")
        platform_fallback = detect_platform(url)
        scheduler.add_job(
            check_ticket_status, "date",
            run_date=datetime.now() + timedelta(seconds=get_poll_delay(platform_fallback, error_streak=1)),
            args=[task_id, url, to_email],
            id=f"task_{task_id}", replace_existing=True
        )


# ─────────────────────────────────────────────────────────────
# Venue auto-detection
# ─────────────────────────────────────────────────────────────

KNOWN_VENUES = [
    "高雄巨蛋", "台北小巨蛋", "台北大巨蛋", "台北流行音樂中心",
    "高雄流行音樂中心", "高雄世運主場館", "台北國際會議中心",
    "新北工商展覽中心", "桃園會展中心", "台中洲際棒球場",
    "台北體育館", "台北田徑場", "台北市立體育館", "台北小巨蛋",
    "花博公園", "南港展覽館", "台北世貿", "高雄展覽館",
    "國立體育大學", "台中洲際", "嘉義棒球場", "澄清湖棒球場",
]

async def detect_venue_from_url(url: str) -> str:
    """
    Fetch the ticket page and extract the venue name.
    Uses curl-cffi for tixcraft to bypass Cloudflare.
    Falls back to page title keyword search if not found.
    """
    fallback = "活動場館"
    platform = detect_platform(url)
    try:
        headers = build_request_headers(platform)
        status_code, html = await fetch_page(url, platform, headers)

        if status_code != 200 or is_cf_challenge(html):
            return fallback

        soup = BeautifulSoup(html, "html.parser")

        # 1. Check full page text for known venue names
        page_text = soup.get_text(separator=" ")
        for v in KNOWN_VENUES:
            if v in page_text:
                return v

        # 2. Try to extract from <title> tag
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
            for v in KNOWN_VENUES:
                if v in title:
                    return v
            # Return cleaned title as fallback if it looks meaningful
            title_clean = title.replace("| tixcraft", "").replace("| KKTIX", "").strip()
            if title_clean and title_clean not in ("", "Loading..."):
                # Truncate to 20 chars as a short venue-like label
                return title_clean[:30]

        return fallback
    except Exception:
        return fallback


# ─────────────────────────────────────────────────────────────
# Feature 8: preference extraction
# ─────────────────────────────────────────────────────────────

KNOWN_ARTISTS = [
    "ITZY", "NMIXX", "CNBLUE", "韋禮安", "五月天", "周杰倫", "林俊傑",
    "蔡依林", "張惠妹", "陳奕迅", "BLACKPINK", "BTS", "NewJeans",
    "aespa", "IVE", "TWICE", "EXO", "GOT7", "Stray Kids",
]

def extract_preferences(url: str, title: str) -> dict:
    combined = (url + " " + title).upper()
    artist = next((a for a in KNOWN_ARTISTS if a.upper() in combined), None)
    venue = next(
        (v for v in [
            "高雄巨蛋", "台北小巨蛋", "台北大巨蛋", "台北流行音樂中心",
            "高雄流行音樂中心", "台中洲際棒球場",
        ] if v in combined), None
    )
    return {"artist": artist, "venue": venue}


def upsert_preference(db: Session, user_id: int, artist: Optional[str], venue: Optional[str]):
    if not artist and not venue:
        return
    pref = db.query(database.UserPreference).filter(
        database.UserPreference.user_id == user_id,
        database.UserPreference.artist == artist,
        database.UserPreference.venue == venue,
    ).first()
    if pref:
        pref.track_count += 1
        pref.last_updated = datetime.utcnow()
    else:
        db.add(database.UserPreference(
            user_id=user_id, artist=artist, venue=venue,
            track_count=1, last_updated=datetime.utcnow()
        ))
    db.commit()


# ─────────────────────────────────────────────────────────────
# App lifecycle
# ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting APScheduler...")
    scheduler.start()
    db = database.SessionLocal()
    try:
        active = db.query(database.Task).filter(database.Task.status == "監控中").all()
        for i, t in enumerate(active):
            # Stagger resumption across tasks: spread them out using each platform's
            # normal delay, so all tasks don't hammer the same site simultaneously.
            p = detect_platform(t.url)
            lo, hi = PLATFORM_DELAYS.get(p, PLATFORM_DELAYS["generic"])
            # Add a per-task offset so tasks on the same platform don't pile up
            startup_offset = random.randint(30, 120) + i * 15
            delay = min(random.randint(lo, hi), startup_offset * 2)
            scheduler.add_job(
                check_ticket_status, "date",
                run_date=datetime.now() + timedelta(seconds=delay),
                args=[t.id, t.url, t.email],
                id=f"task_{t.id}", replace_existing=True
            )
        print(f"Resumed {len(active)} active tasks.")
    finally:
        db.close()
    yield
    print("Shutting down APScheduler...")
    scheduler.shutdown()


app = FastAPI(title="Tickety Backend API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    url: HttpUrl
    email: EmailStr
    venue: Optional[str] = None
    departure: Optional[str] = None
    budget: Optional[int] = Field(None, ge=0)
    needsAccommodation: bool = False
    # Feature 2
    minPrice: Optional[int] = Field(None, ge=0)
    maxPrice: Optional[int] = Field(None, ge=0)
    # Feature 5
    monitorStart: Optional[int] = Field(None, ge=0, le=23)
    monitorEnd: Optional[int] = Field(None, ge=0, le=23)


class ShareRequest(BaseModel):
    email: EmailStr


FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://tickety-v1.vercel.app")


async def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[database.User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    return db.query(database.User).filter(database.User.session_token == token).first()


# ─────────────────────────────────────────────────────────────
# Auth routes
# ─────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
async def auth_login(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    email = body.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    user = db.query(database.User).filter(database.User.email == email).first()
    if not user:
        user = database.User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    magic_token = str(uuid.uuid4())
    user.magic_token = magic_token
    user.magic_token_expires = datetime.now() + timedelta(minutes=15)
    db.commit()
    verify_url = f"{FRONTEND_URL}/?token={magic_token}"
    email_service.send_magic_link(email, verify_url)
    return {"message": "登入連結已發送至您的信箱"}


@app.get("/api/auth/verify")
async def auth_verify(token: str, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.magic_token == token).first()
    if not user or not user.magic_token_expires or user.magic_token_expires < datetime.now():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    session_token = secrets.token_urlsafe(32)
    user.session_token = session_token
    user.magic_token = None
    user.magic_token_expires = None
    user.last_login = datetime.now()
    db.commit()
    return {"session_token": session_token, "email": user.email}


@app.get("/api/auth/me")
async def auth_me(request: Request, db: Session = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"email": user.email, "id": user.id}


# ─────────────────────────────────────────────────────────────
# Task routes
# ─────────────────────────────────────────────────────────────

@app.get("/api/tasks")
async def list_tasks(request: Request, email: Optional[str] = None, db: Session = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    if user:
        tasks = db.query(database.Task).filter(database.Task.user_id == user.id).order_by(database.Task.created_at.desc()).all()
    elif email:
        tasks = db.query(database.Task).filter(database.Task.email == email).order_by(database.Task.created_at.desc()).all()
    else:
        return []
    return [_task_to_dict(t) for t in tasks]


def _task_to_dict(t: database.Task) -> dict:
    return {
        "id": t.id,
        "url": t.url,
        "email": t.email,
        "status": t.status,
        "createdAt": t.created_at.isoformat() + "Z" if t.created_at else None,
        "venue": t.venue or "活動場館",
        "needsAccommodation": t.needs_accommodation or False,
        "minPrice": t.min_price,
        "maxPrice": t.max_price,
        "monitorStart": t.monitor_start,
        "monitorEnd": t.monitor_end,
    }


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(database.Task).filter(database.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        scheduler.remove_job(f"task_{task_id}")
    except Exception:
        pass
    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted"}


# ─────────────────────────────────────────────────────────────
# Feature 6: Task sharing routes
# ─────────────────────────────────────────────────────────────

@app.get("/api/tasks/{task_id}/shares")
async def list_shares(task_id: int, db: Session = Depends(get_db)):
    shares = db.query(database.TaskSharing).filter(database.TaskSharing.task_id == task_id).all()
    return [{"id": s.id, "email": s.email, "invited_at": s.invited_at.isoformat()} for s in shares]


@app.post("/api/tasks/{task_id}/shares")
async def add_share(task_id: int, body: ShareRequest, db: Session = Depends(get_db)):
    db_task = db.query(database.Task).filter(database.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    existing = db.query(database.TaskSharing).filter(
        database.TaskSharing.task_id == task_id,
        database.TaskSharing.email == body.email
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already shared")
    db.add(database.TaskSharing(task_id=task_id, email=body.email))
    db.commit()
    return {"message": f"{body.email} 已加入共同監控"}


@app.delete("/api/tasks/{task_id}/shares/{email}")
async def remove_share(task_id: int, email: str, db: Session = Depends(get_db)):
    share = db.query(database.TaskSharing).filter(
        database.TaskSharing.task_id == task_id,
        database.TaskSharing.email == email
    ).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    db.delete(share)
    db.commit()
    return {"message": "已移除"}


# ─────────────────────────────────────────────────────────────
# Notifications & health
# ─────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/notifications")
def get_notifications():
    return notifications_cache[-20:]


@app.get("/api/tasks/{task_id}/logs")
def get_task_logs(task_id: int):
    """Return real-time backend poll log for a task (in-memory, resets on restart)."""
    return task_logs.get(task_id, [])


@app.get("/api/tasks/{task_id}/ticket-records")
def get_ticket_records(task_id: int, db: Session = Depends(get_db)):
    records = db.query(database.TicketRecord).filter(
        database.TicketRecord.task_id == task_id
    ).order_by(database.TicketRecord.detected_at.desc()).limit(50).all()
    return [{
        "id": r.id, "task_id": r.task_id,
        "zone": r.zone, "price": r.price, "remaining": r.remaining,
        "raw_text": r.raw_text,
        "detected_at": r.detected_at.isoformat() if r.detected_at else None
    } for r in records]


# ─────────────────────────────────────────────────────────────
# Geo / Maps
# ─────────────────────────────────────────────────────────────

@app.get("/api/reverse-geocode")
def reverse_geocode(lat: float, lng: float):
    import requests
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Google Maps API Key not configured")
    url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={api_key}&language=zh-TW"
    try:
        res = requests.get(url, timeout=5)
        data = res.json()
        if data.get("status") == "OK" and data.get("results"):
            return {"address": data["results"][0]["formatted_address"]}
        raise HTTPException(status_code=400, detail="無法解析該座標的地址")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────
# Feature 8: Concerts + Personalization
# ─────────────────────────────────────────────────────────────

ALL_CONCERTS = [
    {"title": "ITZY 2ND WORLD TOUR <BORN TO BE> in TAIPEI", "venue": "台北小巨蛋",
     "date": "2026/07/20", "url": "https://tixcraft.com/activity/detail/24_itzy",
     "imageUrl": "https://images.unsplash.com/photo-1540039155732-d6824b2f155c?w=600&q=80",
     "artists": ["ITZY"]},
    {"title": "韋禮安「如果可以，我想和你明天再見」演唱會", "venue": "台北小巨蛋",
     "date": "2026/05/30", "url": "https://ticket.ibon.com.tw/",
     "imageUrl": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&q=80",
     "artists": ["韋禮安"]},
    {"title": "NMIXX THE 1ST FAN CONCERT", "venue": "高雄巨蛋",
     "date": "2026/07/11", "url": "https://tixcraft.com",
     "imageUrl": "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80",
     "artists": ["NMIXX"]},
    {"title": "CNBLUE LIVE 'CNBLUENTITY' IN KAOHSIUNG", "venue": "高雄流行音樂中心",
     "date": "2026/06/13", "url": "https://ticket.com.tw",
     "imageUrl": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80",
     "artists": ["CNBLUE"]},
    {"title": "五月天諾亞方舟世界巡迴演唱會 台北場", "venue": "台北大巨蛋",
     "date": "2026/08/15", "url": "https://kktix.com",
     "imageUrl": "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80",
     "artists": ["五月天"]},
    {"title": "NewJeans 1ST WORLD TOUR TAIPEI", "venue": "台北流行音樂中心",
     "date": "2026/09/06", "url": "https://tixcraft.com",
     "imageUrl": "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=600&q=80",
     "artists": ["NewJeans"]},
]


@app.get("/api/concerts")
async def get_concerts():
    today = datetime.now().strftime("%Y/%m/%d")
    return [c for c in ALL_CONCERTS if c["date"] >= today]


@app.get("/api/concerts/recommended")
async def get_concerts_recommended(request: Request, db: Session = Depends(get_db)):
    """Feature 8: return concerts personalized to the user's tracked artists/venues."""
    user = await get_current_user_optional(request, db)
    today = datetime.now().strftime("%Y/%m/%d")
    upcoming = [c for c in ALL_CONCERTS if c["date"] >= today]

    if not user:
        return {"concerts": upcoming, "personalized": False}

    prefs = db.query(database.UserPreference).filter(
        database.UserPreference.user_id == user.id
    ).order_by(database.UserPreference.track_count.desc()).all()

    if not prefs:
        return {"concerts": upcoming, "personalized": False}

    pref_artists = {p.artist.upper() for p in prefs if p.artist}
    pref_venues = {p.venue for p in prefs if p.venue}

    def score(c):
        s = 0
        if any(a.upper() in " ".join(c.get("artists", [])).upper() for a in pref_artists):
            s += 10
        if c.get("venue") in pref_venues:
            s += 5
        return s

    scored = sorted(upcoming, key=score, reverse=True)
    return {"concerts": scored, "personalized": True, "based_on": [p.artist or p.venue for p in prefs[:3]]}


# ─────────────────────────────────────────────────────────────
# POST /tasks — create task (main endpoint)
# ─────────────────────────────────────────────────────────────

@app.post("/tasks")
async def create_task(
    task_data: TaskCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    active_count = db.query(database.Task).filter(database.Task.status == "監控中").count()
    if active_count >= MAX_CONCURRENT_TASKS:
        raise HTTPException(status_code=400, detail="伺服器負載已滿")

    user = await get_current_user_optional(request, db)
    task_email = user.email if user else task_data.email

    # Ensure a User row exists for this email and has a session_token (for auto-login links)
    if not user:
        user = db.query(database.User).filter(database.User.email == task_email).first()
        if not user:
            user = database.User(email=task_email)
            db.add(user)
            db.commit()
            db.refresh(user)
    if not user.session_token:
        user.session_token = secrets.token_urlsafe(32)
        db.commit()

    db_task = database.Task(
        url=str(task_data.url),
        email=task_email,
        departure=task_data.departure,
        budget=task_data.budget,
        needs_accommodation=task_data.needsAccommodation,
        status="監控中",
        min_price=task_data.minPrice,
        max_price=task_data.maxPrice,
        monitor_start=task_data.monitorStart,
        monitor_end=task_data.monitorEnd,
    )
    if user:
        db_task.user_id = user.id
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    background_tasks.add_task(email_service.send_task_created_email, db_task.email, str(db_task.url), user.session_token)

    # Feature 8: save artist/venue preference
    if user:
        prefs = extract_preferences(str(task_data.url), "")
        if prefs["artist"] or prefs["venue"]:
            upsert_preference(db, user.id, prefs["artist"], prefs["venue"])

    task_platform = detect_platform(str(task_data.url))
    # First check uses the platform's normal delay range (not instant,
    # so we don't immediately hammer the site on task creation)
    first_delay = get_poll_delay(task_platform)
    scheduler.add_job(
        check_ticket_status, "date",
        run_date=datetime.now() + timedelta(seconds=first_delay),
        args=[db_task.id, db_task.url, db_task.email],
        id=f"task_{db_task.id}", replace_existing=True
    )
    print(f"[Task {db_task.id}] 建立完成，首次檢查於 {first_delay}s 後，platform={task_platform}。")

    # Venue detection
    if task_data.venue and task_data.venue.strip():
        parsed_venue = task_data.venue.strip()
    else:
        parsed_venue = await detect_venue_from_url(str(task_data.url))

    # Save venue to database
    db_task.venue = parsed_venue
    db.commit()

    # Google Maps — accommodations & transit (unchanged logic)
    def get_accommodations(venue_name):
        import requests
        api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
        if not api_key:
            return []
        try:
            geo = requests.get(
                f"https://maps.googleapis.com/maps/api/geocode/json?address={venue_name}&key={api_key}",
                timeout=5
            ).json()
            if geo.get("status") != "OK" or not geo.get("results"):
                return []
            loc = geo["results"][0]["geometry"]["location"]
            lat, lng = loc["lat"], loc["lng"]
            places = requests.get(
                f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=1000&type=lodging&key={api_key}",
                timeout=5
            ).json()
            if places.get("status") != "OK":
                return []

            def haversine(la1, lo1, la2, lo2):
                R = 6371000
                p1, p2 = math.radians(la1), math.radians(la2)
                dp, dl = math.radians(la2 - la1), math.radians(lo2 - lo1)
                a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
                return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

            hotels = []
            for p in places.get("results", [])[:3]:
                hl = p.get("geometry", {}).get("location", {})
                d = haversine(lat, lng, hl.get("lat", lat), hl.get("lng", lng))
                hotels.append({
                    "id": p.get("place_id"), "name": p.get("name", "Unknown"),
                    "rating": p.get("rating", "N/A"), "reviews": p.get("user_ratings_total", 0),
                    "distance": f"約 {int(d)} 公尺" if d < 1000 else f"約 {d / 1000:.1f} 公里",
                    "price": "依官網為準",
                })
            return hotels
        except Exception as e:
            print(f"Maps API error: {e}")
            return []

    def get_transits(venue_name, departure):
        import requests
        if not departure:
            return []
        api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
        if not api_key:
            return []
        try:
            data = requests.get(
                f"https://maps.googleapis.com/maps/api/directions/json?origin={departure}&destination={venue_name}&mode=transit&language=zh-TW&key={api_key}",
                timeout=5
            ).json()
            if data.get("status") != "OK":
                return []
            leg = data["routes"][0]["legs"][0]
            duration = leg.get("duration", {}).get("text", "未知")
            fare_obj = data["routes"][0].get("fare")
            fare = f"NT$ {fare_obj['value']}" if fare_obj and "value" in fare_obj else "請洽官網"
            steps = []
            for s in leg.get("steps", []):
                info = {
                    "mode": s.get("travel_mode", "UNKNOWN"),
                    "instruction": re.sub(r"<[^>]+>", "", s.get("html_instructions", "")),
                    "duration": s.get("duration", {}).get("text", ""),
                }
                if info["mode"] == "TRANSIT":
                    td = s.get("transit_details", {})
                    ln = td.get("line", {})
                    info["line"] = f"{ln.get('vehicle', {}).get('name', '')} {ln.get('short_name') or ln.get('name', '')}".strip()
                    info["num_stops"] = td.get("num_stops", 0)
                steps.append(info)
            return [{"id": 1, "title": "大眾運輸路線規劃", "description": "查看下方完整轉乘步驟",
                     "duration": duration, "cost": fare, "full_steps": steps}]
        except Exception as e:
            print(f"Directions API error: {e}")
            return []

    accommodations = get_accommodations(parsed_venue) if task_data.needsAccommodation else []
    transits = get_transits(parsed_venue, task_data.departure)

    return {
        **_task_to_dict(db_task),
        "venue": parsed_venue,
        "accommodations": accommodations,
        "transits": transits,
    }
