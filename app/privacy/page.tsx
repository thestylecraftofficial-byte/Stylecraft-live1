import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice · StyleCraft" };

export default function Privacy() {
  const contact = process.env.NEXT_PUBLIC_CONTACT || "the contact details on our website";
  return (
    <main>
      <h1>Privacy notice</h1>
      <p className="hint">Plain-English summary of how StyleCraft handles your information.</p>

      <h3>What we collect</h3>
      <p>Your answers (age range, style, colours, budget, body measurements), your name and phone number (and email if you give one),
        and, if you choose, an outfit photo. Your face photo is read on your own phone and is never uploaded.</p>

      <h3>Why</h3>
      <p>To make your style report and to give you an outfit check. Nothing else.</p>

      <h3>How we keep it apart</h3>
      <p>Your name, phone and email are stored separately from your style answers. The only link between them is deleted
        <b> 7 days after you use your report link</b>, and your name and contact details are deleted with it. If you ticked the optional box,
        we keep your style answers with no name and no way back to you, to improve the service. If you did not, they are deleted too.</p>

      <h3>Waitlist and stylist applications</h3>
      <p>If you join the waitlist we keep your name, phone, area and optional email until we launch or you ask us to delete them, and use them only to tell you about StyleCraft.
        If you apply as a stylist we keep your application, including any portfolio link, to consider you for the team. Both are kept apart from style reports.</p>

      <h3>Outfit photos</h3>
      <p>Stored privately, seen only by a person at StyleCraft (not by AI), stripped of location and camera data, and deleted 7 days after upload.</p>

      <h3>Who else handles your data</h3>
      <ul>
        <li><b>Google (Gemini AI):</b> receives only anonymous details such as colours, sizes and budget, never your name, phone, email or photo. While we use Google’s free tier, Google may use this content to improve its products.</li>
        <li><b>Supabase</b> (database and storage) and <b>Vercel</b> (website hosting).</li>
      </ul>

      <h3>Your choices</h3>
      <p>You can ask to see, correct or delete your information at any time, including before the 7 days are up. Contact {contact}.
        You must be 18 or older to use StyleCraft.</p>

      <p className="hint">This page will be reviewed and updated as StyleCraft grows. Last updated October 2026.</p>
    </main>
  );
}
