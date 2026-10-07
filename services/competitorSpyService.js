/**
 * Competitor Ad-Angle Spy & Re-Engineering Engine
 * 
 * Analyzes live competitor ad creatives across Meta Ad Library, TikTok Creative Center,
 * and YouTube, extracts underlying psychological angles, and clones winning hooks
 * tailored to user brands.
 */

const COMPETITOR_DATABASE = [
  {
    id: 'comp_ad_ag1_01',
    brand_name: 'Athletic Greens (AG1)',
    brand_domain: 'athleticgreens.com',
    brand_logo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=120&q=80',
    niche: 'health',
    platforms: ['Meta Ad Library', 'TikTok', 'YouTube Shorts'],
    media_type: 'VIDEO',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    days_active: 84,
    status: 'ACTIVE_SCALING',
    estimated_daily_spend: '$3,200 - $5,500/day',
    hook_text: '"Stop swallowing 12 different vitamin pills every morning..."',
    headline: 'Replace Your Medicine Cabinet with 1 Daily Scoop',
    primary_text: 'Most people waste $140/mo on synthetic pill bottles that pass right through without absorbing. Here is the 1-scoop routine backed by 75 bioavailable ingredients and 52 peer-reviewed clinical trials.',
    cta: 'Get Free 1-Year Vitamin D Supply',
    angle_category: 'CONTRARIAN',
    angle_title: 'The Anti-Pill Pill Reversal (Fatigue Elimination)',
    psychology_triggers: ['Loss Aversion', 'Cognitive Simplicity Bias', 'Authority Proof'],
    hold_rate_3s: 82.5,
    hold_rate_15s: 58.2,
    fatigue_risk: 'LOW (Scalable Evergreen)'
  },
  {
    id: 'comp_ad_ridge_02',
    brand_name: 'The Ridge Wallet',
    brand_domain: 'ridge.com',
    brand_logo: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=120&q=80',
    niche: 'ecom',
    platforms: ['Meta Ad Library', 'TikTok'],
    media_type: 'VIDEO',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    days_active: 112,
    status: 'ACTIVE_SCALING',
    estimated_daily_spend: '$4,500 - $7,000/day',
    hook_text: '"If your wallet looks like a costco receipt sandwich, watch this."',
    headline: 'The Slim RFID-Blocking Wallet Built for Life',
    primary_text: 'Bulky leather wallets ruin your posture and rip your jeans pockets. Switch to military-grade titanium designed to hold 1-12 cards without stretching. Guaranteed for life.',
    cta: 'Shop 99-Day Risk Free Trial',
    angle_category: 'US_VS_THEM',
    angle_title: 'Visual Absurdity vs Modern Minimalist',
    psychology_triggers: ['Contrast Principle', 'Humor Interruption', 'Risk Reversal Guarantee'],
    hold_rate_3s: 79.1,
    hold_rate_15s: 53.6,
    fatigue_risk: 'LOW (Evergreen Winner)'
  },
  {
    id: 'comp_ad_linear_03',
    brand_name: 'Linear App',
    brand_domain: 'linear.app',
    brand_logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    niche: 'saas',
    platforms: ['Meta Ad Library', 'YouTube'],
    media_type: 'VIDEO',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    days_active: 62,
    status: 'ACTIVE_SCALING',
    estimated_daily_spend: '$1,800 - $3,000/day',
    hook_text: '"Why high-velocity engineering teams are abandoning Jira..."',
    headline: 'Issue Tracking Built for Speed and Flow',
    primary_text: 'Traditional project managers spend 6 hours a week waiting for bloated enterprise tools to load. Linear is keyboard-first, syncs in sub-50ms, and lets your engineers write code instead of filing status updates.',
    cta: 'Start Free with Your GitHub / Google Account',
    angle_category: 'DIRTY_SECRET',
    angle_title: 'The "Enterprise Bloat" Rebel Framing',
    psychology_triggers: ['Tribal Identity (Engineers vs Bureaucrats)', 'Speed Euphoria', 'Novelty Bias'],
    hold_rate_3s: 76.8,
    hold_rate_15s: 49.0,
    fatigue_risk: 'MEDIUM (Target Audience Saturation)'
  },
  {
    id: 'comp_ad_curology_04',
    brand_name: 'Curology Skincare',
    brand_domain: 'curology.com',
    brand_logo: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=120&q=80',
    niche: 'ecom',
    platforms: ['Meta Ad Library', 'TikTok', 'Instagram Reels'],
    media_type: 'VIDEO',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
    days_active: 95,
    status: 'ACTIVE_SCALING',
    estimated_daily_spend: '$5,000 - $8,200/day',
    hook_text: '"The ordinary 10-step routine ruined my skin barrier. Here is what dermatologists actually do."',
    headline: 'Prescription Skincare Custom-Compounded for You',
    primary_text: 'Stop guessing with generic drugstore shelves. Upload 3 photos and get a medical-grade formula with prescription tretinoin and azelaic acid shipped to your door.',
    cta: 'Unlock Your $5 Trial Box Today',
    angle_category: 'BEFORE_AFTER',
    angle_title: 'The Over-Complication Backlash (Dermatologist Authority)',
    psychology_triggers: ['Social Proof', 'Authority Endorsement', 'Micro-Commitment ($5 Trial)'],
    hold_rate_3s: 85.0,
    hold_rate_15s: 62.4,
    fatigue_risk: 'LOW (Continuous UGC Angle Refreshes)'
  },
  {
    id: 'comp_ad_loom_05',
    brand_name: 'Loom Video',
    brand_domain: 'loom.com',
    brand_logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    niche: 'saas',
    platforms: ['Meta Ad Library', 'LinkedIn Ads', 'YouTube'],
    media_type: 'VIDEO',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    days_active: 48,
    status: 'ACTIVE_TESTING',
    estimated_daily_spend: '$1,500 - $2,800/day',
    hook_text: '"This 2-minute video just replaced a 45-minute Monday morning meeting."',
    headline: 'Say It with Video, Not Another Meeting',
    primary_text: 'Calenders packed with back-to-back Zoom calls? Record your screen and camera with one click, get auto-generated AI summaries, and let your team respond on their own time.',
    cta: 'Install Chrome Extension (Free)',
    angle_category: 'CONTRARIAN',
    angle_title: 'Meeting Elimination / Time Liberation',
    psychology_triggers: ['Zoom Fatigue Relief', 'Instant Gratification', 'Frictionless Extension Setup'],
    hold_rate_3s: 74.3,
    hold_rate_15s: 47.9,
    fatigue_risk: 'LOW'
  },
  {
    id: 'comp_ad_growthx_06',
    brand_name: 'GrowthScale Agency',
    brand_domain: 'growthscale.io',
    brand_logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    niche: 'agency',
    platforms: ['Meta Ad Library', 'YouTube Ads'],
    media_type: 'VIDEO',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    days_active: 56,
    status: 'ACTIVE_SCALING',
    estimated_daily_spend: '$2,200 - $3,900/day',
    hook_text: '"If you are still charging monthly retainers for media buying, your agency is about to get replaced."',
    headline: 'The Performance-Split Model That Scaled Us to $400k/mo',
    primary_text: 'Clients are tired of paying $5k/mo to agencies that test 2 creatives and blame the pixel. We automated our creative testing pipeline and switched to pure performance rev-share. Here is the SOP.',
    cta: 'Download the Agency Growth Blueprint',
    angle_category: 'FOUNDER_CONFESSION',
    angle_title: 'Industry Disruption / Agency Death Warning',
    psychology_triggers: ['Existential Threat (Loss Aversion)', 'Exclusivity', 'Direct Insider Blueprint'],
    hold_rate_3s: 81.2,
    hold_rate_15s: 55.7,
    fatigue_risk: 'MEDIUM'
  }
];

class CompetitorSpyService {
  /**
   * Search and filter competitor ads
   */
  static searchCompetitors({ query = '', niche = 'all', platform = 'all', onlyScalers = false }) {
    let filtered = [...COMPETITOR_DATABASE];

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter(ad => 
        ad.brand_name.toLowerCase().includes(q) ||
        ad.brand_domain.toLowerCase().includes(q) ||
        ad.hook_text.toLowerCase().includes(q) ||
        ad.primary_text.toLowerCase().includes(q) ||
        ad.angle_title.toLowerCase().includes(q)
      );
    }

    if (niche && niche !== 'all') {
      filtered = filtered.filter(ad => ad.niche.toLowerCase() === niche.toLowerCase());
    }

    if (platform && platform !== 'all') {
      filtered = filtered.filter(ad => 
        ad.platforms.some(p => p.toLowerCase().includes(platform.toLowerCase()))
      );
    }

    if (onlyScalers) {
      filtered = filtered.filter(ad => ad.days_active >= 30);
    }

    // Benchmark statistics
    const totalAds = filtered.length;
    const avgDaysActive = Math.round(
      filtered.reduce((sum, a) => sum + a.days_active, 0) / Math.max(1, totalAds)
    );
    const scalersCount = filtered.filter(a => a.days_active >= 30).length;

    const angleDistribution = {};
    filtered.forEach(ad => {
      angleDistribution[ad.angle_category] = (angleDistribution[ad.angle_category] || 0) + 1;
    });

    return {
      ads: filtered,
      stats: {
        totalTracked: totalAds,
        avgDaysActive,
        activeScalers: scalersCount,
        topAngle: Object.keys(angleDistribution).sort((a, b) => angleDistribution[b] - angleDistribution[a])[0] || 'CONTRARIAN',
        angleDistribution
      }
    };
  }

  /**
   * Anatomical reverse engineering of a competitor ad angle
   */
  static reverseEngineerAd(adId) {
    const ad = COMPETITOR_DATABASE.find(a => a.id === adId) || COMPETITOR_DATABASE[0];

    return {
      ad,
      anatomy: {
        hookStructure: {
          timestamp: '0:00 - 0:03',
          hookType: ad.angle_category,
          transcript: ad.hook_text,
          visualDirection: 'Rapid physical pattern interrupt (e.g., throwing away old alternatives or extreme close-up of pain symptom).',
          audioDesign: 'Abrupt silence followed by confident, unfiltered vocal delivery.',
          psychologicalTrigger: ad.psychology_triggers[0]
        },
        agitationEngine: {
          timestamp: '0:03 - 0:15',
          coreProblem: 'Highlights the hidden daily friction or waste that consumers have accepted as normal.',
          contrastMethod: 'Juxtaposes the bloated/painful old way against an effortless modern state.'
        },
        proprietaryMechanism: {
          timestamp: '0:15 - 0:30',
          mechanismName: `The ${ad.brand_name} Proprietary Advantage`,
          proofPillars: [
            'Concrete clinical or performance data citation',
            'Side-by-side split screen comparison',
            'Visual demonstration of immediate micro-transformation'
          ]
        },
        irresistibleOfferCTA: {
          timestamp: '0:30 - 0:45',
          ctaText: ad.cta,
          riskReversal: 'Low-friction entry point ($5 trial / lifetime guarantee / 99-day test drive) eliminating buyer remorse.'
        }
      },
      retentionMetrics: {
        thumbStopRatio: `${ad.hold_rate_3s}% (Top 5% of Meta Benchmarks)`,
        holdRate15s: `${ad.hold_rate_15s}% (High Sales Intent)`,
        longevityIndex: `${ad.days_active} continuous days active`,
        profitabilityVerdict: ad.days_active >= 30 
          ? '🔥 Proven Profit Driver: High ad spend maintained continuously for over a month.'
          : '⚡ Fresh Creative Test: Early engagement signals are outperforming category baseline.'
      }
    };
  }

  /**
   * Clone and adapt competitor angle to user's specific brand
   */
  static cloneAngle(adId, userBrand = {}) {
    const ad = COMPETITOR_DATABASE.find(a => a.id === adId) || COMPETITOR_DATABASE[0];

    const brandName = userBrand.brandName || 'Our Brand';
    const productType = userBrand.productType || 'Growth Solution';
    const audience = userBrand.targetAudience || 'our ideal customers';
    const valueProp = userBrand.valueProp || 'automating workflows and saving 10 hours a week';

    return {
      competitorSource: {
        brand: ad.brand_name,
        angle: ad.angle_title,
        originalHook: ad.hook_text
      },
      clonedVariations: [
        {
          id: 'clone_angle_1',
          title: `Variation 1: The Contrarian Status-Quo Callout`,
          hookCategory: 'CONTRARIAN',
          hookText: `"Stop doing ${valueProp.split(' ')[0]} the traditional way... Here is what top 1% teams do instead."`,
          primaryAdCopy: `Most ${audience} are told that getting results requires complex setups and endless manual effort.\n\nTruth is, that outdated advice is costing you time and money.\n\nWith ${brandName}, you can replace all that chaos with a streamlined system that delivers ${valueProp} in minutes.\n\n👉 Join over 2,500+ happy teams who made the switch today.`,
          headline: `Stop Wasting Time: Switch to ${brandName}`,
          cta: 'Try Risk-Free Today',
          scriptBreakdown: [
            {
              time: '0:00 - 0:03',
              action: 'HOOK',
              visual: 'Actor looks directly into lens, shakes head, pushes away traditional tools on desk.',
              audio: `"If you are still relying on old-school methods for ${productType}, you are losing money every single day."`
            },
            {
              time: '0:03 - 0:15',
              action: 'PAIN AGITATION',
              visual: 'Quick split-screen showing frustrating error states, long spreadsheets, and stress.',
              audio: `"Most people spend hours troubleshooting things that should happen on autopilot."`
            },
            {
              time: '0:15 - 0:30',
              action: 'SOLUTION / MECHANISM',
              visual: 'Smooth screen recording showing 1-click execution in the clean modern interface.',
              audio: `"That is exactly why we built ${brandName}. One dashboard, zero bloat, and ${valueProp}."`
            },
            {
              time: '0:30 - 0:45',
              action: 'OFFER & CTA',
              visual: 'Visual card showing guarantee badge and limited time onboarding perk.',
              audio: `"Tap the link below to start your trial today and experience the difference yourself."`
            }
          ]
        },
        {
          id: 'clone_angle_2',
          title: `Variation 2: The "Us vs. Them" Split Screen`,
          hookCategory: 'US_VS_THEM',
          hookText: `"Before you buy another ${productType}, watch this 30-second side-by-side test."`,
          primaryAdCopy: `Traditional ${productType} solutions:\n❌ Slow onboarding\n❌ Hidden fees & complex contracts\n❌ Requires 3 separate subscriptions\n\n${brandName}:\n✅ 2-minute setup\n✅ Unified all-in-one platform\n✅ Guaranteed results or 100% money back\n\nSee the comparison for yourself below 👇`,
          headline: `The Modern Alternative to Legacy ${productType}`,
          cta: 'See Live Comparison',
          scriptBreakdown: [
            {
              time: '0:00 - 0:03',
              action: 'HOOK',
              visual: 'Vertical split screen. Top labeled "Old Way", Bottom labeled "With ' + brandName + '".',
              audio: `"Here is why everyone in our space is dumping traditional options for this."`
            },
            {
              time: '0:03 - 0:15',
              action: 'CONTRAST',
              visual: 'Top video shows lag and confusion. Bottom shows rapid success animation.',
              audio: `"Old solutions force you into messy workarounds. We eliminated the middle steps entirely."`
            },
            {
              time: '0:15 - 0:30',
              action: 'SOCIAL PROOF',
              visual: 'Montage of 5-star customer reviews and real metrics dashboard.',
              audio: `"That is how our clients achieve ${valueProp} without hiring extra staff."`
            },
            {
              time: '0:30 - 0:45',
              action: 'CTA',
              visual: 'Finger taps mobile CTA button with animated ripple.',
              audio: `"Check out the demo right now and claim your launch bonus before it expires."`
            }
          ]
        },
        {
          id: 'clone_angle_3',
          title: `Variation 3: The Candid "I Thought This Was A Gimmick" UGC`,
          hookCategory: 'UGC_CONFESSION',
          hookText: `"I honestly thought ${brandName} was too good to be true until Day 3..."`,
          primaryAdCopy: `I was completely skeptical.\n\nEvery tool claims to offer ${valueProp}, but usually it takes weeks of onboarding just to get running.\n\nWithin 48 hours of installing ${brandName}, our entire process was transformed.\n\nIf you are on the fence, test it yourself — they have a full 30-day guarantee.`,
          headline: `Honest Review: Why We Switched to ${brandName}`,
          cta: 'Get Started Free',
          scriptBreakdown: [
            {
              time: '0:00 - 0:03',
              action: 'HOOK',
              visual: 'Authentic front-facing camera in natural lighting, holding phone with a casual grin.',
              audio: `"I’m not usually someone who posts reviews, but what happened this week blew my mind."`
            },
            {
              time: '0:03 - 0:15',
              action: 'SKEPTICISM',
              visual: 'B-roll of phone notifications popping up rapidly.',
              audio: `"I saw everyone talking about ${brandName} and assumed it was just hype."`
            },
            {
              time: '0:15 - 0:30',
              action: 'EUREKA MOMENT',
              visual: 'Screen capture showing real results graph spiking upward.',
              audio: `"Then I plugged it in, and it immediately delivered ${valueProp} without any hassle."`
            },
            {
              time: '0:30 - 0:45',
              action: 'CTA',
              visual: 'Smile to camera with link banner overlay.',
              audio: `"If you want to cut your headache in half, tap below and grab the free trial."`
            }
          ]
        }
      ]
    };
  }
}

module.exports = CompetitorSpyService;
