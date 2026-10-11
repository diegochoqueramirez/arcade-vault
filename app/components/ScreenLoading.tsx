// Fallback de Suspense para pantallas que dependen de params de la URL.
export default function ScreenLoading() {
  return (
    <div
      role="status"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "120px 24px" }}
    >
      <span className="spinner"></span>
      <span className="pixel neon-cyan" style={{ fontSize: 11, letterSpacing: "0.16em" }}>CARGANDO</span>
    </div>
  );
}
