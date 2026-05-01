// ============================================================================
// CONDITION WATCHLISTS — "Things to watch for" library
//
// Hand-curated, plain-language summaries of what caregivers commonly look for
// across the most prevalent chronic conditions. Each entry pairs a symptom
// with a one-line explanation of why it matters, framed as a thoughtful
// nurse explaining things — never alarmist.
//
// Source notes:
//   • Composite of public caregiver-facing summaries from Mayo Clinic,
//     NIH/NIA, the Alzheimer's Association, the American Heart Association,
//     COPD Foundation, NAMI, and Parkinson's Foundation. Phrasing is
//     paraphrased so nothing reads like clinical guidance.
//   • Severity tags ship as "watch" across the board pending clinical
//     review, per the Prompt 4 Phase 1 stop condition: "Get clinical review
//     before ship if possible — otherwise, ship with all severity tags as
//     WATCH (no urgent flagging) until reviewed." When a clinician reviews
//     the list, individual items can be re-tagged in this file.
//   • The list is bundled with the app — updates require a release.
//
// ============================================================================

export type WatchSeverity = 'urgent' | 'concerning' | 'watch';

export interface WatchItem {
  symptom: string;
  whyItMatters: string;
  severity: WatchSeverity;
}

export interface ConditionWatchlist {
  conditionId: string;
  displayName: string;
  /** Free-text aliases people commonly type for this condition. */
  aliases: string[];
  watchFor: WatchItem[];
}

/**
 * The default severity for every entry until clinical review. Defined here
 * so the floor is easy to lift item-by-item (or globally) once review lands.
 */
const DEFAULT_SEVERITY: WatchSeverity = 'watch';

const w = (symptom: string, whyItMatters: string): WatchItem => ({
  symptom,
  whyItMatters,
  severity: DEFAULT_SEVERITY,
});

export const CONDITION_WATCHLISTS: ConditionWatchlist[] = [
  {
    conditionId: 'hypertension',
    displayName: 'Hypertension',
    aliases: ['high blood pressure', 'htn'],
    watchFor: [
      w(
        'New or worsening headaches',
        'Sudden or persistent headaches can be the body signaling pressure changes — worth flagging if they cluster.',
      ),
      w(
        'Dizziness or lightheadedness',
        'Especially when standing up; can mean pressure is dipping too low or too high between readings.',
      ),
      w(
        'Swelling in feet or ankles',
        'New puffiness can hint at fluid balance shifts that the heart and kidneys are managing.',
      ),
      w(
        'Shortness of breath at rest',
        'Breathing harder while sitting still is a change worth mentioning at the next visit.',
      ),
    ],
  },
  {
    conditionId: 'type_2_diabetes',
    displayName: 'Type 2 diabetes',
    aliases: ['type ii diabetes', 'diabetes type 2', 'diabetes'],
    watchFor: [
      w(
        'Frequent thirst or urination',
        'A pattern shift here often shows up before glucose readings drift — useful early signal.',
      ),
      w(
        'Slow-healing cuts or sores',
        'Skin and circulation are sensitive to glucose levels; sores that linger are worth a check-in.',
      ),
      w(
        'Tingling or numbness in hands or feet',
        'Nerves can quietly be affected; new sensations are worth tracking even when mild.',
      ),
      w(
        'Sudden fatigue or shakiness',
        'Especially before meals — can mean blood sugar is dipping low between doses.',
      ),
    ],
  },
  {
    conditionId: 'dementia',
    displayName: 'Dementia',
    aliases: ["alzheimer's", 'alzheimers', 'alzheimer disease', 'memory loss'],
    watchFor: [
      w(
        'New confusion about familiar places or people',
        'A noticeable jump (not gradual drift) is information clinicians care about.',
      ),
      w(
        'Changes in sleep patterns',
        'Day-night flips and increased nighttime wandering are common and worth noting.',
      ),
      w(
        'Withdrawal from things they used to enjoy',
        'Quiet pulling-back can show up before bigger changes do.',
      ),
      w(
        'Trouble swallowing or appetite changes',
        'These can affect medication and nutrition — a heads-up for the care team helps.',
      ),
    ],
  },
  {
    conditionId: 'congestive_heart_failure',
    displayName: 'Congestive heart failure',
    aliases: ['heart failure', 'chf'],
    watchFor: [
      w(
        'Sudden weight gain (more than 2-3 lbs in a few days)',
        'A common early sign of fluid building up — worth flagging promptly.',
      ),
      w(
        'Shortness of breath when lying flat',
        'Needing more pillows to breathe comfortably is information clinicians use.',
      ),
      w(
        'Swelling in legs, ankles, or belly',
        'New or worsening swelling tracks with fluid status.',
      ),
      w(
        'Persistent dry cough or wheezing',
        'Especially at night — can be lungs reacting to fluid balance shifts.',
      ),
    ],
  },
  {
    conditionId: 'copd',
    displayName: 'COPD',
    aliases: ['chronic obstructive pulmonary disease', 'emphysema', 'chronic bronchitis'],
    watchFor: [
      w(
        'Increased shortness of breath at rest',
        'Compared to their usual baseline — even small changes can mean a flare-up is brewing.',
      ),
      w(
        'Change in mucus color, thickness, or amount',
        'Yellow, green, or unusually thick mucus can be the start of an infection.',
      ),
      w(
        'New use of "rescue" inhaler more often',
        'A jump in how often they reach for it tells the care team symptoms are escalating.',
      ),
      w(
        'Confusion or unusual sleepiness',
        'Can be a sign that oxygen levels are dropping; worth a same-day check.',
      ),
    ],
  },
  {
    conditionId: 'depression',
    displayName: 'Depression',
    aliases: ['major depression', 'depressive disorder'],
    watchFor: [
      w(
        'Loss of interest in things they normally enjoy',
        'A clear shift here is one of the more reliable signals to share with the care team.',
      ),
      w(
        'Sleep changes (too much, too little, or fragmented)',
        'Sleep is closely tied to mood — patterns are worth tracking.',
      ),
      w(
        'Withdrawal from family, friends, or routines',
        'Pulling back socially can show up before they say anything is wrong.',
      ),
      w(
        'Talk of feeling like a burden or hopeless',
        'Worth raising directly with their provider — not something to wait on.',
      ),
    ],
  },
  {
    conditionId: 'anxiety',
    displayName: 'Anxiety',
    aliases: ['generalized anxiety', 'panic disorder', 'anxiety disorder'],
    watchFor: [
      w(
        'New or worsening restlessness',
        'Pacing, fidgeting, or feeling on-edge for stretches at a time is information clinicians use.',
      ),
      w(
        'Episodes of racing heart or shortness of breath',
        'Especially when not exerting — useful to track frequency and triggers.',
      ),
      w(
        'Avoiding outings or familiar places',
        'A new pattern of avoidance is worth flagging at the next visit.',
      ),
      w(
        'Sleep disrupted by worry',
        'Trouble falling asleep or middle-of-the-night waking can compound the cycle.',
      ),
    ],
  },
  {
    conditionId: 'arthritis',
    displayName: 'Arthritis',
    aliases: ['osteoarthritis', 'rheumatoid arthritis', 'joint pain'],
    watchFor: [
      w(
        'Sudden swelling or warmth in a joint',
        'Especially if it appears overnight — different from their usual pattern of pain.',
      ),
      w(
        'Stiffness lasting more than an hour after waking',
        'Long morning stiffness is information clinicians ask about.',
      ),
      w(
        'New trouble with daily tasks (buttons, jars, stairs)',
        'A practical signal that hand or knee function is shifting.',
      ),
      w(
        'Unexpected fatigue alongside joint pain',
        'Some forms of arthritis flare body-wide; worth mentioning together.',
      ),
    ],
  },
  {
    conditionId: 'parkinsons',
    displayName: "Parkinson's disease",
    aliases: ['parkinson disease', 'parkinson', "parkinson's"],
    watchFor: [
      w(
        'New trouble with balance or recent falls',
        'Even one fall is worth flagging — patterns help clinicians adjust care.',
      ),
      w(
        'Increased "off" time between medication doses',
        'Symptoms creeping back before the next dose is a common adjustment trigger.',
      ),
      w(
        'New trouble swallowing or choking on food',
        'Can affect both nutrition and medication — worth raising soon.',
      ),
      w(
        'Vivid dreams or acting out sleep',
        'Worth noting; clinicians track this alongside other symptoms.',
      ),
    ],
  },
  {
    conditionId: 'stroke_recovery',
    displayName: 'Stroke recovery',
    aliases: ['post-stroke', 'cva', 'cerebrovascular accident'],
    watchFor: [
      w(
        'Sudden weakness or numbness on one side',
        'A new one-sided change deserves immediate attention — call the care team or 911.',
      ),
      w(
        'New trouble speaking or understanding speech',
        'Even brief episodes are information; do not wait for it to "wear off."',
      ),
      w(
        'Sudden severe headache unlike their usual',
        'Especially with vision change or vomiting; treat as a same-day signal.',
      ),
      w(
        'Mood swings or unexpected tearfulness',
        'Common after a stroke and worth raising with the care team.',
      ),
    ],
  },
];

export const CUSTOM_CONDITION_FALLBACK =
  "We don't have a curated list for this condition yet. Talk to your healthcare provider about what to watch for.";

const stripPunctuation = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/**
 * Look up a watchlist by free-text condition string. Matches the displayName
 * or any documented alias, case-insensitively. Returns null when nothing
 * matches — caller should surface CUSTOM_CONDITION_FALLBACK.
 */
export function getWatchlistForCondition(input: string): ConditionWatchlist | null {
  const needle = stripPunctuation(input);
  if (!needle) return null;
  for (const list of CONDITION_WATCHLISTS) {
    if (stripPunctuation(list.displayName) === needle) return list;
    for (const alias of list.aliases) {
      if (stripPunctuation(alias) === needle) return list;
    }
  }
  return null;
}
