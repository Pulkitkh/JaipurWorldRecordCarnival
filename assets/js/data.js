/* ============================================================
   JWRC — DEMO CONTENT
   ------------------------------------------------------------
   ⚠  Everything in this file is ILLUSTRATIVE SAMPLE DATA written to
      demonstrate the site's layouts and interactions. Record titles,
      participant counts, dates, quotes and names are INVENTED.
      Replace every entry with verified, certified information before
      this site is published. Nothing here should be treated as fact.

      The only real details on this site are the founder's name, the
      seven Guinness World Records, the six record bodies, the phone
      number, the email address and the tagline.
   ============================================================ */
(function (w) {
  "use strict";

  const RECORDS = [
    {
      id: "r1", featured: true,
      title: "Largest human formation of a state emblem",
      body: "Guinness World Records", cause: "Culture", year: 2025,
      date: "12 January 2025", venue: "SMS Stadium, Jaipur",
      participants: 8420, volunteers: 310, institutions: 46,
      scene: "formation",
      blurb: "Eight thousand school students, forty-six institutions and one shape " +
             "that only made sense from the air.",
      story: "The idea arrived in a staff room in September and nobody in the room " +
             "believed it. Four months later, 8,420 students from forty-six schools " +
             "stood on painted markers at six in the morning, held a coloured board " +
             "over their heads for four minutes and eleven seconds, and made a shape " +
             "that none of them could see. The drone footage is the only way any " +
             "participant has ever seen what they made.",
      quote: "My daughter still has her marker number written on the back of her hand in the photograph.",
      quoteBy: "Parent, Jaipur",
    },
    {
      id: "r2",
      title: "Most people planting saplings simultaneously",
      body: "Limca Book of Records", cause: "Environment", year: 2024,
      date: "5 June 2024", venue: "Central Park, Jaipur",
      participants: 5100, volunteers: 220, institutions: 28,
      scene: "green",
      blurb: "Five thousand saplings in the ground in eleven minutes — and a two-year " +
             "watering rota agreed before anyone was allowed to dig.",
      story: "We refused to run this one until the maintenance plan existed. A record " +
             "for planting trees that die in August is not a record, it is litter. " +
             "Twenty-eight institutions signed a two-year watering commitment before " +
             "the first spade was bought.",
      quote: "The record took eleven minutes. The rota is in its second year.",
      quoteBy: "Partner NGO coordinator",
    },
    {
      id: "r3",
      title: "Largest folk dance ensemble performing Ghoomar",
      body: "Asia Book of Records", cause: "Culture", year: 2024,
      date: "18 October 2024", venue: "Jawahar Kala Kendra, Jaipur",
      participants: 2860, volunteers: 140, institutions: 19,
      scene: "festival",
      blurb: "Two thousand eight hundred dancers, eleven minutes, one count — and " +
             "forty-one folk artists who taught them.",
      story: "Every participant was taught by a working folk artist rather than a video. " +
             "Forty-one artists ran rehearsals across nineteen institutions for six weeks. " +
             "The record is Asia's; the point was the six weeks.",
      quote: "For once the art form was the reason, not the decoration.",
      quoteBy: "Folk artist, Jodhpur",
    },
    {
      id: "r4",
      title: "Most people taking a pledge on road safety",
      body: "India Book of Records", cause: "Social cause", year: 2024,
      date: "2 March 2024", venue: "Albert Hall Grounds, Jaipur",
      participants: 12240, volunteers: 480, institutions: 61,
      scene: "attempt",
      blurb: "Twelve thousand pledges taken in a single voice, with the traffic police " +
             "standing in the front row.",
      story: "The pledge itself takes ninety seconds. Getting twelve thousand people " +
             "counted, verified and recorded takes four months and four hundred and " +
             "eighty volunteers who each learned to run a registration desk.",
      quote: "I came to steward a queue. I left running a team of nine.",
      quoteBy: "Volunteer, second-year student",
    },
    {
      id: "r5",
      title: "Largest simultaneous health screening camp",
      body: "Golden Book of Records", cause: "Health", year: 2023,
      date: "14 September 2023", venue: "Twelve wards across Jaipur",
      participants: 6730, volunteers: 390, institutions: 34,
      scene: "school",
      blurb: "Six thousand seven hundred screenings across twelve wards in one morning — " +
             "and four hundred and ten referrals that would not otherwise have happened.",
      story: "The number that mattered was never 6,730. It was the 410 people sent for " +
             "follow-up care who had not seen a doctor that year. The record was simply " +
             "the reason they walked in.",
      quote: "We have run camps for nine years. We had never had a queue like that.",
      quoteBy: "Camp physician",
    },
    {
      id: "r6",
      title: "Most people block-printing a single continuous cloth",
      body: "Unique Book of Records", cause: "Culture", year: 2023,
      date: "21 November 2023", venue: "Bagru, Jaipur district",
      participants: 1940, volunteers: 96, institutions: 12,
      scene: "heritage",
      blurb: "A one-kilometre cloth, printed by nineteen hundred hands, taught by " +
             "sixty master printers from Bagru and Sanganer.",
      story: "The cloth now hangs in three schools and a district office. Sixty master " +
             "printers were paid as teachers rather than thanked as guests, which is the " +
             "only detail about this attempt we would insist on repeating.",
      quote: "My grandfather's block was used by two hundred children that day.",
      quoteBy: "Master printer, Bagru",
    },
    {
      id: "r7",
      title: "Largest gathering of people reading simultaneously",
      body: "India Book of Records", cause: "Education", year: 2023,
      date: "23 April 2023", venue: "Ramniwas Garden, Jaipur",
      participants: 4380, volunteers: 175, institutions: 37,
      scene: "night",
      blurb: "Four thousand readers, twenty minutes of complete silence, and eleven " +
             "thousand books donated onward afterwards.",
      story: "Twenty minutes of four thousand people reading is the quietest a Jaipur " +
             "park has ever been. Every book was donated to a school library the " +
             "following week — that was a condition of entry, not an afterthought.",
      quote: "The silence is the thing everyone remembers. Not the number.",
      quoteBy: "Librarian, participating school",
    },
    {
      id: "r8",
      title: "Most people forming a human chain for water conservation",
      body: "Asia Book of Records", cause: "Environment", year: 2022,
      date: "22 March 2022", venue: "Jal Mahal to Amer Road",
      participants: 9600, volunteers: 405, institutions: 52,
      scene: "attempt",
      blurb: "A nine-kilometre chain along the Amer road on World Water Day, held for " +
             "seven minutes without a single break.",
      story: "Nine thousand six hundred people, nine kilometres, and one rule: if the " +
             "chain breaks anywhere, it breaks everywhere. It held for seven minutes.",
      quote: "You could not see either end of it. That is when it stopped being a stunt.",
      quoteBy: "Ward volunteer",
    },
  ];

  const UPCOMING = [
    {
      title: "Largest handprint mural by school students",
      when: "14 September 2026", where: "Jaipur", cause: "Education",
      need: "6,000 participants · 250 volunteers", status: "Registrations open",
      scene: "school",
    },
    {
      title: "Most people performing a folk instrument together",
      when: "2 November 2026", where: "Jawahar Kala Kendra", cause: "Culture",
      need: "3,500 participants · 180 volunteers", status: "Institutions invited",
      scene: "festival",
    },
    {
      title: "Largest simultaneous cleanliness drive",
      when: "January 2027", where: "Across 20 wards", cause: "Social cause",
      need: "10,000 participants · 500 volunteers", status: "Planning",
      scene: "green",
    },
  ];

  const STORIES = [
    {
      name: "Aarti Sharma", role: "Class 11 · she arrived as a participant",
      seed: 12,
      quote: "I only came because my friends were coming. Then someone handed me a clipboard " +
             "and a section and ninety people who had to listen to me. I went home and could " +
             "not sleep. Nobody had ever trusted me with ninety people before.",
    },
    {
      name: "Rajendra Meena", role: "Principal · twenty-two years of sports days",
      seed: 27,
      quote: "I have watched children attend events for two decades. That morning I watched " +
             "them run one. Two of my teachers stood at the back and cried, and I am not going " +
             "to pretend I know exactly why.",
    },
    {
      name: "Sunita Devi", role: "She lives four streets from the ground",
      seed: 41,
      quote: "Our colony had lived beside each other for eleven years without doing anything " +
             "together. There are forty of us who still meet on Sundays. The morning was in " +
             "January. The Sundays are the part that stayed.",
    },
    {
      name: "Vikram Singh", role: "He came for a work activity",
      seed: 58,
      quote: "We have funded a great many things nobody remembered by March. My team still " +
             "argues about who counted faster. I have stopped trying to explain to people " +
             "why that matters.",
    },
    {
      name: "Fatima Khan", role: "Folk artist · she taught two thousand people",
      seed: 73,
      quote: "For thirty years we have been invited to perform at the edge of other people’s " +
             "events. This time they asked us to teach. Two thousand people learned it properly, " +
             "from us, and looked at us while we spoke.",
    },
  ];

  const BODIES = [
    { name: "Guinness World Records", note: "7 held by our founder" },
    { name: "Limca Book of Records", note: "India" },
    { name: "Asia Book of Records", note: "Continental" },
    { name: "India Book of Records", note: "National" },
    { name: "Golden Book of Records", note: "International" },
    { name: "Unique Book of Records", note: "International" },
  ];

  /* Aggregates are computed from the sample records above so the counters
     can never drift out of step with the entries they claim to summarise. */
  const STATS = {
    records: RECORDS.length,
    participants: RECORDS.reduce((n, r) => n + r.participants, 0),
    volunteers: RECORDS.reduce((n, r) => n + r.volunteers, 0),
    institutions: RECORDS.reduce((n, r) => n + r.institutions, 0),
    guinness: 7,
    bodies: BODIES.length,
  };

  w.JWRCData = { RECORDS, UPCOMING, STORIES, BODIES, STATS, IS_DEMO: true };
})(window);
