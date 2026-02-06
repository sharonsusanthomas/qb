import sys

class Logger:
    # ANSI escape codes for colors
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    END = "\033[0m"

    @staticmethod
    def info(msg):
        print(f"{Logger.BLUE}[INFO] 📝 {msg}{Logger.END}")

    @staticmethod
    def success(msg):
        print(f"{Logger.GREEN}[SUCCESS] ✅ {msg}{Logger.END}")

    @staticmethod
    def process(msg):
        print(f"{Logger.YELLOW}[PROCESS] ⚙️ {msg}{Logger.END}")

    @staticmethod
    def error(msg):
        print(f"{Logger.RED}{Logger.BOLD}[ERROR] ❌ {msg}{Logger.END}")

    @staticmethod
    def ai(msg):
        print(f"{Logger.BOLD}🤖 [AI BRAIN] {msg}{Logger.END}")

# Global layman logger
log = Logger
