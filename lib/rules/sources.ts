// Every published guide that a StyleCraft rule leans on. The report prints the ones it used,
// so a customer (and the stylist reviewing the rules) can check where advice comes from.
export type Source = { id: string; title: string; publisher: string; url: string; checked: string };

const CHECKED = "2026-11";

export const SOURCES: Record<string, Source> = {
  shirt: { id: "shirt", title: "Dress shirt size guide: how to measure and choose the right fit", publisher: "Mizzen+Main", url: "https://www.mizzenandmain.com/blog/dress-shirt-guide", checked: CHECKED },
  trouser: { id: "trouser", title: "How trousers should fit", publisher: "Gentleman's Gazette", url: "https://www.gentlemansgazette.com/?p=56569", checked: CHECKED },
  mix: { id: "mix", title: "A simple guide to pattern mixing", publisher: "Articles of Style", url: "https://articlesofstyle.com/blogs/news/a-simple-guide-to-patternmixing", checked: CHECKED },
  stripes: { id: "stripes", title: "How to mix stripes with checks", publisher: "Mr Porter", url: "https://www.mrporter.com/en-ae/journal/fashion/how-to-mix-stripes-with-checks-686194", checked: CHECKED },
  kurta: { id: "kurta", title: "Kurta size and fitting guide", publisher: "Diwas Fashion", url: "https://www.diwasfashion.com/en-in/blogs/kurta-size-and-fitting-guide.html", checked: CHECKED },
  baggy: { id: "baggy", title: "Avoid the baggy look: tips for a well-fitted men's kurta", publisher: "NDTV Shopping", url: "https://www.ndtvshopping.com/fashion/how-to-pick-mens-kurta-to-avoid-the-baggy-look-10-tips-8794068", checked: CHECKED },
  blouse1: { id: "blouse1", title: "6 pro tips to get a perfectly fitting saree blouse", publisher: "Binks", url: "https://getbinks.com/blogs/blog/6-protips-to-get-that-perfectly-fitting-saree-blouse", checked: CHECKED },
  blouse2: { id: "blouse2", title: "Complete guide to saree blouses", publisher: "Saroj Jain", url: "https://blog.sarojjain.com/posts/complete-guide-saree-blouses/", checked: CHECKED },
  kurti: { id: "kurti", title: "Kurti size and fit guide", publisher: "Saroj Jain", url: "https://sarojjain.com/blogs/asya-journal/kurti-size-fit-guide", checked: CHECKED },
  dress: { id: "dress", title: "How to measure for a dress and use size charts", publisher: "Stitch Fix", url: "https://www.stitchfix.com/women/blog/?p=71185", checked: CHECKED },
  wedding: { id: "wedding", title: "What you should (and shouldn't) wear as a guest at an Indian wedding", publisher: "Who What Wear", url: "https://www.whowhatwear.com/living/wedding/what-to-wear-to-an-indian-wedding", checked: CHECKED },
  telugu: { id: "telugu", title: "Telugu wedding guest outfit guide", publisher: "Aza Fashions", url: "https://www.azafashions.com/blog/telugu-wedding-guest-outfit-guide/amp/", checked: CHECKED },
  diwali: { id: "diwali", title: "Diwali outfit guide: colours, meanings and what to wear", publisher: "Aza Fashions", url: "https://www.azafashions.com/blog/diwali-outfit-guide-colors-meanings-what-to-wear/", checked: CHECKED },
  colour: { id: "colour", title: "Can I do a colour analysis myself? A men's guide", publisher: "The Vou", url: "https://thevou.com/?p=197948", checked: CHECKED },
};

// Style is partly opinion. Rules with no published source are tagged "house" so they can be reviewed first.
export const HOUSE_NOTE = "StyleCraft house rule: a style judgement, not a measured fact. Your stylist reviews these first.";
