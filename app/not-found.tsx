import Link from "next/link";

export default function NotFound() {
  return (
    <section className="av-404">
      <div className="code" aria-hidden="true">404</div>
      <h1>ESTE CARTUCHO NO ESTÁ EN EL VAULT</h1>
      <p>La dirección no existe o el juego ya no está disponible. Vuelve a la biblioteca y elige otro.</p>
      <Link href="/" className="btn lg">
        VOLVER A LA BIBLIOTECA
      </Link>
    </section>
  );
}
