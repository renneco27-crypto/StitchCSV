import sys
import os
import io
import csv
import json
import time
import shutil
import urllib.request
import urllib.error
import subprocess
from typing import List, Dict, Any, Optional

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OPENCODE_SERVER_URL = os.environ.get("OPENCODE_SERVER_URL", "http://127.0.0.1:4096")

CSV_HEADERS = [
    "front", "back", "chapter", "subject", "lesson", "type",
    "mc_correct", "mc_distractor1", "mc_distractor2", "mc_distractor3",
    "tf_answer", "enum_items", "id_answer", "id_variants"
]

IT_STUDENT_PROMPT = """You are an expert College Information Technology (IT) & Computer Science educator and curriculum parser for college campus students.
Your task is to transform raw lecture slides, syllabi, coding handouts, textbooks, or student notes into high-yield, structured flashcard & quiz units for StitchCSV.

Target Domains:
- Computer Networking (OSI 7 Layers, TCP/IP, Subnetting, Protocols, Routing, Switching)
- Data Structures & Algorithms (Arrays, Linked Lists, Trees, Graphs, Sorting, Stacks, Queues, Big-O Complexity)
- Database Management Systems (SQL, ERD, Relational Algebra, Normalization 1NF-3NF, ACID, Indexing, Transactions)
- Operating Systems (Processes, Threads, Scheduling, Deadlocks, Memory Paging, File Systems)
- Web & Mobile Development (HTML5/CSS3, JavaScript, React, Node.js, REST APIs, HTTP Verbs, Security)
- Information Security & Cyber Defense (CIA Triad, Symmetric/Asymmetric Crypto, Hashing, Firewalls, Vulnerabilities)
- Software Engineering & DevOps (SDLC, Agile/Scrum, Git, CI/CD, Design Patterns)

You must output a single JSON array of objects where each item corresponds to a study card.
Each object must have these EXACT keys:
- "front": The question, term, acronym, code snippet prompt, or problem statement.
- "back": The concise, authoritative explanation, definition, output, or answer.
- "chapter": The high-level subject module (e.g., "Computer Networks", "Database Systems", "Data Structures").
- "subject": The course code or program (e.g., "BSIT", "CS101", "IT214").
- "lesson": Specific sub-topic (e.g., "Transport Layer", "3rd Normal Form", "Binary Search Trees").
- "type": One of: "definition", "concept", "formula", "process", "list", "multiple_choice", "true_false", "enumeration", "identification".
- "mc_correct": (Optional for multiple_choice) The correct option text.
- "mc_distractor1": (Optional) First plausible distractor.
- "mc_distractor2": (Optional) Second plausible distractor.
- "mc_distractor3": (Optional) Third plausible distractor.
- "tf_answer": (Optional for true_false) "true" or "false".
- "enum_items": (Optional for enumeration) Semicolon-separated list of items (e.g., "Physical; Data Link; Network; Transport; Session; Presentation; Application").
- "id_answer": (Optional for identification) The exact keyword/term.
- "id_variants": (Optional) Comma-separated alternative spellings/acronyms (e.g., "TCP/IP, Transmission Control Protocol").

RULES:
1. Break multi-concept notes into individual discrete cards.
2. Produce a rich variety of card types (mix definitions, code concepts, multiple choice, true/false, enumeration).
3. Return ONLY valid JSON array. No markdown code blocks, preamble, or conversational fluff.
"""

def _call_opencode_server(prompt: str, server_url: str = OPENCODE_SERVER_URL) -> Optional[str]:
    """Queries OpenCode server session on port 4096."""
    try:
        req = urllib.request.Request(
            f"{server_url}/session",
            data=json.dumps({}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            sess_data = json.loads(resp.read().decode("utf-8"))
            session_id = sess_data.get("id")

        if not session_id:
            return None

        msg_payload = {"parts": [{"type": "text", "text": prompt}]}
        try:
            post_url = f"{server_url}/session/{session_id}/prompt_async"
            p_req = urllib.request.Request(
                post_url,
                data=json.dumps(msg_payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(p_req, timeout=10):
                pass
        except Exception:
            sync_url = f"{server_url}/session/{session_id}/message"
            s_req = urllib.request.Request(
                sync_url,
                data=json.dumps(msg_payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(s_req, timeout=20):
                pass

        max_poll = 240
        start = time.time()
        while time.time() - start < max_poll:
            time.sleep(2.5)
            try:
                poll_req = urllib.request.Request(f"{server_url}/session/{session_id}/message")
                with urllib.request.urlopen(poll_req, timeout=8) as poll_resp:
                    msgs = json.loads(poll_resp.read().decode("utf-8"))
                    for m in msgs:
                        if m.get("info", {}).get("role") == "assistant":
                            parts = m.get("parts", [])
                            txt_parts = [p["text"] for p in parts if p.get("type") == "text" and "text" in p]
                            txt = "\n".join(txt_parts).strip()
                            if len(txt) > 20:
                                return txt
            except Exception:
                pass
    except Exception as e:
        print(f"[OpenCode Server Notice] {e}", file=sys.stderr)
    return None

def _call_opencode_cli(prompt: str) -> Optional[str]:
    """Fallback to OpenCode CLI runner."""
    opencode_bin = shutil.which("opencode")
    if not opencode_bin:
        candidate = os.path.expandvars(r"%APPDATA%\npm\opencode.cmd")
        if os.path.exists(candidate):
            opencode_bin = candidate
        else:
            candidate_ps = os.path.expandvars(r"%APPDATA%\npm\opencode.ps1")
            if os.path.exists(candidate_ps):
                opencode_bin = candidate_ps

    if not opencode_bin:
        return None

    try:
        cmd = [opencode_bin, "run", "--pure", "-"]
        res = subprocess.run(
            cmd,
            input=prompt,
            capture_output=True,
            text=True,
            timeout=240,
            encoding="utf-8",
            shell=True if opencode_bin.endswith((".cmd", ".ps1")) else False
        )
        if res.returncode == 0 and res.stdout and len(res.stdout.strip()) > 20:
            return res.stdout.strip()
    except Exception as e:
        print(f"[OpenCode CLI Notice] {e}", file=sys.stderr)
    return None

def parse_it_document_with_opencode(
    text: str,
    default_subject: str = "BSIT",
    default_chapter: str = "Information Technology"
) -> List[Dict[str, Any]]:
    """Invokes OpenCode to parse College IT study materials into structured flashcard objects."""
    prompt = f"""{IT_STUDENT_PROMPT}

DEFAULT SUBJECT: {default_subject}
DEFAULT CHAPTER: {default_chapter}

STUDENT IT NOTES / LECTURE CONTENT TO PARSE:
\"\"\"
{text}
\"\"\"
"""
    # Prioritize OpenCode CLI: opencode run "prompt"
    raw_response = _call_opencode_cli(prompt)
    if not raw_response:
        print("[IT CSV Creator] OpenCode CLI did not answer. Falling back to OpenCode Server (4096)...", file=sys.stderr)
        raw_response = _call_opencode_server(prompt)

    if not raw_response:
        raise RuntimeError("Could not connect to OpenCode CLI (opencode run) or OpenCode Server on port 4096.")

    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("\n", 1)[0]
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
        if isinstance(data, list):
            rows = []
            for item in data:
                rows.append({
                    "front": str(item.get("front") or "").strip(),
                    "back": str(item.get("back") or "").strip(),
                    "chapter": str(item.get("chapter") or default_chapter).strip(),
                    "subject": str(item.get("subject") or default_subject).strip(),
                    "lesson": str(item.get("lesson") or "Module 1").strip(),
                    "type": str(item.get("type") or "concept").strip().lower(),
                    "mc_correct": str(item.get("mc_correct") or "").strip(),
                    "mc_distractor1": str(item.get("mc_distractor1") or "").strip(),
                    "mc_distractor2": str(item.get("mc_distractor2") or "").strip(),
                    "mc_distractor3": str(item.get("mc_distractor3") or "").strip(),
                    "tf_answer": str(item.get("tf_answer") or "").strip().lower(),
                    "enum_items": str(item.get("enum_items") or "").strip(),
                    "id_answer": str(item.get("id_answer") or "").strip(),
                    "id_variants": str(item.get("id_variants") or "").strip(),
                })
            return rows
    except Exception as je:
        print(f"[IT CSV Creator] JSON parsing failed: {je}. Raw output was:\n{cleaned[:300]}", file=sys.stderr)

    return [{
        "front": "Overview of Study Materials",
        "back": text[:500],
        "chapter": default_chapter,
        "subject": default_subject,
        "lesson": "Introduction",
        "type": "concept",
        "mc_correct": "", "mc_distractor1": "", "mc_distractor2": "", "mc_distractor3": "",
        "tf_answer": "", "enum_items": "", "id_answer": "", "id_variants": ""
    }]

def convert_it_rows_to_csv(rows: List[Dict[str, Any]]) -> str:
    """Converts student card rows into RFC-4180 CSV matching StitchCSV schema."""
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=CSV_HEADERS,
        quoting=csv.QUOTE_ALL,
        lineterminator="\n"
    )
    writer.writeheader()
    for row in rows:
        writer.writerow({h: str(row.get(h, "")).replace("\r\n", "\n") for h in CSV_HEADERS})
    return output.getvalue()

def main():
    import argparse
    parser = argparse.ArgumentParser(description="StitchCSV - College IT Student Notes to CSV AI Creator")
    parser.add_argument("input", help="Path to input IT study file (.txt, .md) or text string")
    parser.add_argument("-o", "--output", help="Path to output .csv file (defaults to stdout)")
    parser.add_argument("-s", "--subject", default="BSIT", help="Course or degree program (e.g., BSIT, CS201)")
    parser.add_argument("-c", "--chapter", default="Computer Networks", help="Module or chapter name")
    args = parser.parse_args()

    if os.path.isfile(args.input):
        with open(args.input, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
    else:
        text = args.input

    print(f"Processing College IT notes ({len(text)} chars) with OpenCode AI...", file=sys.stderr)
    rows = parse_it_document_with_opencode(text, default_subject=args.subject, default_chapter=args.chapter)
    csv_str = convert_it_rows_to_csv(rows)

    if args.output:
        with open(args.output, "w", encoding="utf-8", newline="") as f:
            f.write(csv_str)
        print(f"SUCCESS: Generated {len(rows)} student flashcards in {args.output}", file=sys.stderr)
    else:
        sys.stdout.write(csv_str)

if __name__ == "__main__":
    main()
