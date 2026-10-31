"""Additional isolated regression coverage. Never connects to AWS or real Gemini."""
from unittest.mock import Mock, patch
import unittest

import test_smoke as smoke
import main
from moderation import review_report


class ReviewHardeningTests(unittest.TestCase):
    auth = smoke.RebuttoApiSmokeTests.auth
    register = smoke.RebuttoApiSmokeTests.register
    skip_tutorial = smoke.RebuttoApiSmokeTests.skip_tutorial

    @classmethod
    def setUpClass(cls):
        cls.client = smoke.TestClient(main.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def players(self, prefix):
        a = self.register("Safety A", f"{prefix}-a@example.com")
        b = self.register("Safety B", f"{prefix}-b@example.com")
        for p in (a, b):
            self.skip_tutorial(p["token"])
        ha, hb = self.auth(a["token"]), self.auth(b["token"])
        room = self.client.post("/api/pvp/match", headers=ha, json={"roomCode": prefix}).json()["session"]
        self.client.post("/api/pvp/match", headers=hb, json={"roomCode": prefix})
        return a, b, ha, hb, f"/api/pvp/sessions/{room['id']}"

    def test_deletion_cancels_opponent_room_and_removes_answers(self):
        a, b, ha, hb, base = self.players("DELETE-QA")
        bid = b["user"]["id"]
        with main.db_conn() as conn:
            conn.execute("INSERT INTO drill_completions(drill_id,session_id,user_id,answers_json,score,completed_at) VALUES('d1','delete-qa',?,'{\"private\":true}',1,?)", (bid, main.now_iso()))
        self.assertEqual(self.client.request("DELETE", "/api/auth/me", headers=hb, json={"password": "wrong"}).status_code, 401)
        self.assertEqual(self.client.request("DELETE", "/api/auth/me", headers=hb, json={"password": "testing123"}).status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me", headers=hb).status_code, 401)
        self.assertEqual(self.client.get(base + "/room", headers=ha).json()["session"]["status"], "cancelled")
        self.assertEqual(self.client.post(base + "/finish", headers=ha, json={"aiConsent": True}).status_code, 409)
        with main.db_conn() as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM drill_completions WHERE session_id='delete-qa'").fetchone()[0], 0)

    def test_filter_reports_and_operator_suspension(self):
        a, b, ha, hb, base = self.players("SAFETY-QA")
        for text in ["F.u.c.k you", "ｆｕｃｋ you", "I will k\u200bill you", "去死", "傻逼", "You are an idiot", "fucking nonsense"]:
            response = self.client.post(base + "/messages", headers=hb, json={"clientId": "unsafe", "text": text})
            self.assertEqual(response.status_code, 400, response.text)
        response = self.client.post(base + "/messages", headers=hb, json={"clientId": "safe", "text": "I disagree with your policy because the evidence is weak."})
        self.assertEqual(response.status_code, 200, response.text)
        for _ in range(2):
            self.assertEqual(self.client.post(base + "/leave", headers=ha, json={"blockOpponent": True, "reportReason": "Harassment"}).status_code, 200)
        with main.db_conn() as conn:
            reports = conn.execute("SELECT * FROM pvp_reports WHERE session_id=?", (base.split("/")[-1],)).fetchall()
            self.assertEqual(len(reports), 1)
            self.assertEqual(reports[0]["reported_id"], b["user"]["id"])
            review_report(conn, reports[0]["id"], "actioned", "Confirmed abuse", suspend=True, redact=True)
            self.assertEqual(conn.execute("SELECT status FROM pvp_reports WHERE id=?", (reports[0]["id"],)).fetchone()[0], "actioned")
            self.assertEqual(conn.execute("SELECT text FROM pvp_messages WHERE session_id=?", (base.split("/")[-1],)).fetchone()[0], "[Removed by moderation]")
        self.assertEqual(self.client.post("/api/pvp/match", headers=hb).status_code, 403)
        self.assertEqual(self.client.get("/api/auth/me", headers=hb).status_code, 200)

    def test_ai_consent_is_enforced_before_sdk_and_input_validated(self):
        a = self.register("Consent QA", "consent-qa@example.com")
        self.skip_tutorial(a["token"])
        headers = self.auth(a["token"])
        character = main.CHARACTERS[0]["id"]
        topic = main.TOPICS[0]["id"]
        opponent = {"topicId": topic, "characterId": character, "side": "A", "stageName": "Opening", "userSpeech": "An argument."}
        coach = {"topicId": topic, "characterId": character, "side": "A", "transcript": []}
        fake = Mock()
        with patch.object(main, "get_gemini_client", return_value=fake):
            for path, payload in [("opponent-speech", opponent), ("coach-report", coach)]:
                for consent in ({}, {"aiConsent": False}):
                    self.assertEqual(self.client.post("/api/v2/" + path, headers=headers, json={**payload, **consent}).status_code, 400)
            fake.models.generate_content.assert_not_called()
            fake.models.generate_content_stream.assert_not_called()
            fake.models.generate_content_stream.side_effect = RuntimeError("private vendor error and credentials")
            legacy = self.client.post("/api/opponent-speech", headers=headers, json=opponent)
            self.assertEqual(legacy.status_code, 200)
            self.assertIn("AI response unavailable", legacy.text)
            # Build 4's old coaching request still works; it prompts on-device.
            with patch.object(main, "get_gemini_client", return_value=None):
                self.assertEqual(self.client.post("/api/coach-report", headers=headers, json=coach).status_code, 200)
            response = self.client.post("/api/opponent-speech", headers=headers, json={**opponent, "aiConsent": True})
            self.assertIn("[ERROR] AI response unavailable", response.text)
            self.assertNotIn("credentials", response.text)
            self.assertEqual(self.client.post("/api/coach-report", headers=headers, json={**coach, "aiConsent": True, "transcript": [{"role": "user"}]}).status_code, 422)
            self.assertEqual(self.client.post("/api/opponent-speech", headers=headers, json={**opponent, "aiConsent": True, "side": "invalid"}).status_code, 422)
