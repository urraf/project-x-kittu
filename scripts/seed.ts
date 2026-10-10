/**
 * Seeds the database with starter content. Safe to run more than once:
 * existing records are never overwritten.
 *
 *   npm run seed
 *   SEED_POSTS_STATUS=draft npm run seed   (seed articles as drafts instead)
 */
import "./load-env";
import mongoose from "mongoose";
import { readFileSync } from "node:fs";
import path from "node:path";
import { connectDB } from "../src/lib/db/connect";
import {
  AdminAccount, AutomationRun, Booking, CaptchaNonce, Comment, EmailLog, Media, MentorSession, Message, Milestone, Post, PostLike, PostView, RateLimit, Review,
  Session, Settings, Student, StudentOtp, TaskLock, Video, Product, Order, Opportunity, University,
} from "../src/lib/models";
import { classifySeries } from "../src/lib/services/youtube";
import { createPost } from "../src/lib/services/posts";
import { ingestRemoteImage, mediaToImage } from "../src/lib/services/media";

type SeedVideo = { youtubeId: string; title: string; description: string; durationSec: number; views: number; publishedAt: string };

const MILESTONES = [
  {
    title: "An engineering student at NSUT",
    period: "2022 – 2026",
    sortDate: "2022-08-01",
    chapter: "Chapter 01 · Beginnings",
    location: "New Delhi, India",
    kind: "education",
    description:
      "Four years at Netaji Subhas University of Technology: assignments, canteen debates and late-night submissions. Somewhere in between, a quiet obsession with research opportunities abroad, and the realisation that nobody around me had a playbook for getting there.",
    highlights: ["B.Tech at NSUT, New Delhi", "Started looking for international research programmes early"],
    videoId: "QLXbrvB0Azs",
  },
  {
    title: "Writing to professors, collecting rejections",
    period: "2024 – 2025",
    sortDate: "2024-10-01",
    chapter: "Chapter 02 · The application",
    location: "New Delhi, India",
    kind: "achievement",
    description:
      "Building a research profile from zero: reading papers, emailing professors in Japan, rewriting motivation letters and learning how programmes like METI actually select students. Most emails went unanswered. The ones that didn't changed everything.",
    highlights: ["Cold-emailed professors in Japan", "Applied through the METI programme", "Accepted for a research internship in 3rd year"],
    videoId: "8l7sYEoKiJU",
  },
  {
    title: "Day one in Japan, and day one of the channel",
    period: "May 2025",
    sortDate: "2025-05-26",
    chapter: "Chapter 03 · Japan",
    location: "Kansai, Japan",
    kind: "travel",
    description:
      "I landed in Japan for a fully funded research internship as a third-year undergrad, and pressed record on my first day. Those early vlogs (the lab, the dorm, a surprise earthquake, deer in Nara) became Life of KittuKun.",
    highlights: ["Fully funded research internship", "First vlogs filmed in Japan", "Dorm life, lab life, Japanese friends"],
    videoId: "tVrtCiCrUB0",
  },
  {
    title: "Turning the playbook into guides",
    period: "Summer 2025",
    sortDate: "2025-06-30",
    chapter: "Chapter 04 · The channel",
    location: "Japan → India",
    kind: "channel",
    description:
      "I shared the full, unfiltered story of how the Japan internship happened, then started breaking down the programmes students kept asking about: METI, OIST, MEXT, Max Planck, EPFL. Some of those guides have now helped tens of thousands of students.",
    highlights: ["“How I Got My Dream Japan Internship” passed 60K views", "Guides on OIST, Max Planck, EPFL and more"],
    videoId: "Q6hwfD3iyLk",
  },
  {
    title: "Placed as an AI engineer",
    period: "December 2025",
    sortDate: "2025-12-04",
    chapter: "Chapter 05 · Placements",
    location: "New Delhi, India",
    kind: "career",
    description:
      "Placement season, with interview rounds, coding prep, rejections and finally an offer. I documented the whole strategy, including the mistakes, for everyone preparing next.",
    highlights: ["Campus placement secured", "Shared the complete placement roadmap"],
    videoId: "OoQ6IhDa9yc",
  },
  {
    title: "A fully funded scholarship to Japan, without MEXT",
    period: "July 2026",
    sortDate: "2026-07-06",
    chapter: "Chapter 06 · Proof",
    location: "Japan",
    kind: "achievement",
    description:
      "MEXT isn't the only door into Japan. I explained exactly how my fully funded scholarship worked, from contacting professors to the documents and the mistakes to avoid, so others could follow the same path.",
    highlights: ["100% funded", "Step-by-step application breakdown"],
    videoId: "0C1Eul-SA6k",
  },
  {
    title: "Goodbye NSUT, hello Lucknow",
    period: "July 2026",
    sortDate: "2026-07-28",
    chapter: "Chapter 07 · New city",
    location: "Delhi → Lucknow",
    kind: "life",
    description:
      "A chaotic, emotional last day at NSUT, then a train from Delhi to Lucknow with everything I owned, to start my first job.",
    highlights: ["Graduated from NSUT", "Moved to Lucknow"],
    videoId: "6dOdrR33KDc",
  },
  {
    title: "First job at HCLTech",
    period: "August 2026 – now",
    sortDate: "2026-07-31",
    chapter: "Chapter 08 · Now",
    location: "Lucknow, India",
    kind: "career",
    description:
      "Day one as a software engineer at HCLTech, plus Lucknow food walks, cricket nights and weekend escapes. The channel keeps going: more scholarships, more internships and more honest stories from the other side of the application.",
    highlights: ["Senior Software Engineer, HCLTech", "20K+ subscribers and growing"],
    videoId: "uvf5xXvIWH8",
  },
];

const POSTS = [
  {
    title: "Cold-emailing professors in Japan: a calm, practical guide",
    category: "Internships",
    tags: ["research internship", "japan", "cold email", "professors"],
    videoId: "Ane1JJOINKg",
    excerpt:
      "Most research internships in Japan start with one email. Here's how to find the right lab, what to write, and how to follow up without being annoying.",
    seo: {
      title: "How to Email Japanese Professors for Research Internships",
      description: "A practical guide for Indian students on finding labs in Japan, writing a cold email professors reply to, and following up the right way.",
    },
    content: `
<p>If you want a research internship in Japan, there's a good chance it starts with an email. Not a portal, not a form: a short message to a professor who has never heard of you. That sounds scary, but it's also the most controllable part of the whole process.</p>
<p>This is the approach I'd recommend to any undergraduate trying it for the first time. It isn't a template to copy word for word. It's a way of thinking about the email so the professor actually wants to reply.</p>
<h2>Start with the lab, not the university</h2>
<p>Students often begin with famous university names. Professors don't care about that. They care whether you understand <strong>their</strong> research. So flip the order:</p>
<ul>
<li>Pick two or three research areas you genuinely enjoy (say, computer vision for robotics, or battery materials).</li>
<li>Search recent papers in that area and note which Japanese labs keep appearing.</li>
<li>Open each lab's website and read the "Research" and "Members" pages. Check whether they host international students or interns.</li>
</ul>
<p>Aim for a shortlist of 15–25 labs. That sounds like a lot, but replies are rare, and that's normal.</p>
<h2>What a good first email looks like</h2>
<p>Keep it short enough to read on a phone. A professor should understand who you are and why you're writing within ten seconds.</p>
<ol>
<li><strong>Subject line:</strong> specific and boring is good. "Prospective research intern: interest in your work on X" beats "Internship request".</li>
<li><strong>Who you are:</strong> one line covering your year, branch and university.</li>
<li><strong>Why this lab:</strong> two or three sentences referencing a specific paper or project, and what about it interests you.</li>
<li><strong>What you bring:</strong> one or two concrete things: a project, a tool you've used, a result.</li>
<li><strong>The ask:</strong> clear and polite. Ask whether they would consider hosting you, and mention any programme you plan to apply through.</li>
</ol>
<p>Attach a one-page CV as a PDF. Don't attach five certificates.</p>
<h2>Mistakes that quietly get you ignored</h2>
<ul>
<li>Sending the same paragraph to every lab with only the name changed. Professors can tell.</li>
<li>Writing "Dear Sir/Madam". Use their name and title.</li>
<li>Long life stories. Save that for the motivation letter.</li>
<li>Emailing at a burst of 50 labs in one night with typos. Slow down; quality wins.</li>
</ul>
<h2>Following up without being annoying</h2>
<p>If you don't hear back in about two weeks, one polite follow-up is completely fine. Reply in the same thread, keep it to three lines, and add one new piece of information if you have it. If there's still no answer, let it go and move on to the next lab. A non-reply is not a judgement on you.</p>
<h2>When a professor says yes</h2>
<p>Ask what the next steps are, which programme or funding route they recommend, and whether they would be willing to provide an acceptance letter. Many fully funded programmes need exactly that letter, so this is the moment the whole process starts moving.</p>
<h2>Before you go</h2>
<p>The students who succeed aren't always the ones with the highest CGPA. Usually they're the ones who sent thoughtful emails, followed up kindly and kept going after the silence. Requirements and programmes change, so always confirm details on official pages, and watch my video on writing research proposals for Japanese professors if you want the next step.</p>`,
  },
  {
    title: "Fully funded doesn't mean MEXT: other routes to study in Japan",
    category: "Scholarships",
    tags: ["japan scholarships", "mext", "fully funded", "study in japan"],
    videoId: "0TevB3fl76k",
    excerpt:
      "MEXT is the famous one, but it isn't the only way into Japan. University scholarships, foundation grants and research programmes can be just as life-changing.",
    seo: {
      title: "Fully Funded Japan Scholarships Beyond MEXT",
      description: "MEXT isn't the only route. Learn the main alternatives for fully funded study and research in Japan and how Indian students can approach them.",
    },
    content: `
<p>Whenever someone says "scholarship in Japan", the next word is almost always MEXT. It's a fantastic programme, but treating it as the <em>only</em> option is one of the biggest mistakes I see students make. If MEXT doesn't work out one year, the dream doesn't have to end there.</p>
<p>Here's a map of the other routes, so you can build a plan with more than one door.</p>
<h2>University-specific scholarships</h2>
<p>Many Japanese universities run their own international programmes, often taught in English, with tuition waivers and monthly stipends. Some are for full degrees (like English-taught bachelor's programmes), others for master's or doctoral study. The selection is usually done by the university itself, which means your fit with a department and a supervisor matters a lot.</p>
<h2>Foundation and corporate scholarships</h2>
<p>Japanese foundations and companies fund students too. Some focus on specific countries or fields, some on undergraduates, some on graduate students. They're less famous, which means fewer applicants. Read eligibility carefully: some must be applied for <strong>after</strong> you're admitted, while others are applied for from India.</p>
<h2>Research internships and exchange programmes</h2>
<p>Not ready for a full degree? Research internships and government-backed exchange programmes can bring you to Japan for a few weeks or months, often with travel and living costs covered. They're also the best way to meet professors who might supervise you later. This is exactly how many students end up returning for a master's.</p>
<h2>How to choose where to apply</h2>
<ul>
<li><strong>Match the level:</strong> bachelor's, master's, research or short-term.</li>
<li><strong>Check the language:</strong> plenty of programmes are fully in English, but some expect Japanese.</li>
<li><strong>Look at who selects:</strong> embassy, university or professor. Each needs a slightly different application strategy.</li>
<li><strong>Stack your chances:</strong> apply to two or three routes in the same cycle rather than betting everything on one.</li>
</ul>
<h2>Building a profile that works for all of them</h2>
<p>The good news is that most Japanese scholarships reward the same things: a clear academic direction, a research or study plan that fits the institution, and evidence that you follow through on projects. If you write one strong research plan, you can adapt it for several applications.</p>
<h2>Before you go</h2>
<p>Deadlines, stipend amounts and eligibility change every year, so treat this as a map and confirm everything on the official pages. If you want specific programme names and how they compare, my video on scholarships other than MEXT goes through them one by one.</p>`,
  },
  {
    title: "Low CGPA and still dreaming of studying abroad? Read this first",
    category: "Career",
    tags: ["cgpa", "study abroad", "profile building", "korea"],
    videoId: "w-uBYrf2sQs",
    excerpt:
      "A low CGPA makes things harder, not impossible. Here's what actually compensates for it, and the mistakes that make it worse.",
    seo: {
      title: "Study Abroad With a Low CGPA: What Actually Helps",
      description: "Honest advice for Indian students with a low CGPA who want international internships or scholarships: what compensates, and what to avoid.",
    },
    content: `
<p>"Bhaiya, my CGPA is 7.1, should I even apply?" I get some version of this message almost every day. The honest answer is that a low CGPA makes some doors harder to open, but it rarely locks all of them.</p>
<p>What matters is understanding <strong>why</strong> grades matter to selectors, and giving them that same confidence in other ways.</p>
<h2>What your CGPA is really telling a selector</h2>
<p>For a professor or committee, grades are a shortcut. They suggest that you can handle coursework, work consistently and finish what you start. If your CGPA is lower, your job is to prove those same three things with different evidence.</p>
<h2>Things that genuinely compensate</h2>
<ul>
<li><strong>A focused project:</strong> one serious project in your target field beats ten tutorial copies.</li>
<li><strong>Research exposure:</strong> assisting a professor at your own college, even informally, shows you can work in a lab.</li>
<li><strong>An upward trend:</strong> if your recent semesters are stronger, say so clearly in your statement.</li>
<li><strong>Strong recommendation letters:</strong> a professor who can describe your work in detail is worth a lot.</li>
<li><strong>Clear writing:</strong> a sharp, specific motivation letter shows maturity grades can't.</li>
</ul>
<h2>Pick programmes that look at the whole profile</h2>
<p>Some scholarships use strict cut-offs; others are far more holistic. Read the eligibility section before you invest time. Where there's a minimum, respect it. Where there isn't, focus on programmes where a professor or interview panel is involved, because that's where your projects and story get a real hearing.</p>
<h2>Mistakes that make it worse</h2>
<ul>
<li>Hiding the CGPA or being vague about it. Address it briefly and move on.</li>
<li>Applying only to the most competitive programmes. Build a balanced list.</li>
<li>Waiting for the "perfect" profile. Applications themselves teach you what to improve.</li>
</ul>
<h2>A simple six-month plan</h2>
<ol>
<li>Month 1: choose a research direction and shortlist programmes with realistic eligibility.</li>
<li>Months 2–4: build one solid project or research contribution, and document it well.</li>
<li>Month 5: request recommendation letters early and give recommenders a summary of your work.</li>
<li>Month 6: write, rewrite and get feedback on your statements before submitting.</li>
</ol>
<h2>Before you go</h2>
<p>Your CGPA is one line on your application. Everything else is still yours to shape. Check each programme's official requirements, and if Korea is on your list, my video on studying there with low grades goes into specific options.</p>`,
  },
];

async function main() {
  const conn = await connectDB();
  console.log(`Connected to ${conn.connection.name}`);

  // Ensure all indexes exist (including the blog text-search index).
  const models = [Post, Media, Video, Milestone, Settings, Message, Session, RateLimit, CaptchaNonce, AutomationRun, Comment, PostLike, PostView, AdminAccount];
  const mentorshipModels = [MentorSession, Student, Booking, Review, StudentOtp, EmailLog, TaskLock, Product, Order, Opportunity, University];
  await Promise.all([...models, ...mentorshipModels].map((m) => m.createIndexes()));
  console.log("✓ Indexes ensured");

  // Videos
  const videos = JSON.parse(readFileSync(path.join(__dirname, "data/videos.json"), "utf8")) as SeedVideo[];
  const res = await Video.bulkWrite(
    videos.map((v) => ({
      updateOne: {
        filter: { youtubeId: v.youtubeId },
        update: {
          $setOnInsert: {
            youtubeId: v.youtubeId,
            title: v.title,
            description: v.description,
            durationSec: v.durationSec,
            views: v.views,
            publishedAt: new Date(v.publishedAt),
            isShort: v.durationSec > 0 && v.durationSec <= 60,
            series: classifySeries(v.title),
            featured: false,
            hidden: false,
            source: "seed" as const,
          },
        },
        upsert: true,
      },
    })),
  );
  console.log(`✓ Videos: ${res.upsertedCount} added, ${videos.length - res.upsertedCount} already present`);

  // Milestones
  if ((await Milestone.countDocuments()) === 0) {
    await Milestone.insertMany(MILESTONES.map((m) => ({ ...m, sortDate: new Date(m.sortDate), published: true })));
    console.log(`✓ Journey: ${MILESTONES.length} milestones added`);
  } else {
    console.log("• Journey: milestones already exist, skipped");
  }

  // Posts
  const status = process.env.SEED_POSTS_STATUS === "draft" ? "draft" : "published";
  let added = 0;
  for (const [i, p] of POSTS.entries()) {
    if (await Post.exists({ title: p.title })) continue;
    let coverImage = null;
    try {
      const media = await ingestRemoteImage(`https://i.ytimg.com/vi/${p.videoId}/maxresdefault.jpg`, {
        originalName: `youtube-${p.videoId}`,
        alt: p.title,
        source: "youtube",
        credit: { name: "Life of KittuKun on YouTube", url: `https://www.youtube.com/watch?v=${p.videoId}` },
      });
      coverImage = mediaToImage(media);
    } catch (e) {
      console.warn(`  (cover download failed for "${p.title}": ${(e as Error).message})`);
    }
    await createPost({
      ...p,
      content: p.content.trim(),
      coverImage,
      status,
      publishedAt: status === "published" ? new Date(Date.now() - (POSTS.length - i) * 4 * 86400_000) : null,
    });
    added++;
  }
  console.log(`✓ Blog: ${added} starter article(s) added as ${status}`);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
