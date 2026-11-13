import StylistForm from "./StylistForm";

export const metadata = { title: "Stylist application · StyleCraft", robots: { index: false, follow: false } };

export default function Apply() {
  return (
    <main className="sf-page">
      <p className="eyebrow">StyleCraft · stylist team</p>
      <h1>Apply to style with us</h1>
      <p className="lead">Tell us about your work. Share this page only with stylists you invite.</p>
      <StylistForm />
    </main>
  );
}
