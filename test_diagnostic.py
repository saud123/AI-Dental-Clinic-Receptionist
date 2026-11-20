import subprocess
import sys
import requests

print("\n--- 🔍 AI VOICE DIAGNOSTIC START ---\n")

# 1. Check FFmpeg (Sabse bada culprit)
try:
    result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
    if result.returncode == 0:
        print("✅ 1. FFmpeg is INSTALLED. (Audio conversion will work)")
    else:
        print("❌ 1. FFmpeg returned an error.")
except FileNotFoundError:
    print("❌ 1. FFmpeg is NOT INSTALLED. Voice will fail! (Windows issue)")

# 2. Check Python Libraries
try:
    import speech_recognition as sr
    print("✅ 2. SpeechRecognition library is installed.")
except ImportError:
    print("❌ 2. SpeechRecognition is MISSING. (Run: pip install SpeechRecognition)")

try:
    from gtts import gTTS
    print("✅ 3. gTTS library is installed.")
except ImportError:
    print("❌ 3. gTTS is MISSING. (Run: pip install gTTS)")

# 3. Check Backend Server
try:
    res = requests.get("http://localhost:8000/health", timeout=3)
    if res.status_code == 200:
        print(f"✅ 4. Backend Server is UP and RUNNING: {res.json()}")
    else:
        print(f"⚠️ 4. Backend responded, but status is: {res.status_code}")
except Exception as e:
    print(f"❌ 4. Backend Server is DOWN. Error: {e}")

print("\n--- 🏁 DIAGNOSTIC END ---\n")