import sys
import json
import re
from rapidfuzz import fuzz

def normalize(s):
    # Ignore symbols/punctuation and capitalization for matching
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def main():
    try:
        user_answer = sys.argv[1]
        correct_answer = sys.argv[2]

        # Calculate ratio, ignoring punctuation and case
        ratio = fuzz.ratio(normalize(user_answer), normalize(correct_answer))

        print(json.dumps({"ratio": ratio}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
