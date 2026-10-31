export default function PrivacyNotice() {
  return (
    <details style={{ fontSize: "13px", lineHeight: 1.65, color: "#475467", marginTop: "18px" }}>
      <summary style={{ cursor: "pointer", minHeight: "44px", paddingTop: "12px" }}>Privacy Policy & Support</summary>
      <p>Rebutto is operated by Haoran Zhang. Contact zhanghaoranmatt@gmail.com for support or privacy requests.</p>
      <p>We store your account email, display name, password hash, optional profile details, debate transcripts, coaching feedback, practice results, XP and matchmaking records on our AWS server. Your device stores a sign-in token and display preferences. Server logs may contain IP addresses and request details.</p>
      <p>With your permission before each AI request, your debate text, topic, chosen side and opponent character are sent to Google Gemini to generate opponent replies or coaching feedback. Your account name, email and password are not included in those AI requests. Google processes requests under its applicable Gemini API terms and privacy policies. Avoid sharing sensitive personal information. AI feedback can be inaccurate.</p>
      <p>Matchmaking participants can see each other's display names, match information and messages sent in their debate room. With both players' consent when finishing, the topic, assigned positions and complete text conversation are sent to Google Gemini to score the debate and decide the winner. Account names, emails and passwords are not included. AI judgments may be inaccurate. Debate messages, judgments and abuse reports are stored on our AWS server. You can leave a debate or report and block an opponent in the room. Optional browser voice recognition is handled by the browser's speech service; you can always type instead. Rebutto does not store audio recordings.</p>
      <p>Account data is retained while your account exists. Delete your account in Profile → Settings to remove associated records from the active database and end active PvP rooms. Backup copies and operational logs may remain until replaced or removed; contact us for deletion questions. We do not use advertising or cross-app tracking SDKs. This policy was updated October 18, 2026.</p>
      <p>Community rules: no harassment, hate, threats, sexual content, spam or sharing private information. Report and block abusive opponents from their debate room. The operator reviews reports and may suspend PvP access. Contact <a href="mailto:zhanghaoranmatt@gmail.com">zhanghaoranmatt@gmail.com</a> for support or complaints.</p>
    </details>
  );
}
