import { z } from "zod";
import { DEFAULT_CATEGORIES } from "@/lib/site";

const str = (max: number) => z.string().trim().max(max);
const url = z.union([z.literal(""), z.string().trim().max(2048).refine((v) => /^(https?:\/\/|\/)/.test(v), "Must be a URL")]);

export const settingsSchema = z.object({
  profile: z.object({
    name: str(80).min(1),
    channelName: str(80).min(1),
    handle: str(60),
    tagline: str(160),
    heroEyebrow: str(120),
    heroTitle: str(160).min(1),
    heroSubtitle: str(500),
    introTitle: str(160),
    shortBio: str(600),
    longBio: str(6000),
    avatarUrl: url,
    portraitUrl: url,
    heroImageUrl: url,
    location: str(80),
    currentRole: str(120),
    quickFacts: z.array(z.object({ label: str(40).min(1), value: str(120).min(1) })).max(10),
    interests: z.array(str(60).min(1)).max(16),
    stats: z.array(z.object({ label: str(40).min(1), value: str(20).min(1) })).max(4),
    principles: z.array(z.object({ title: str(80).min(1), text: str(300) })).max(6),
  }),
  social: z.object({
    youtube: url,
    instagram: url,
    linkedin: url,
    x: url,
    email: z.union([z.literal(""), z.email().max(200)]),
  }),
  ai: z.object({
    niche: str(1500),
    audience: str(1000),
    voice: str(1500),
    guidelines: str(4000),
    topics: z.array(str(200).min(3)).max(80),
    bannedPhrases: z.array(str(60).min(2)).max(60),
    categories: z.array(str(40).min(2)).min(1).max(20),
    minWords: z.number().int().min(300).max(3000),
    maxWords: z.number().int().min(500).max(4000),
  }),
  automation: z.object({
    enabled: z.boolean(),
    publishMode: z.enum(["publish", "draft"]),
    minHoursBetweenRuns: z.number().min(0).max(24 * 30),
    maxPerDay: z.number().int().min(1).max(10),
    coverStrategy: z.enum(["auto", "generated", "video", "unsplash"]),
    /** Write a companion blog post for every new YouTube video. */
    videoPosts: z.boolean(),
  }),
  comments: z.object({
    enabled: z.boolean(),
    requireApproval: z.boolean(),
  }),
  mentorship: z.object({
    enabled: z.boolean(),
    headline: str(160).min(1),
    intro: str(800),
    /** Where booking notifications go. Falls back to the admin login email. */
    notifyEmail: z.union([z.literal(""), z.email().max(200)]),
    /** Sessions/students from before the website, added to the public counters. */
    pastSessions: z.number().int().min(0).max(100000),
    pastStudents: z.number().int().min(0).max(1000000),
    benefits: z.array(str(200).min(1)).max(8),
    faqs: z.array(z.object({ q: str(200).min(1), a: str(800).min(1) })).max(10),
  }),
});

export type SiteSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: SiteSettings = {
  profile: {
    name: "Chitranshu Rajput",
    channelName: "Life of KittuKun",
    handle: "@lifeofkittukun",
    tagline: "International internships, scholarships & life in Japan, told honestly.",
    heroEyebrow: "Engineer · Creator · Explorer",
    heroTitle: "From Delhi to Japan, one application at a time.",
    heroSubtitle:
      "I’m Chitranshu, an engineer who turned a third-year research internship in Japan into a channel that helps students find fully funded internships and scholarships abroad. Here you'll find the guides, the stories and the honest lessons.",
    introTitle: "Hi, I’m Kittu. I document the road I wish someone had mapped for me.",
    shortBio:
      "NSUT Delhi graduate, software engineer at HCLTech, and the person behind Life of KittuKun. I share step-by-step guides for METI, OIST, MEXT, Max Planck, CERN and more, plus vlogs of Japan, food, travel and first-job life.",
    longBio:
      "I was a regular engineering student at NSUT in New Delhi with a big, slightly unrealistic dream: to work on research abroad. Nobody in my circle had a playbook for it, so I built one, one rejected email and one late-night application at a time.\n\nIn my third year, that playbook got me a fully funded research internship in Japan. I started this channel on my first day there, filming everything from the lab to the dorm to deer in Nara. Living there changed how I think about work, discipline and curiosity, and when I came back I kept filming everything I had learned so that the next student wouldn't have to start from zero.\n\nToday Life of KittuKun is a home for honest, practical guides on fully funded internships and scholarships in Japan, Korea and Europe, and for the messier, happier side of life: graduating, moving cities for my first job, food walks in Lucknow and weekend escapes to the mountains.",
    avatarUrl:
      "https://yt3.googleusercontent.com/-hcAv_nrBji5X8T8Mc7ZsS728NH9H_t8FIqXr1OB6HIBbHMDeiGnw49wwvSwNi_0ykZ2y-zz1g=s900-c-k-c0x00ffffff-no-rj",
    portraitUrl: "",
    heroImageUrl: "",
    location: "Lucknow, India",
    currentRole: "Senior Software Engineer at HCLTech",
    quickFacts: [
      { label: "Based in", value: "Lucknow, India" },
      { label: "Currently", value: "Software Engineer, HCLTech" },
      { label: "Studied", value: "NSUT, New Delhi" },
      { label: "Research", value: "Internship in Japan" },
      { label: "Creating since", value: "May 2025, from Japan" },
    ],
    interests: [
      "Fully funded scholarships",
      "Research internships",
      "Japanese culture",
      "Food walks",
      "Mountains & rivers",
      "Career growth",
      "Mentoring students",
    ],
    stats: [
      { value: "20.8K", label: "Subscribers" },
      { value: "170+", label: "Videos" },
      { value: "7", label: "Countries decoded" },
    ],
    principles: [
      { title: "Fully funded is real", text: "Money shouldn't be the reason you never apply. Most of what I cover pays you to go." },
      { title: "Honest over hype", text: "I tell you what the process actually looks like, including the rejections." },
      { title: "Show the work", text: "Templates, timelines and real examples, so you can copy the process, not just the vibe." },
    ],
  },
  social: {
    youtube: "https://www.youtube.com/@lifeofkittukun",
    instagram: "https://www.instagram.com/chitranshu_rajput_/",
    linkedin: "",
    x: "",
    email: "",
  },
  ai: {
    niche:
      "International internships, research programs and fully funded scholarships for Indian students, especially Japan (MEXT, METI, OIST, university-specific scholarships, corporate internships like HENNGE and Woven by Toyota), South Korea (GKS, KAIST, GIST) and Europe (Max Planck, CERN, EPFL, ETH Zurich, ISTA, MAECI Italy, WIPO). Also career growth for engineering students, placements, and honest student life and travel stories.",
    audience:
      "Indian undergraduate and master's students, mostly engineering and science, who dream of studying or interning abroad but don't know where to start. Many worry about low CGPA, money, cold-emailing professors and making an application stand out.",
    voice:
      "Write as Chitranshu (KittuKun): a warm, honest older-brother voice. Conversational, specific and calm, never salesy. Use first person when sharing perspective ('when I applied…', 'what I tell juniors…') without inventing specific personal events. Short paragraphs, plain words, occasional light humour.",
    guidelines:
      "- Lead with the reader's real question in the first two sentences. No throat-clearing intros.\n- Give concrete, actionable steps, checklists and examples (e.g. what a good cold email or motivation-letter paragraph looks like).\n- Never invent exact deadlines, stipend amounts, acceptance rates or dates. Describe typical patterns and tell readers to confirm on the official website.\n- Mention common mistakes and how to avoid them.\n- Use H2 and H3 headings, short paragraphs, and lists only where they genuinely help.\n- End with a short, human closing paragraph and a gentle nudge to watch the related video or ask questions in the comments. Do not use the heading 'Conclusion'.\n- Indian context matters: CGPA, rupees, Indian universities, visa realities.",
    topics: [
      "How to write a research proposal that Japanese professors actually reply to",
      "METI Japan internship: the full application, explained step by step",
      "OIST research internship: who gets selected and why",
      "MEXT university recommendation vs embassy recommendation",
      "Fully funded Japan scholarships that are not MEXT",
      "Max Planck summer internships: finding a lab and writing to a PI",
      "CERN summer student programme for Indian engineering students",
      "Studying in South Korea with an average CGPA",
      "GKS vs KAIST vs GIST scholarships: choosing the right Korean route",
      "How to cold-email professors for research internships",
      "Writing a motivation letter that doesn't sound like everyone else's",
      "Building a research profile from a tier-2 college",
      "Budgeting for your first month as an intern in Japan",
      "What daily life as a research intern in Japan really looks like",
      "Low CGPA? How to still build a strong international application",
      "EPFL and ETH Zurich summer research fellowships: an honest guide",
      "Japanese corporate internships for Indian students (HENNGE, Woven and more)",
      "Recommendation letters: how to ask professors and what to give them",
      "From campus placements to your first job: lessons from my first months",
      "Learning basic Japanese before your internship: what actually helps",
    ],
    bannedPhrases: [
      "delve",
      "in today's fast-paced world",
      "tapestry",
      "game-changer",
      "unlock the power",
      "navigate the complexities",
      "in conclusion",
      "embark on a journey",
      "it's important to note",
      "realm",
      "look no further",
      "testament to",
      "ever-evolving",
      "seamless",
    ],
    categories: [...DEFAULT_CATEGORIES],
    minWords: 1100,
    maxWords: 1800,
  },
  automation: {
    enabled: true,
    publishMode: "publish",
    minHoursBetweenRuns: 20,
    maxPerDay: 1,
    coverStrategy: "auto",
    videoPosts: true,
  },
  comments: {
    enabled: true,
    requireApproval: false,
  },
  mentorship: {
    enabled: true,
    headline: "Get guidance from someone who's done it.",
    intro:
      "Live group sessions on international internships, fully funded scholarships and building a profile that gets noticed. Bring your questions: we go through applications, timelines and real examples together.",
    notifyEmail: "",
    pastSessions: 0,
    pastStudents: 0,
    benefits: [
      "A clear plan for your target programmes (Japan, Korea, Europe)",
      "How to cold-email professors and write a strong research proposal",
      "Motivation letter and CV feedback patterns that actually help",
      "Honest answers about funding, timelines and low CGPA",
    ],
    faqs: [
      { q: "How do I join the session?", a: "You'll get the meeting link by email right after booking, and again 1 hour before the session. It's also in your account." },
      { q: "Is it a group session?", a: "Yes. Each session is a small live group, so you also hear other students' questions. There's time for everyone." },
      { q: "Can I get a refund?", a: "If the session is cancelled, you'll get a full refund. For anything else, reply to your confirmation email and we'll help." },
    ],
  },
};
