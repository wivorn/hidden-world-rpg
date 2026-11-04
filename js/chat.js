// Keyword-driven NPC reactions to what the player types.

// First match wins, so more specific topics come first.
const TOPICS = [
  ['follow', /\b(follow me|come with me|come along|join me|let'?s go)\b/],
  ['stop', /\b(stop|stay|wait|go home|leave me)\b/],
  ['insult', /\b(stupid|idiot|dumb|ugly|hate you|shut up|smelly?|loser|fool|moron)\b/],
  ['love', /\b(love|beautiful|pretty|cute|handsome|marry|like you)\b/],
  ['thanks', /\b(thanks|thank you|thx|ty|cheers)\b/],
  ['bye', /\b(bye|goodbye|farewell|see you|see ya|later|good ?night)\b/],
  ['name', /\b(who are you|your name|who r u)\b/],
  ['mood', /\b(how are you|how'?s it going|how are things|you ok|how do you do)\b/],
  ['joke', /\b(joke|funny|make me laugh)\b/],
  ['dance', /\b(dance|dancing|party|celebrate)\b/],
  ['egg', /\b(eggs?|ruins?|ancient|towers?|nest|baby|hatch\w*)\b/],
  ['dragon', /\b(dragons?|wyvern|fly|flying)\b/],
  ['ship', /\b(ship|boat|sail|sailing|sea|ocean|islands?|longship|swim|swimming)\b/],
  ['forge', /\b(swords?|axes?|hammer|forge|weapons?|armou?r|shields?|anvil)\b/],
  ['food', /\b(bread|food|hungry|eat|buy|sell|trade|gold|coins?|shop)\b/],
  ['sheep', /\b(sheep|lamb|wool)\b/],
  ['fish', /\b(fish|fishing|catch)\b/],
  ['help', /\b(help|quest|what should i do|what do i do|bored|adventure|explore)\b/],
  ['greet', /\b(hi|hello|hey|hiya|hail|greetings|yo|howdy|morning|good day|sup)\b/],
];

const TOPIC_EMOTES = {
  follow: 'exclaim', stop: 'dots', insult: 'angry', love: 'heart', thanks: 'heart', bye: 'note',
  name: 'smile', mood: 'smile', joke: 'smile', dance: 'note', egg: 'exclaim', eggFound: 'exclaim', hatched: 'heart', grown: 'exclaim',
  dragon: 'exclaim', ship: 'dots',
  forge: 'dots', food: 'dots', sheep: 'question', fish: 'dots', help: 'dots', greet: 'exclaim',
  question: 'question', other: 'question',
};

const NPC_NAMES = {
  chief: /\b(chief|elder)\b/,
  smith: /\b(smith|blacksmith)\b/,
  merchant: /\b(merchant|baker|shopkeeper)\b/,
  kid: /\b(kid|boy)\b/,
  girl: /\b(girl|lass)\b/,
  archer: /\b(archer|hunter)\b/,
  guard: /\b(guard|soldier)\b/,
  villager: /\b(villager|farmer|shepherd)\b/,
  fisher: /\b(fisher|fisherman|sailor)\b/,
  hermit: /\b(hermit|old man)\b/,
};

const REPLIES = {
  default: {
    follow: ['Lead the way!', 'Right behind you.'],
    stop: ['Alright, I\'ll stay here.', 'As you wish.'],
    insult: ['How rude!', 'Watch your tongue!'],
    love: ['Oh! Well... thank you.', 'You flatter me.'],
    thanks: ['Any time.', 'You\'re welcome!'],
    bye: ['Safe travels!', 'Farewell, {name}.'],
    name: ['Just a humble villager.'],
    mood: ['Can\'t complain!', 'Well enough, thank you.'],
    joke: ['Why did the Viking cross the sea? To raid the other side!'],
    dance: ['Ha! Look at me go!'],
    egg: ['A dragon egg? The hermit on the north-east isle knows more.', 'Ancient ruins? Ask the old hermit.'],
    eggFound: ['Eggs like warmth. Try the fire in the plaza!', 'A real dragon egg! Keep it warm by the fire.'],
    hatched: ['What a sweet little dragon!', 'It follows you everywhere!', 'It has your eyes. ...Sort of.', 'Little dragons are always hungry. I hear they love fish.'],
    grown: ['That dragon is enormous!', 'Is it true you can ride it?', 'Please ask it not to eat my sheep.'],
    dragon: ['Dragons? Haven\'t seen one in years.', 'The old hermit tells tales of dragons.'],
    ship: ['The longship is down at the east docks.', 'The sea goes on forever out there.'],
    forge: ['The smith can help you with that.'],
    food: ['The merchant sells fresh bread by the west road.'],
    sheep: ['The sheep are in the pen by the great hall.'],
    fish: ['The fisher knows all about that.'],
    help: ['Sail the sea, explore the islands... the world is yours!', 'Talk to the chief by the great hall.'],
    greet: ['Hello there!', 'Hail, {name}!', 'Good day!'],
    question: ['Hmm, couldn\'t say.', 'Good question...', 'Who knows?'],
    other: ['Hm?', 'Is that so?', 'Interesting...', 'Aye.'],
  },
  chief: {
    name: ['I am the chief of this village.'],
    greet: ['Welcome back, {name}.', 'Ah, young {name}.'],
    help: ['Every island hides a story. Go and find them.', 'Seek the rune stones on the south-west isle.'],
    insult: ['I have weathered worse storms than you, child.'],
    dragon: ['Long ago, dragons flew beside our people.'],
    eggFound: ['A dragon egg! Set it by the plaza fire, {name}.'],
    hatched: ['A new dragon in our village! This is a great day.'],
    grown: ['Long ago our ancestors flew on dragons. Now you will too, {name}.'],
    joke: ['I am too old for jokes. ...Fine. Two Vikings walk into a hall. The third ducks.'],
    follow: ['My place is by the great hall.'],
    mood: ['My bones ache, but my heart is full.'],
  },
  smith: {
    name: ['Smith. I make things out of hot metal.'],
    greet: ['Oi.', 'Mind the sparks!'],
    forge: ['Finest blades this side of the sea!', 'Hand-forged, every one.'],
    insult: ['Say that again near my hammer.'],
    love: ['Bah! Go on with you.'],
    joke: ['A sword walks into a forge. Comes out sharper. ...That\'s it.'],
    mood: ['Hot. Always hot.'],
    other: ['Hmph.', 'Busy here.', 'Aye, aye.'],
  },
  merchant: {
    name: ['I sell the best bread in the village!'],
    greet: ['Welcome! Fresh bread!', 'Hello, dear!'],
    food: ['Bread, two coins! Honey cake, three!', 'Baked this morning!'],
    follow: ['And leave my stall? Never!'],
    insult: ['No bread for you!'],
    thanks: ['Come back soon!'],
    other: ['Bread?', 'Fancy some bread?'],
  },
  kid: {
    name: ['I\'m gonna be a dragon rider one day!'],
    greet: ['{name}! {name}! Hi!', 'Hiiii!'],
    dragon: ['I wish I had a dragon!', 'Dragons are the coolest!'],
    egg: ['A DRAGON EGG?! Where?! Can I see?!', 'If it hatches, can I name it?'],
    eggFound: ['Put it by the fire! Eggs need to be warm!', 'Is it hatching yet? Is it? Is it?'],
    hatched: ['It\'s SO cute! Can I pet it?', '{dragon}! That\'s the best name EVER!', 'Is {dragon} getting bigger? I think it\'s getting bigger!'],
    grown: ['{dragon} is HUGE now!', 'Take me flying! Pleeease!'],
    follow: ['Yay! An adventure!', 'Wait for me!'],
    dance: ['Wheee!'],
    joke: ['What do dragons eat? Fire-flakes! Hahaha!'],
    insult: ['I\'m telling the chief!'],
    stop: ['Awww...'],
    other: ['Whoa!', 'Cool!', 'Huh?'],
    question: ['I dunno!', 'Ask a grown-up!'],
  },
  girl: {
    name: ['I watch the clouds and dream of flying.'],
    greet: ['Oh, hello!', 'Hi, {name}!'],
    dragon: ['Lovely day for flying, isn\'t it?', 'Take me up there one day?'],
    love: ['Oh my! *blushes*', '{name}! You\'re sweet.'],
    dance: ['La la la~'],
    mood: ['Wonderful! Look at that sky!'],
    follow: ['Where are we going?'],
  },
  archer: {
    name: ['Best shot in the village.'],
    greet: ['Shh...', 'Quiet, please.'],
    follow: ['Can\'t. Practising.'],
    insult: ['I never miss, you know.'],
    joke: ['...Shh.'],
    dance: ['Absolutely not.'],
    other: ['Shh... I\'m aiming.', 'You made me miss.'],
  },
  guard: {
    name: ['Guard of the southern gate.'],
    greet: ['Halt! ...Oh, it\'s you.', '{name}.'],
    follow: ['I cannot leave my post.'],
    help: ['Stay close to the village.', 'The cliffs are steep. Mind your step.'],
    insult: ['Move along.', 'Careful.'],
    dance: ['Not on duty.'],
    ship: ['Some jump off the cliffs and swim. Fools.'],
    other: ['Move along.', 'Hmm.'],
  },
  villager: {
    name: ['The village shepherd, at your service.'],
    greet: ['Hello! Come and see my sheep!'],
    sheep: ['Fluffy, white, goes baa. They\'re in the pen!', 'I count them every night. Puts me right to sleep.'],
    help: ['Go and give my sheep a pat. They love it!'],
    follow: ['I can\'t leave my sheep!'],
    other: ['Lovely sheep, aren\'t they?', 'Baa? ...Sorry, habit.'],
  },
  fisher: {
    name: ['I\'ve sailed every wave around here.'],
    greet: ['Ahoy!', 'Ahoy there, {name}!'],
    ship: ['She\'s yours to sail. Mind the rocks!', 'Hold Shift for full sail!'],
    fish: ['Biggest catch? A fish as long as the longship!', 'The deep water is where the big ones hide.'],
    help: ['Sail north-east. There\'s an old hermit out there.'],
    hatched: ['{dragon} keeps eyeing my fish! Sail over a school and whistle (F), it\'ll dive right in.', 'Dragons and fishermen, we both love the open sea.'],
    grown: ['It ate its fill out there. Mighty beast now!'],
    joke: ['What\'s a pirate\'s favourite letter? The sea!'],
    bye: ['Fair winds!'],
  },
  hermit: {
    name: ['A name? I left that on the mainland long ago.'],
    greet: ['A visitor... how rare.', 'Few sail this far out...'],
    egg: [
      'In the ancient ruin to the south-west, a dragon egg rests among the stone towers.',
      'The egg is warm... it has waited a long time for someone kind.',
      'Look for the circle of glowing stone towers. The egg sleeps in the middle.',
    ],
    eggFound: ['You found it! Warm it by the fire in your village.', 'Hold it close. Fire will wake it.'],
    hatched: [
      'A dragon of your very own. Be kind to it.',
      'Young dragons grow strong on fish from the open sea.',
      'Other eggs sleep on the sandy isles... north-west, south-east, and a speck of sand far to the south.',
    ],
    grown: [
      'It has grown into a true dragon. The skies are yours.',
      'A grown dragon keeps to its island. Ask it to follow, and it will.',
      'Other eggs sleep on the sandy isles... north-west, south-east, and a speck of sand far to the south.',
    ],
    dragon: ['Dragons... I once saw an egg in the ancient ruin, far to the south-west.'],
    help: ['Sail south-west to the ancient ruin. Something special waits there...', 'A dragon egg sleeps among the stone towers.'],
    ship: ['The sea brought you. It will take you back.'],
    follow: ['My feet are rooted here.'],
    dance: ['Heh. Once, long ago...'],
    mood: ['Peaceful. Lonely. Both.'],
    other: ['Hmm...', 'The wind whispers... of a dragon egg.', 'Indeed...'],
    question: ['Ask me about the ancient ruin...', 'The stone towers hold the answer.'],
  },
};

const lastReply = new Map();

function chatTopic(text) {
  const t = text.toLowerCase();
  for (const [id, re] of TOPICS) if (re.test(t)) return id;
  return t.trim().endsWith('?') ? 'question' : 'other';
}

function addresses(lookId, text) {
  const re = NPC_NAMES[lookId];
  return !!re && re.test(text.toLowerCase());
}

function npcReply(lookId, topic) {
  const lines = (REPLIES[lookId] && REPLIES[lookId][topic]) || REPLIES.default[topic];
  const key = lookId + topic;
  let i = Math.floor(Math.random() * lines.length);
  if (lines.length > 1 && i === lastReply.get(key)) i = (i + 1) % lines.length;
  lastReply.set(key, i);
  return lines[i];
}
