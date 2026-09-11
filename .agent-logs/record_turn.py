import os
import sys
from datetime import datetime, timezone

LOG_DIR = "/home/dev/Desktop/higgsifeld/.agent-logs"
LOG_FILE = os.path.join(LOG_DIR, "session-01.md")

def init_log_file():
    os.makedirs(LOG_DIR, exist_ok=True)
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            f.write("# Agent Capture Log — Session 01\n\n")
            f.write("- **Date**: 2026-09-11\n")
            f.write("- **Model Identity**: Gemini 3.6 Flash (High)\n")
            f.write("- **Capture Harness**: Verbatim Prompt & Response Logger\n")
            f.write("- **Canary Test**: `8x-capture-canary-active`\n\n")
            f.write("---\n\n")

def record_turn(user_prompt: str, agent_response: str):
    init_log_file()
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"## Turn [{now_utc}]\n\n")
        f.write("### User Prompt\n")
        f.write("```text\n")
        f.write(user_prompt.strip() + "\n")
        f.write("```\n\n")
        f.write("### Agent Final Response\n")
        f.write("```text\n")
        f.write(agent_response.strip() + "\n")
        f.write("```\n\n")
        f.write("---\n\n")

if __name__ == "__main__":
    init_log_file()
    print(f"Initialized authentic capture log at {LOG_FILE}")
