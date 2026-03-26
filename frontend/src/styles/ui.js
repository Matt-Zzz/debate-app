export const pageWrap = {
  maxWidth: "700px",
  margin: "0 auto",
  padding: "44px 24px",
};

export const eyebrow = {
  fontSize: "11px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#999",
  fontFamily: "'DM Mono', monospace",
};

export const eyebrowSmall = {
  fontSize: "11px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#aaa",
  fontFamily: "'DM Mono', monospace",
};

export const headline = {
  fontSize: "2rem",
  fontWeight: 600,
  color: "#1a1a1a",
  margin: "8px 0 0",
  fontFamily: "'Playfair Display', Georgia, serif",
};

export const solidBtn = {
  padding: "10px 22px",
  background: "#1a1a1a",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  letterSpacing: "0.02em",
};

export const cardBtn = (active) => ({
  padding: "16px 20px",
  background: active ? "#1a1a1a" : "#fafafa",
  color: active ? "#fff" : "#1a1a1a",
  border: `1px solid ${active ? "#1a1a1a" : "#e8e8e8"}`,
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.15s",
  width: "100%",
});

export const appSurface = {
  minHeight: "100vh",
  background: "#fff",
  fontFamily: "'DM Sans', sans-serif",
};

export const loadingSurface = {
  ...appSurface,
  display: "grid",
  placeItems: "center",
  color: "#999",
  fontSize: "14px",
};

export const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=DM+Mono:wght@300;400&family=Playfair+Display:wght@400;600&display=swap');
  * { box-sizing: border-box; }
  textarea { outline: none !important; }
  textarea:focus { border-color: #1a1a1a !important; }
  input { outline: none !important; }
  input:focus { border-color: #1a1a1a !important; }
  button:hover { opacity: 0.82; transition: opacity 0.15s; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes mic-pulse { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.6);opacity:0} }
  .stream-cursor::after { content:"▎"; animation:blink 1s infinite; margin-left:1px; font-size:.85em; color:#aaa; }
`;
