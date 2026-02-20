"""
Setup Google Cloud OAuth redirect URI.
Launches Chrome via subprocess with remote debugging, then connects via Selenium.
"""
import time
import sys
import os
import subprocess
import json
import shutil
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

PROJECT_ID = "rasma-app"
CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
REDIRECT_URI = "http://localhost:3000/api/auth/callback/google"
EDIT_URL = f"https://console.cloud.google.com/apis/credentials/oauthclient/{CLIENT_ID}?project={PROJECT_ID}"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEBUG_PORT = 9222

def find_chrome():
    """Find Chrome executable."""
    paths = [
        os.path.expandvars(r"%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None

def main():
    print("=" * 60)
    print("Google Cloud OAuth - Redirect URI Setup")
    print("=" * 60)

    chrome_path = find_chrome()
    if not chrome_path:
        print("ERROR: Chrome not found")
        sys.exit(1)
    print(f"Chrome found: {chrome_path}")

    # Kill existing Chrome
    print("Closing Chrome...")
    subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"],
                   capture_output=True, timeout=10)
    time.sleep(3)

    # Copy user profile to temp location to avoid lock issues
    src_profile = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data")
    tmp_profile = os.path.join(SCRIPT_DIR, ".chrome-profile-copy")

    # Copy only the essential files for auth (cookies, login data)
    if os.path.exists(tmp_profile):
        shutil.rmtree(tmp_profile, ignore_errors=True)
    os.makedirs(os.path.join(tmp_profile, "Default"), exist_ok=True)

    print("Copying Chrome auth data...")
    files_to_copy = [
        "Local State",
    ]
    default_files = [
        "Cookies", "Cookies-journal",
        "Login Data", "Login Data-journal",
        "Web Data", "Web Data-journal",
        "Preferences", "Secure Preferences",
    ]

    for f in files_to_copy:
        src = os.path.join(src_profile, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(tmp_profile, f))

    for f in default_files:
        src = os.path.join(src_profile, "Default", f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(tmp_profile, "Default", f))

    print("Auth data copied.")

    # Start Chrome with remote debugging
    print(f"\nStarting Chrome with remote debugging port {DEBUG_PORT}...")
    chrome_proc = subprocess.Popen([
        chrome_path,
        f"--user-data-dir={tmp_profile}",
        "--profile-directory=Default",
        f"--remote-debugging-port={DEBUG_PORT}",
        "--no-first-run",
        "--no-default-browser-check",
        EDIT_URL
    ])
    time.sleep(8)

    # Connect Selenium to the running Chrome instance
    print("Connecting Selenium to Chrome...")
    chrome_options = Options()
    chrome_options.add_experimental_option("debuggerAddress", f"127.0.0.1:{DEBUG_PORT}")

    try:
        driver = webdriver.Chrome(options=chrome_options)
    except Exception as e:
        print(f"Could not connect to Chrome: {e}")
        chrome_proc.kill()
        sys.exit(1)

    try:
        # Wait for page to load
        print("Waiting for page to load...")
        time.sleep(10)

        current_url = driver.current_url
        print(f"Current URL: {current_url}")

        ss = os.path.join(SCRIPT_DIR, "step1.png")
        driver.save_screenshot(ss)
        print(f"Screenshot: {ss}")

        # Check if logged in
        if "accounts.google.com" in current_url:
            print("\nNot logged in with copied profile.")
            print("This session's cookies didn't transfer properly.")
            print("Keeping browser open - please log in manually, then the script will continue...")
            # Wait for login
            for i in range(60):
                time.sleep(5)
                if "accounts.google.com" not in driver.current_url:
                    print("Login detected!")
                    break
            time.sleep(8)

        # Check if we need to navigate to the edit URL
        if "oauthclient" not in driver.current_url:
            print(f"Navigating to OAuth client edit page...")
            driver.get(EDIT_URL)
            time.sleep(10)

        ss = os.path.join(SCRIPT_DIR, "step2.png")
        driver.save_screenshot(ss)
        print(f"Screenshot: {ss}")

        # Now try to automate the redirect URI addition
        print("\nSearching for page elements...")

        # Scroll down to see all content
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight / 2);")
        time.sleep(2)

        # Find all buttons
        all_buttons = driver.find_elements(By.TAG_NAME, "button")
        print(f"Found {len(all_buttons)} buttons")
        for btn in all_buttons:
            try:
                text = btn.text.strip()
                if text and len(text) < 50:
                    print(f"  Button: '{text}'")
            except Exception:
                pass

        # Look for "ADD URI" type button
        add_clicked = False
        for btn in all_buttons:
            try:
                text = btn.text.strip().upper()
                if any(kw in text for kw in ["ADD URI", "AGREGAR URI", "AÑADIR URI", "ADD REDIRECT"]):
                    print(f"Clicking: '{btn.text.strip()}'")
                    btn.click()
                    time.sleep(2)
                    add_clicked = True
                    break
            except Exception:
                pass

        if not add_clicked:
            # Try finding by other means (mat-icon-button with 'add' icon)
            add_icons = driver.find_elements(By.XPATH,
                "//button[.//mat-icon[text()='add'] or .//i[contains(@class,'add')]]")
            if add_icons:
                # Click the last add icon (likely the redirect URI one)
                add_icons[-1].click()
                add_clicked = True
                time.sleep(2)

        # Find empty input fields for the URI
        all_inputs = driver.find_elements(By.TAG_NAME, "input")
        target = None
        for inp in all_inputs:
            try:
                if inp.is_displayed() and not inp.get_attribute("value"):
                    inp_type = inp.get_attribute("type") or "text"
                    if inp_type in ("text", "url", ""):
                        target = inp
            except Exception:
                pass

        if target:
            print(f"Entering redirect URI...")
            target.click()
            time.sleep(0.5)
            target.send_keys(REDIRECT_URI)
            time.sleep(1)

            ss = os.path.join(SCRIPT_DIR, "step3_filled.png")
            driver.save_screenshot(ss)
            print(f"Screenshot: {ss}")

            # Click Save
            all_buttons = driver.find_elements(By.TAG_NAME, "button")
            for btn in all_buttons:
                try:
                    text = btn.text.strip().upper()
                    if text in ("SAVE", "GUARDAR"):
                        print(f"Clicking Save...")
                        btn.click()
                        time.sleep(5)
                        ss = os.path.join(SCRIPT_DIR, "step4_saved.png")
                        driver.save_screenshot(ss)
                        print(f"Screenshot: {ss}")
                        print("\nSUCCESS!")
                        break
                except Exception:
                    pass
        else:
            print("Could not find input field for redirect URI.")
            print("The browser is open - you can add it manually.")

        # Keep browser open for a bit
        time.sleep(15)

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            driver.quit()
        except Exception:
            pass
        chrome_proc.kill()

    print(f"\nCREDENTIALS:")
    print(f"  GOOGLE_CLIENT_ID={CLIENT_ID}")
    print(f"  GOOGLE_CLIENT_SECRET={os.environ.get('GOOGLE_CLIENT_SECRET', '<set in .env>')}")


if __name__ == "__main__":
    main()
