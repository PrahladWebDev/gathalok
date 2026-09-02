const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Story = require('../models/Story');
const { Achievement } = require('../models/index');

const MONGODB_URI = process.env.MONGODB_URI;

// NOTE: Categories are hardcoded in backend/utils/categories.js — they are
// NOT seeded into the database. Stories simply store a category slug.

const achievements = [
  { key: 'first_read',     title: 'First Tale',           description: 'Read your first story',           icon: '📖', xpValue: 5,   condition: { type: 'stories_read',       threshold: 1 } },
  { key: 'read_10',        title: 'Story Seeker',         description: 'Read 10 stories',                 icon: '🔍', xpValue: 15,  condition: { type: 'stories_read',       threshold: 10 } },
  { key: 'read_50',        title: 'Myth Keeper',          description: 'Read 50 stories',                 icon: '🗺️', xpValue: 50,  condition: { type: 'stories_read',       threshold: 50 } },
  { key: 'read_100',       title: 'Legend Archivist',     description: 'Read 100 stories',                icon: '🏛️', xpValue: 100, condition: { type: 'stories_read',       threshold: 100 } },
  { key: 'explore_5',      title: 'World Wanderer',       description: 'Explore stories from 5 countries', icon: '🧭', xpValue: 20,  condition: { type: 'countries_explored', threshold: 5 } },
  { key: 'explore_10',     title: 'Global Yatri',         description: 'Explore 10 countries',            icon: '🗺️', xpValue: 60,  condition: { type: 'countries_explored', threshold: 10 } },
  { key: 'explore_all',    title: 'World Explorer',       description: 'Stories from every country',      icon: '🌍', xpValue: 200, condition: { type: 'countries_explored', threshold: 20 } },
  { key: 'first_story',    title: 'Voice of the Past',    description: 'Submit your first story',         icon: '✍️', xpValue: 25,  condition: { type: 'stories_written',    threshold: 1 } },
  { key: 'write_10',       title: 'Story Weaver',         description: 'Submit 10 stories',               icon: '🕸️', xpValue: 75,  condition: { type: 'stories_written',    threshold: 10 } },
  { key: 'likes_100',      title: 'Beloved Narrator',     description: 'Receive 100 likes',               icon: '❤️', xpValue: 50,  condition: { type: 'likes_received',     threshold: 100 } },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing
    await Promise.all([
      User.deleteMany({}),
      Story.deleteMany({}),
      Achievement.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Seed achievements
    await Achievement.insertMany(achievements);
    console.log(`✅ Seeded ${achievements.length} achievements`);

    // Seed users
    const adminUser = await User.create({
      name: 'Admin',
      username: 'admin',
      email: 'admin@gathalok.com',
      password: 'Admin@123',
      role: 'admin',
      bio: 'GathaLok platform administrator.',
    });

    const contributor = await User.create({
      name: 'Arjun Sharma',
      username: 'arjunsharma',
      email: 'arjun@gathalok.com',
      password: 'User@123',
      role: 'contributor',
      bio: 'Folklore researcher passionate about preserving oral traditions.',
      country: 'India',
      storiesWritten: 3,
    });

    const user1 = await User.create({
      name: 'Priya Nair',
      username: 'priyanair',
      email: 'priya@gathalok.com',
      password: 'User@123',
      role: 'user',
      bio: 'Fascinated by world mythology and folklore.',
      country: 'India',
      storiesRead: 12,
    });

    console.log('✅ Seeded 3 users');

    // Seed stories
    const stories = [
      {
        title: 'Bhangarh Fort: India\'s Most Haunted Place',
        alternativeNames: ['Bhangad', 'The Cursed Citadel'],
        country: 'India',
        category: 'cursed-places',
        shortDescription: 'A 17th-century fort abandoned after a sorcerer\'s curse, where no one dares stay past sunset — not even the government allows overnight stays.',
        fullStory: `Built in 1573 by Bhagwant Das for his son Madho Singh, Bhangarh Fort stands as a magnificent ruin in the Aravalli Hills of Rajasthan, India. But beneath its historical grandeur lies a chilling legend that has made it one of the most feared places in the country.

The most popular legend revolves around Singhia, a powerful tantric who fell hopelessly in love with the beautiful Princess Ratnavati of Bhangarh. Knowing he could never win her heart through normal means, Singhia decided to use black magic. He cast a spell on the perfumed oil the princess had purchased, hoping it would make her fall under his control.

However, the princess was wise and sensed the dark enchantment. She threw the oil onto a large boulder nearby, which immediately began to roll toward Singhia, crushing him to death. But before he died, the sorcerer uttered a terrible curse: that Bhangarh would be destroyed and all its inhabitants would die, doomed to walk the earth as restless spirits unable to be reborn.

Shortly after, a battle broke out. The entire population of Bhangarh — including Princess Ratnavati — was killed. The fort was abandoned, and no one has ever successfully settled there since.

The Archaeological Survey of India has placed an unusual warning board at the fort's entrance: "Staying after sunset is strictly prohibited." Local villagers refuse to build homes taller than the ruins, believing the spirits will punish them.

Visitors report hearing unexplained sounds, experiencing cold spots, and seeing shadowy figures near the ancient temples within the fort grounds. Paranormal investigators from around the world have documented equipment malfunctions and unexplained temperature anomalies.`,
        origin: 'The legend dates to 1573 CE during the reign of Madho Singh, son of Raja Bhagwant Das of the Kachwaha clan.',
        significance: 'Bhangarh remains one of the few places officially acknowledged by the government as paranormally active.',
        tags: ['bhangarh', 'fort', 'haunted', 'india', 'ghost', 'curse', 'princess', 'tantric'],
        contributor: contributor._id,
        status: 'approved',
        isFeatured: true,
        views: 8420,
        averageRating: 4.7,
        totalRatings: 243,
      },
      {
        title: 'Nale Ba: The Ghost Who Calls Your Name',
        alternativeNames: ['Come Tomorrow', 'Nale Baa'],
        country: 'India',
        category: 'ghost-stories',
        shortDescription: 'In 1990s Bangalore, people wrote "Nale Ba" (Come Tomorrow) on their doors to ward off a female ghost who killed anyone who answered her knock at night.',
        fullStory: `In the early 1990s, a mass hysteria gripped Bangalore that remains one of the most fascinating episodes of collective folklore in modern India. The legend of "Nale Ba" — Kannada for "Come Tomorrow" — spread through the city like wildfire, prompting thousands of households to scrawl these two words on their doors.

The legend spoke of a female ghost — described as a witch or churel — who roamed residential areas at night. She would knock on doors and call out in the voice of a loved one: a mother, sister, or wife. If anyone inside answered or opened the door, they would be struck dead before dawn.

But she was bound by rules, as all powerful spirits are. If she saw the words "Nale Ba" written on the door, she was compelled to come back the following night — and the night after that — forever postponing her deadly visit.

The rumor spread faster than any newspaper headline. Chalk inscriptions appeared on walls, doors, and gates across Bangalore, Mysore, and surrounding towns. Even educated, urban households participated — not because they truly believed, but because the price of skepticism felt too high.

Folklorists who studied the phenomenon noted it mirrored ancient apotropaic traditions — the use of written words to ward off evil — found across many world cultures.`,
        origin: 'The Nale Ba phenomenon emerged circa 1990-1995 in Bangalore, India. Its exact origin is unknown — a true example of communal folklore creation.',
        significance: 'Nale Ba represents one of India\'s most documented cases of urban folklore panic.',
        tags: ['nale ba', 'bangalore', 'india', 'ghost', 'witch', 'churel', '1990s', 'urban legend'],
        contributor: contributor._id,
        status: 'approved',
        isFeatured: true,
        views: 6240,
        averageRating: 4.5,
        totalRatings: 187,
      },
      {
        title: 'Vetala: The Undead Storyteller of Ancient India',
        alternativeNames: ['Baital', 'Vetal', 'Vetala of Vikramaditya'],
        country: 'India',
        category: 'mythological-creatures',
        shortDescription: 'An ancient undead being that inhabits corpses, the Vetala tested King Vikramaditya\'s wisdom through 25 riddles across Indian mythology\'s most beloved puzzle tales.',
        fullStory: `In the treasury of Sanskrit literature, few figures are as philosophically rich as the Vetala — a supernatural entity that occupies the bodies of the recently deceased, animating them with its ancient consciousness.

Unlike demons that seek destruction, the Vetala occupies a unique space: it is a keeper of knowledge, a tester of wisdom, and a deeply ambivalent force in the moral universe.

The most famous appearance of the Vetala comes in the Baital Pachisi — the Twenty-Five Tales of the Undead — a collection attributed to the court of the legendary King Vikramaditya of Ujjain. A tantric sage sends Vikramaditya on an impossible task: retrieve a Vetala hanging from a tree in a cremation ground and bring it back without speaking.

But the Vetala is the greatest storyteller of the underworld. Each time Vikramaditya carries it, the Vetala tells a story ending with a moral riddle. If the king knows the answer and remains silent, his head will shatter. So Vikramaditya must answer — and the moment he does, the Vetala flies back to its tree. This cycle repeats through 24 tales.

In these stories, the Vetala probes the deepest questions: Who truly loves? Who deserves justice? What makes a decision righteous? Its tales are sophisticated moral philosophy disguised as horror.`,
        origin: 'The Vetala appears in ancient Sanskrit texts including the Kathāsaritsāgara, compiled in the 11th century CE by Somadeva.',
        significance: 'The Vetala represents a sophisticated philosophical tradition within Indian horror folklore.',
        tags: ['vetala', 'baital', 'vikramaditya', 'ujjain', 'undead', 'sanskrit', 'mythology', 'riddles'],
        contributor: adminUser._id,
        status: 'approved',
        isFeatured: true,
        views: 5180,
        averageRating: 4.8,
        totalRatings: 156,
      },
      {
        title: 'The Banshee: Ireland\'s Wailing Death Omen',
        alternativeNames: ['Bean Sí', 'The Washer at the Ford'],
        country: 'Ireland',
        category: 'folk-tales',
        shortDescription: 'A spectral woman whose mournful wail is said to foretell the death of a family member — one of Ireland\'s oldest and most feared supernatural traditions.',
        fullStory: `Long before written history, Irish families spoke in hushed tones of the banshee — a fairy woman whose keening cry pierces the night to announce that death is near.

The banshee is said to attach herself to certain old Irish families, appearing — or rather, being heard — whenever a member of that bloodline is about to die. Her cry, the caoineadh, is described as a mixture of mourning song and animal howl, impossible to mistake for anything human.

Some traditions describe her as a beautiful young woman with long, flowing hair, dressed in grey or white, combing her hair with a silver comb. Others describe her as a withered old hag, her eyes red and swollen from centuries of grieving. Regional variations across Ireland gave rise to different forms, including the Washer at the Ford, who is seen rinsing bloodstained burial garments in a river the night before a death.

Even today, the banshee remains one of Ireland's most enduring folk figures, kept alive through oral storytelling, literature, and a lingering cultural unease about unexplained cries on quiet rural nights.`,
        origin: 'Banshee folklore traces back over a thousand years in Irish oral tradition, with the earliest written references appearing in medieval texts.',
        significance: 'The banshee reflects deep Irish cultural attitudes toward death, family lineage, and mourning rituals.',
        tags: ['banshee', 'ireland', 'death omen', 'folklore', 'fairy', 'keening'],
        contributor: adminUser._id,
        status: 'approved',
        views: 3120,
        averageRating: 4.4,
        totalRatings: 88,
      },
      {
        title: 'La Llorona: The Weeping Woman of Mexico',
        alternativeNames: ['The Weeping Woman'],
        country: 'Mexico',
        category: 'ghost-stories',
        shortDescription: 'A grief-stricken ghost wanders riverbanks at night searching for the children she drowned, her mournful cries warning of danger to anyone who hears them.',
        fullStory: `Across Mexico and much of Latin America, parents have long warned children not to wander near rivers after dark — for fear of La Llorona, the Weeping Woman.

According to the most common version of the legend, a beautiful woman named Maria fell in love with a man who eventually abandoned her and their two children for another woman. In a fit of grief and rage, Maria drowned her children in a river, only to be consumed by immediate and eternal regret. She drowned herself shortly after, but legend says she was denied entry into the afterlife until she found her children.

Ever since, her spirit roams riverbanks, lakes, and waterways at night, dressed in white, wailing "¡Ay, mis hijos!" ("Oh, my children!"). Those who hear her cries are said to be in danger — some traditions hold that she mistakes other children for her own and tries to take them, while others say merely hearing her cry is an omen of misfortune.

La Llorona has become one of the most widespread legends in Mexican and broader Latin American culture, appearing in literature, film, and oral tradition across generations.`,
        origin: 'La Llorona folklore dates back to colonial-era Mexico, with roots possibly tracing to pre-Columbian goddess myths.',
        significance: 'The legend serves as both a cautionary tale for children and a reflection on grief, betrayal, and motherhood.',
        tags: ['la llorona', 'mexico', 'ghost', 'weeping woman', 'folklore', 'river'],
        contributor: contributor._id,
        status: 'approved',
        isFeatured: true,
        views: 9820,
        averageRating: 4.9,
        totalRatings: 312,
      },
    ];

    const createdStories = [];
    for (const s of stories) {
      const doc = await Story.create(s);
      createdStories.push(doc);
    }
    console.log(`✅ Seeded ${createdStories.length} stories`);

    console.log('\n🎉 Seed complete!');
    console.log('─────────────────────────────────────────');
    console.log('Admin Login:       admin@gathalok.com / Admin@123');
    console.log('Contributor Login: arjun@gathalok.com / User@123');
    console.log('User Login:        priya@gathalok.com / User@123');
    console.log('─────────────────────────────────────────');

  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

seed();
