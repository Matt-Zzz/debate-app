import os
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, Mock


_temp_dir = tempfile.TemporaryDirectory(prefix="rebutto-tests-")
os.environ["REBUTTO_DB_PATH"] = str(Path(_temp_dir.name) / "app.db")
os.environ.pop("GEMINI_API_KEY", None)

from fastapi.testclient import TestClient

import main


class RebuttoApiSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(main.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        _temp_dir.cleanup()

    def auth(self, token):
        return {"Authorization": f"Bearer {token}"}

    def test_database_connections_close_and_transactions_work(self):
        for _ in range(1100):
            with main.db_conn() as conn:
                conn.execute("SELECT 1").fetchone()
            with self.assertRaises(sqlite3.ProgrammingError):
                conn.execute("SELECT 1")
        with main.db_conn() as conn:
            conn.execute("CREATE TABLE connection_test (value INTEGER)")
            conn.execute("INSERT INTO connection_test VALUES (1)")
        with self.assertRaises(RuntimeError):
            with main.db_conn() as conn:
                conn.execute("INSERT INTO connection_test VALUES (2)")
                raise RuntimeError("rollback")
        with main.db_conn() as conn:
            self.assertEqual(conn.execute("SELECT value FROM connection_test").fetchall()[0][0], 1)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM connection_test").fetchone()[0], 1)

    def register(self, name, email):
        response = self.client.post(
            "/api/auth/register",
            json={"name": name, "email": email, "password": "testing123"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_ai_judge_draw_validation_and_expired_claim(self):
        a = self.register("Draw A", "draw-a@example.com")
        b = self.register("Draw B", "draw-b@example.com")
        ha, hb = self.auth(a["token"]), self.auth(b["token"])
        self.skip_tutorial(a["token"])
        self.skip_tutorial(b["token"])
        room = self.client.post("/api/pvp/match", headers=ha, json={"roomCode": "DRAW-QA"}).json()["session"]
        self.client.post("/api/pvp/match", headers=hb, json={"roomCode": "DRAW-QA"})
        base = f"/api/pvp/sessions/{room['id']}"
        for headers, text in [(ha, "A reasoned first argument."), (hb, "A comparable counterargument.")]:
            self.assertEqual(self.client.post(base + "/messages", headers=headers, json={"clientId": "one", "text": text}).status_code, 200)
        self.client.post(base + "/finish", headers=ha, json={"aiConsent": True})
        fake = Mock()
        fake.models.generate_content.return_value.text = '{"player1":{"reasoning":999}}'
        with patch.object(main, "get_gemini_client", return_value=fake):
            self.assertEqual(self.client.post(base + "/finish", headers=hb, json={"aiConsent": True}).status_code, 503)
        payload = json.loads(fake.models.generate_content.call_args.kwargs["contents"])
        self.assertEqual(set(payload), {"topic", "player1Position", "player2Position", "messages"})
        self.assertEqual(len(payload["messages"]), 2)
        with main.db_conn() as conn:
            conn.execute("UPDATE pvp_sessions SET judge_token='expired', judge_started_at='2020-01-01T00:00:00+00:00',judge_error=NULL WHERE id=?", (room["id"],))
        self.assertEqual(self.client.get(base + "/room", headers=ha).json()["session"]["judgeState"], "failed")
        score = main.PvPJudgeScore(reasoning=10, evidence=10, rebuttal=10, clarity=10, feedback="Equal quality.")
        with patch.object(main, "judge_pvp_transcript", return_value=main.PvPJudgment(player1=score, player2=score, reason="Both arguments are equally developed.")) as judge:
            result = self.client.post(base + "/finish", headers=hb, json={"aiConsent": True})
            self.assertEqual(result.status_code, 200, result.text)
            self.assertIsNone(result.json()["session"]["winnerId"])
            self.assertEqual(result.json()["session"]["result"]["player1Outcome"], "draw")
            xp = result.json()["user"]["totalXP"]
            again = self.client.post(base + "/finish", headers=hb, json={"aiConsent": True})
            self.assertEqual(again.json()["user"]["totalXP"], xp)
            judge.assert_called_once()

    def skip_tutorial(self, token):
        headers = self.auth(token)
        session = self.client.get("/api/tutorial/session", headers=headers)
        self.assertEqual(session.status_code, 200, session.text)
        session_id = session.json()["session"]["id"]
        skipped = self.client.post(
            "/api/tutorial/skip",
            headers=headers,
            json={"sessionId": session_id},
        )
        self.assertEqual(skipped.status_code, 200, skipped.text)
        self.assertTrue(skipped.json()["user"]["tutorialCompleted"])

    def test_complete_user_journey(self):
        health = self.client.get("/api/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json()["status"], "ok")
        for path, title in [("/privacy", "Rebutto Privacy Policy"), ("/support", "Rebutto Support")]:
            page = self.client.get(path)
            self.assertEqual(page.status_code, 200)
            self.assertIn("text/html", page.headers["content-type"])
            self.assertIn(title, page.text)

        first = self.register("Smoke One", "smoke-one@example.com")
        first_token = first["token"]
        first_headers = self.auth(first_token)

        duplicate = self.client.post(
            "/api/auth/register",
            json={
                "name": "Duplicate",
                "email": "SMOKE-ONE@example.com",
                "password": "testing123",
            },
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        anonymous_opponent = self.client.post(
            "/api/opponent-speech",
            json={
                "characterId": "socratic",
                "topicId": "social-media",
                "side": "A",
                "stageName": "Opening",
                "userSpeech": "",
            },
        )
        self.assertEqual(anonymous_opponent.status_code, 401)
        anonymous_report = self.client.post(
            "/api/coach-report",
            json={
                "topicId": "social-media",
                "characterId": "socratic",
                "side": "A",
                "sessionId": "anonymous-report",
                "transcript": [],
            },
        )
        self.assertEqual(anonymous_report.status_code, 401)

        self.skip_tutorial(first_token)
        topics = self.client.get("/api/topics", headers=first_headers)
        self.assertEqual(topics.status_code, 200, topics.text)
        self.assertGreater(len(topics.json()), 0)

        training = self.client.post(
            "/api/training-sessions",
            headers=first_headers,
            json={
                "type": "clash",
                "score": 1,
                "maxScore": 1,
                "completedQuestions": 1,
                "result": {},
            },
        )
        self.assertEqual(training.status_code, 200, training.text)
        self.assertGreater(training.json()["earnedXP"], 0)

        profile = self.client.put(
            "/api/auth/me",
            headers=first_headers,
            json={"headline": "Ready to debate", "location": "Vancouver"},
        )
        self.assertEqual(profile.status_code, 200, profile.text)
        self.assertEqual(profile.json()["user"]["headline"], "Ready to debate")

        character = self.client.get("/api/characters").json()[0]
        before_report_xp = profile.json()["user"]["totalXP"]
        report_payload = {
            "aiConsent": True,
            "topicId": topics.json()[0]["id"],
            "characterId": character["id"],
            "side": "A",
            "sessionId": "smoke-report-session",
            "transcript": [
                {
                    "role": "user",
                    "stageName": "Opening",
                    "text": (
                        "I argue that the framework must prioritize public benefit because "
                        "research and data show better access. For example, more people can "
                        "participate; therefore this matters because the benefit to society "
                        "outweighs the cost compared to the status quo."
                    ),
                },
                {
                    "role": "opponent",
                    "stageName": "Opening",
                    "text": "The costs may outweigh the benefits.",
                },
                {
                    "role": "user",
                    "stageName": "Rebuttal",
                    "text": (
                        "In response, my opponent claims the cost is decisive; however, my "
                        "position still holds. Specifically, the real issue is whether the "
                        "greater long-term impact must outweigh the short-term expense."
                    ),
                },
            ],
        }
        report = self.client.post(
            "/api/coach-report",
            headers=first_headers,
            json=report_payload,
        )
        self.assertEqual(report.status_code, 200, report.text)
        self.assertFalse(report.json()["aiFeedbackAvailable"])
        self.assertGreater(report.json()["earnedXP"], 0)
        after_report = self.client.get("/api/auth/me", headers=first_headers).json()["user"]
        self.assertEqual(
            after_report["totalXP"],
            before_report_xp + report.json()["earnedXP"],
        )

        duplicate_report = self.client.post(
            "/api/coach-report",
            headers=first_headers,
            json=report_payload,
        )
        self.assertEqual(duplicate_report.status_code, 200, duplicate_report.text)
        self.assertEqual(duplicate_report.json()["earnedXP"], 0)
        after_duplicate_report = self.client.get(
            "/api/auth/me", headers=first_headers
        ).json()["user"]
        self.assertEqual(after_duplicate_report["totalXP"], after_report["totalXP"])

        second = self.register("Smoke Two", "smoke-two@example.com")
        second_token = second["token"]
        second_headers = self.auth(second_token)
        self.skip_tutorial(second_token)

        waiting = self.client.post("/api/pvp/match", headers=first_headers)
        self.assertEqual(waiting.status_code, 200, waiting.text)
        self.assertEqual(waiting.json()["session"]["status"], "waiting")

        matched = self.client.post("/api/pvp/match", headers=second_headers)
        self.assertEqual(matched.status_code, 200, matched.text)
        match = matched.json()["session"]
        self.assertEqual(match["status"], "matched")
        self.assertIsNotNone(match["topicId"])
        self.assertNotEqual(match["player1Side"], match["player2Side"])

        premature = self.client.post(
            f"/api/pvp/sessions/{match['id']}/complete",
            headers=first_headers,
            json={"player1Score": 3, "player2Score": 1, "notes": "Smoke test"},
        )
        self.assertEqual(premature.status_code, 409)
        base = f"/api/pvp/sessions/{match['id']}"
        outsider = self.register("Outsider", "outsider@example.com")
        outsider_headers = self.auth(outsider["token"])
        self.assertEqual(self.client.get(base + "/room", headers=outsider_headers).status_code, 403)
        self.assertEqual(self.client.post(base + "/messages", headers=outsider_headers, json={"clientId": "bad", "text": "intrusion"}).status_code, 403)
        self.assertEqual(self.client.get(base + "/room").status_code, 401)
        first_message = {"clientId": "first-argument", "text": "I argue that evidence matters because research shows greater public benefit. For example, clear reasoning improves decisions."}
        sent = self.client.post(base + "/messages", headers=first_headers, json=first_message)
        self.assertEqual(sent.status_code, 200, sent.text)
        duplicate_message = self.client.post(base + "/messages", headers=first_headers, json=first_message)
        self.assertEqual(duplicate_message.json()["id"], sent.json()["id"])
        second_message = {"clientId": "second-argument", "text": "However, my opponent overlooks the cost. In response, we must compare the likely harm with the benefit to society."}
        sent_second = self.client.post(base + "/messages", headers=second_headers, json=second_message)
        self.assertEqual(sent_second.status_code, 200, sent_second.text)
        room = self.client.get(base + "/room", headers=first_headers).json()
        other_room = self.client.get(base + "/room", headers=second_headers).json()
        self.assertEqual(room["messages"], other_room["messages"])
        self.assertEqual(len(room["messages"]), 2)
        incremental = self.client.get(base + f"/room?after={sent.json()['id']}", headers=second_headers).json()
        self.assertEqual(len(incremental["messages"]), 1)
        self.assertEqual(self.client.post(base + "/messages", headers=first_headers, json={"clientId": "empty", "text": " "}).status_code, 400)
        self.assertEqual(self.client.post(base + "/messages", headers=first_headers, json={"clientId": "long", "text": "x" * 2001}).status_code, 422)
        self.assertEqual(self.client.post(base + "/finish", headers=first_headers).status_code, 400)
        finishing = self.client.post(base + "/finish", headers=first_headers, json={"aiConsent": True})
        self.assertEqual(finishing.status_code, 200, finishing.text)
        self.assertEqual(finishing.json()["session"]["status"], "matched")
        self.assertEqual(self.client.post(base + "/messages", headers=first_headers, json={"clientId": "late", "text": "too late"}).status_code, 409)
        xp_before_judge = self.client.get("/api/auth/me", headers=first_headers).json()["user"]["totalXP"]
        with patch.object(main, "judge_pvp_transcript", side_effect=RuntimeError("timeout")):
            failed = self.client.post(base + "/finish", headers=second_headers, json={"aiConsent": True})
        self.assertEqual(failed.status_code, 503)
        failed_room = self.client.get(base + "/room", headers=first_headers).json()["session"]
        self.assertEqual(failed_room["judgeState"], "failed")
        self.assertEqual(failed_room["status"], "matched")
        self.assertEqual(self.client.get("/api/auth/me", headers=first_headers).json()["user"]["totalXP"], xp_before_judge)
        judgment = main.PvPJudgment(
            player1=main.PvPJudgeScore(reasoning=20, evidence=18, rebuttal=17, clarity=22, feedback="Strong reasoning."),
            player2=main.PvPJudgeScore(reasoning=15, evidence=12, rebuttal=15, clarity=18, feedback="Develop evidence."),
            reason="Player 1 substantiated the public benefit more clearly.",
        )
        def judging(row, messages):
            # A concurrent request must see the claim, not make another AI call.
            concurrent = self.client.post(base + "/complete", headers=first_headers, json={})
            self.assertEqual(concurrent.json()["session"]["judgeState"], "judging")
            self.assertEqual(self.client.get("/api/health").status_code, 200)
            return judgment
        with patch.object(main, "judge_pvp_transcript", side_effect=judging) as judge:
            completed = self.client.post(base + "/finish", headers=second_headers, json={"aiConsent": True})
            judge.assert_called_once()
        self.assertEqual(completed.status_code, 200, completed.text)
        self.assertEqual(completed.json()["session"]["status"], "completed")
        result = completed.json()["session"]
        self.assertEqual(result["scores"], {"player1": 77, "player2": 60})
        self.assertEqual(result["winnerId"], match["player1Id"])
        self.assertEqual(result["result"]["judge"], "Google Gemini")
        self.assertEqual(self.client.post(base + "/messages", headers=second_headers, json={"clientId": "closed", "text": "too late"}).status_code, 409)

        first_after_pvp = self.client.get("/api/auth/me", headers=first_headers)
        self.assertEqual(first_after_pvp.status_code, 200)
        xp_after_first_completion = first_after_pvp.json()["user"]["totalXP"]

        repeated = self.client.post(
            f"/api/pvp/sessions/{match['id']}/complete",
            headers=first_headers,
            json={"player1Score": 3, "player2Score": 1, "notes": "Repeated"},
        )
        self.assertEqual(repeated.status_code, 200, repeated.text)
        first_after_repeat = self.client.get("/api/auth/me", headers=first_headers)
        self.assertEqual(
            first_after_repeat.json()["user"]["totalXP"],
            xp_after_first_completion,
        )

        # Report/block ends the room and prevents future matching in either direction.
        new_wait = self.client.post("/api/pvp/match", headers=first_headers).json()["session"]
        new_match = self.client.post("/api/pvp/match", headers=second_headers).json()["session"]
        self.assertEqual(new_wait["id"], new_match["id"])
        left = self.client.post(f"/api/pvp/sessions/{new_match['id']}/leave", headers=first_headers, json={"blockOpponent": True, "reportReason": "Test report"})
        self.assertEqual(left.status_code, 200, left.text)
        self.assertEqual(self.client.get(f"/api/pvp/sessions/{new_match['id']}/room", headers=second_headers).json()["session"]["status"], "cancelled")
        blocked_wait1 = self.client.post("/api/pvp/match", headers=first_headers).json()["session"]
        blocked_wait2 = self.client.post("/api/pvp/match", headers=second_headers).json()["session"]
        self.assertNotEqual(blocked_wait1["id"], blocked_wait2["id"])
        self.assertEqual(blocked_wait2["status"], "waiting")
        self.skip_tutorial(outsider["token"])
        private_wait = self.client.post("/api/pvp/match", headers=outsider_headers, json={"roomCode": "ISOLATED"}).json()["session"]
        self.assertEqual(private_wait["status"], "waiting")
        self.assertNotIn(private_wait["id"], {blocked_wait1["id"], blocked_wait2["id"]})
        self.assertEqual(self.client.post(f"/api/pvp/sessions/{private_wait['id']}/leave", headers=outsider_headers, json={}).status_code, 200)

        safety = self.client.post(
            "/api/safety-check",
            json={"text": "Should cities invest more in public transit?"},
        )
        self.assertEqual(safety.status_code, 200)
        self.assertTrue(safety.json()["safe"])

        logout = self.client.post("/api/auth/logout", headers=first_headers)
        self.assertEqual(logout.status_code, 200, logout.text)
        self.assertEqual(
            self.client.get("/api/auth/me", headers=first_headers).status_code,
            401,
        )


if __name__ == "__main__":
    unittest.main()
