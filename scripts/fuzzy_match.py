import sys
import json
from rapidfuzz import fuzz

def main():
    try:
        user_answer = sys.argv[1]
        correct_answer = sys.argv[2]
        
        # Calculate ratio
        ratio = fuzz.ratio(user_answer.lower(), correct_answer.lower())
        
        print(json.dumps({"ratio": ratio}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
