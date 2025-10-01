# Scraper/scrape.py
import time
import sys
import os
import re
from datetime import datetime, timedelta

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from sqlalchemy.exc import IntegrityError

# make backend importable (one level up from Scraper -> backend/)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db import db            # your SQLAlchemy db
from app import create_app   # app factory
from model.job import Job    # Job model

# ---------- Helpers ----------
def parse_relative_date(text):
    """
    Parse simple 'posted X days ago' or 'X hours ago' strings into a date.
    If parsing fails, return today's date.
    """
    text = (text or "").strip().lower()
    if not text:
        return datetime.utcnow().date()
    # common patterns: "3 days ago", "posted 2 days ago", "2 hours ago"
    m = re.search(r"(\d+)\s+(day|days|hour|hours|week|weeks|month|months)\b", text)
    if m:
        qty = int(m.group(1))
        unit = m.group(2)
        if 'hour' in unit:
            return (datetime.utcnow() - timedelta(hours=qty)).date()
        if 'day' in unit:
            return (datetime.utcnow() - timedelta(days=qty)).date()
        if 'week' in unit:
            return (datetime.utcnow() - timedelta(weeks=qty)).date()
        if 'month' in unit:
            return (datetime.utcnow() - timedelta(days=30*qty)).date()
    # try to parse ISO-like date
    try:
        return datetime.fromisoformat(text.strip()).date()
    except Exception:
        return datetime.utcnow().date()

def safe_text(el):
    try:
        return el.text.strip()
    except Exception:
        return ""

# ---------- Scraper ----------
def scrape_jobs(limit=100, headless=True, delay=2.0):
    """
    Scrape job detail pages from https://www.actuarylist.com/
    limit: maximum number of job detail pages to fetch
    headless: whether to run Chrome headlessly
    delay: seconds to wait after scroll / page load (tweak as necessary)
    """
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_experimental_option("excludeSwitches", ["enable-logging"])

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    wait = WebDriverWait(driver, 20)

    try:
        driver.get("https://www.actuarylist.com/")
        print("Opened https://www.actuarylist.com/")

        # Wait for the main jobs-list container to appear
        try:
            wait.until(EC.presence_of_element_located((By.ID, "jobs-list")))
            print("jobs-list container visible")
        except TimeoutException:
            print("Could not find #jobs-list container — the page may have changed. Continuing anyway.")

        # Scroll a few times to ensure JS loads many items
        prev_count = 0
        scrolls = 0
        MAX_SCROLLS = 10
        while scrolls < MAX_SCROLLS:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(delay)
            # count anchors that look like job detail pages (pattern '/actuarial-jobs/')
            anchors = driver.find_elements(By.CSS_SELECTOR, "a[href*='/actuarial-jobs/']")
            cur_count = len(anchors)
            print(f"Scroll #{scrolls+1} — found {cur_count} anchors with '/actuarial-jobs/'")
            if cur_count == prev_count:
                # no change -> stop scrolling
                break
            prev_count = cur_count
            scrolls += 1

        # collect unique job detail links in order
        anchors = driver.find_elements(By.CSS_SELECTOR, "a[href*='/actuarial-jobs/']")
        links = []
        seen = set()
        for a in anchors:
            href = a.get_attribute("href")
            if not href:
                continue
            # normalize: remove URL fragment/query; only unique by path
            if href in seen:
                continue
            seen.add(href)
            links.append(href)
            if len(links) >= limit:
                break

        print(f"Collected {len(links)} job detail links (unique, limited to {limit})")

        # For each link, open and extract fields
        jobs = []
        for idx, link in enumerate(links, start=1):
            print(f"[{idx}/{len(links)}] Opening: {link}")
            try:
                driver.get(link)
                # wait for page main content (many job detail pages have a heading or content area)
                # We'll wait for either an h1 or any element with role 'main'
                try:
                    wait.until(EC.presence_of_element_located((By.XPATH, "//h1 | //main")))
                except TimeoutException:
                    # keep going, try to parse anyway
                    pass

                time.sleep(delay)  # give extra time for content to render

                # --- Extract title ---
                title = ""
                for sel in [
                    "//h1",  # common
                    "//h1[contains(@class,'job') or contains(@class,'title')]",
                    "css:h1.job-title",
                ]:
                    try:
                        if sel.startswith("css:"):
                            el = driver.find_element(By.CSS_SELECTOR, sel.split("css:")[1])
                        else:
                            el = driver.find_element(By.XPATH, sel)
                        title = safe_text(el)
                        if title:
                            break
                    except Exception:
                        title = ""
                # fallback: try to get <title> tag content
                if not title:
                    try:
                        title = driver.title
                    except Exception:
                        title = ""

                # --- Extract company ---
                company = ""
                # Many pages link the company to `/actuarial-employers/` — try that
                try:
                    company_el = driver.find_element(By.CSS_SELECTOR, "a[href*='/actuarial-employers/']")
                    company = safe_text(company_el)
                except Exception:
                    # fallback: element with text style common to company
                    for sel in [
                        "//p[contains(@class,'company')]",
                        "//div[contains(@class,'company')]",
                        "//span[contains(@class,'company')]",
                        "//p[contains(@class,'text-gray-600')]",
                    ]:
                        try:
                            company = safe_text(driver.find_element(By.XPATH, sel))
                            if company:
                                break
                        except Exception:
                            company = ""

                # --- Extract location ---
                location = ""
                # Try some plausible selectors
                for sel in [
                    "//span[contains(@class,'location')]",
                    "//p[contains(@class,'location')]",
                    "//li[contains(@class,'location')]",
                    "//div[contains(@class,'location')]",
                    "//p[contains(text(),'Location')]/following-sibling::*",
                ]:
                    try:
                        el = driver.find_element(By.XPATH, sel)
                        location = safe_text(el)
                        if location:
                            break
                    except Exception:
                        location = ""
                # If still empty try to glean from breadcrumbs or meta
                if not location:
                    try:
                        # sometimes there's a 'meta' or small text showing city/country
                        smalls = driver.find_elements(By.CSS_SELECTOR, "small, .muted, .text-gray-600")
                        for s in smalls:
                            txt = safe_text(s)
                            if "," in txt or txt.lower().strip() in ["remote"]:
                                location = txt
                                break
                    except Exception:
                        pass

                # --- Extract posting date ---
                posting_date = None
                # look for "Posted" text or date-like text
                try:
                    # common patterns: 'Posted X days ago' or 'Posted on YYYY-MM-DD' or a time element
                    possible = driver.find_elements(By.XPATH,
                        "//*[contains(translate(text(),'POSTED','posted'),'posted') or contains(translate(text(),'Posted','posted'),'posted') or contains(@class,'date') or name()='time']")
                    date_text = ""
                    for p in possible:
                        txt = safe_text(p)
                        if not txt:
                            continue
                        ltxt = txt.lower()
                        if "posted" in ltxt or re.search(r'\d{4}-\d{2}-\d{2}', txt) or any(k in ltxt for k in ["ago", "hours", "days", "weeks", "months"]):
                            date_text = txt
                            break
                    if date_text:
                        posting_date = parse_relative_date(date_text)
                except Exception:
                    posting_date = None
                if posting_date is None:
                    posting_date = datetime.utcnow().date()

                # --- Extract tags (keywords) ---
                tags = []
                try:
                    # Try to find tag containers (pill-like spans)
                    tag_els = driver.find_elements(By.XPATH, "//a[contains(@href,'/tags') or contains(@class,'tag') or contains(@class,'pill') or contains(@class,'badge')]/span | //span[contains(@class,'tag') or contains(@class,'badge') or contains(@class,'pill')]")
                    for t in tag_els:
                        txt = safe_text(t)
                        if txt:
                            tags.append(txt)
                except Exception:
                    tags = []

                # dedupe tags
                tags = list(dict.fromkeys([t for t in tags if t]))

                # --- Infer job_type from tags or page content ---
                job_type = ""
                for t in tags:
                    if "intern" in t.lower():
                        job_type = "Internship"
                        break
                    if "part" in t.lower():
                        job_type = "Part-time"
                        break
                    if "contract" in t.lower():
                        job_type = "Contract"
                if not job_type:
                    # try to find explicit mention
                    body_text = ""
                    try:
                        body_text = driver.find_element(By.TAG_NAME, "body").text.lower()
                    except Exception:
                        body_text = ""
                    if "part-time" in body_text:
                        job_type = "Part-time"
                    elif "contract" in body_text:
                        job_type = "Contract"
                    elif "intern" in body_text:
                        job_type = "Internship"
                    else:
                        job_type = "Full-time"

                job = {
                    "title": title,
                    "company": company,
                    "location": location,
                    "posting_date": posting_date,
                    "job_type": job_type,
                    "tags": tags,
                    "link": link,
                }

                print("----")
                print(f"Scraped job #{idx}:")
                print(job)
                jobs.append(job)

            except Exception as e:
                print(f"Error scraping {link}: {e}")
                continue

            # optional: small sleep to be polite to the site
            time.sleep(0.5)

        driver.quit()
        print(f"Done. Collected {len(jobs)} job details.")
        return jobs

    finally:
        try:
            driver.quit()
        except Exception:
            pass

# ---------- Save to DB ----------
def save_jobs_to_db(jobs):
    print("Saving jobs to DB...")
    app = create_app()
    with app.app_context():
        inserted = 0
        skipped = 0
        for j in jobs:
            # simple duplicate check: title + company + location
            existing = Job.query.filter_by(title=j["title"], company=j["company"], location=j["location"]).first()
            if existing:
                print(f"Skipping duplicate: {j['title']} at {j['company']}")
                skipped += 1
                continue
            new_job = Job(
                title=j["title"] or "Untitled",
                company=j["company"] or "Unknown",
                location=j["location"] or "Unknown",
                posting_date=j["posting_date"],
                job_type=j["job_type"] or None,
            )
            # you said earlier your Job model uses comma-separated tags; adapt:
            if hasattr(new_job, "set_tags_from_list"):
                try:
                    new_job.set_tags_from_list(j["tags"])
                except Exception:
                    new_job.tags = ", ".join(j["tags"])
            else:
                new_job.tags = ", ".join(j["tags"])
            db.session.add(new_job)
            inserted += 1
        try:
            db.session.commit()
            print(f"Inserted {inserted}, skipped {skipped}.")
        except IntegrityError as e:
            db.session.rollback()
            print("DB integrity error:", e)
        except Exception as e:
            db.session.rollback()
            print("Unexpected DB error:", e)

# ---------- Run ----------
if __name__ == "__main__":
    LIMIT = 100   # change as needed (50, 100). keep modest for demo.
    scraped = scrape_jobs(limit=LIMIT, headless=False, delay=1.5)  # headless=False helps debugging
    print(f"\nTotal scraped: {len(scraped)}")
    if scraped:
        save_jobs_to_db(scraped)
    print("Finished.")
