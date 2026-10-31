"""Operator-only moderation tool. Run on the server via SSH, never expose publicly.

Examples: python moderation.py list
          python moderation.py review 12 --decision actioned --note 'Removed abuse' --suspend
Uses REBUTTO_DB_PATH, or app.db beside this file. Outputs private report data.
"""
import argparse
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def review_report(conn, report_id, decision, note, suspend=False, redact=False):
    report = conn.execute("SELECT * FROM pvp_reports WHERE id=?", (report_id,)).fetchone()
    if report is None:
        raise ValueError("Report not found")
    if (suspend or redact) and decision != "actioned":
        raise ValueError("Suspension/removal requires an actioned decision")
    now = datetime.now(timezone.utc).isoformat()
    target = report["reported_id"]
    if target is None:
        room = conn.execute("SELECT player1_id,player2_id FROM pvp_sessions WHERE id=?", (report["session_id"],)).fetchone()
        if room:
            target = room["player2_id"] if room["player1_id"] == report["reporter_id"] else room["player1_id"]
    if (suspend or redact) and target is None:
        raise ValueError("Reported account no longer exists")
    if redact:
        conn.execute("UPDATE pvp_messages SET text='[Removed by moderation]' WHERE session_id=? AND sender_id=?",
                     (report["session_id"], target))
    if suspend:
        conn.execute("UPDATE users SET pvp_suspended=1 WHERE id=?", (target,))
        conn.execute("UPDATE pvp_sessions SET status='cancelled',judge_token=NULL,judge_error=NULL,updated_at=? "
                     "WHERE (player1_id=? OR player2_id=?) AND status IN ('waiting','matched')", (now, target, target))
    conn.execute("UPDATE pvp_reports SET status=?,review_note=?,reviewed_at=? WHERE id=?",
                 (decision, note, now, report_id))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_subparsers(dest="action", required=True)
    actions.add_parser("list", help="Show oldest pending reports and their room transcripts (private)")
    review = actions.add_parser("review")
    review.add_argument("id", type=int)
    review.add_argument("--decision", choices=["actioned", "dismissed"], required=True)
    review.add_argument("--note", required=True)
    review.add_argument("--suspend", action="store_true", help="Suspend the reported account from PvP and end its active rooms")
    review.add_argument("--redact", action="store_true", help="Remove the reported player's message text from the reported room")
    args = parser.parse_args()
    if args.action == "review" and not args.note.strip():
        parser.error("A review note is required")
    path = Path(os.environ.get("REBUTTO_DB_PATH", str(Path(__file__).parent / "app.db"))).expanduser().resolve()
    # Read/write existing database only: a wrong path must not create a blank DB.
    conn = sqlite3.connect(path.as_uri() + "?mode=rw", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            if args.action == "review":
                review_report(conn, args.id, args.decision, args.note.strip(), args.suspend, args.redact)
                print(f"Report {args.id}: {args.decision}")
            else:
                for report in conn.execute("SELECT * FROM pvp_reports WHERE status='pending' ORDER BY created_at LIMIT 100").fetchall():
                    data = dict(report)
                    data["messages"] = [dict(m) for m in conn.execute(
                        "SELECT sender_id,text,created_at FROM pvp_messages WHERE session_id=? ORDER BY id LIMIT 500", (report["session_id"],))]
                    print(json.dumps(data, ensure_ascii=False))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
